import { getMeAccountResponseSchema } from "@helvety-cloud/api-contract";

import { loadAccountWorkspaceSplit } from "@/lib/api/account";
import { apiError, jsonOk } from "@/lib/api/errors";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const SHARED_OWNERSHIP_MESSAGE =
  "Transfer or delete shared workspaces you own before deleting your account";

/** Account deletion preview: what gets deleted, left, or blocks deletion. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  if (!user.email) {
    return apiError("internal", "Account has no email address", 500);
  }

  let split;
  try {
    split = await loadAccountWorkspaceSplit(supabase, user.id);
  } catch (error) {
    return apiError(
      "internal",
      error instanceof Error ? error.message : "Failed to load account",
      500,
    );
  }

  return jsonOk(
    getMeAccountResponseSchema.parse({
      email: user.email,
      userId: user.id,
      ...split,
    }),
  );
}

/**
 * Hard-delete the authenticated account: cancel Stripe subscriptions for
 * solo-owned workspaces, run delete_account (solo workspace wipe + invitation
 * FK cleanup), then delete the auth user so the remaining rows cascade.
 * Blocks with 409 while the caller owns a workspace with other members.
 */
export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  let split;
  try {
    split = await loadAccountWorkspaceSplit(supabase, user.id);
  } catch (error) {
    return apiError(
      "internal",
      error instanceof Error ? error.message : "Failed to load account",
      500,
    );
  }

  if (split.blockingWorkspaces.length > 0) {
    const names = split.blockingWorkspaces.map((w) => w.name).join(", ");
    return apiError("conflict", `${SHARED_OWNERSHIP_MESSAGE}: ${names}`, 409);
  }

  const soloOwnedIds = split.soloOwnedWorkspaces.map((w) => w.id);
  if (isStripeConfigured() && soloOwnedIds.length > 0) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("workspace_id, stripe_subscription_id")
      .in("workspace_id", soloOwnedIds);

    if (subscriptionError) {
      return apiError("internal", subscriptionError.message, 500);
    }

    const stripe = getStripe();
    for (const subscription of subscriptions ?? []) {
      if (!subscription.stripe_subscription_id) continue;
      try {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } catch (error) {
        // Never strand the account on a Stripe outage; the row is deleted next.
        console.error("Stripe cancel failed during account deletion", {
          workspaceId: subscription.workspace_id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  const { error: rpcError } = await supabase.rpc("delete_account");
  if (rpcError) {
    const message = rpcError.message.toLowerCase();
    if (message.includes("not authenticated")) {
      return apiError("unauthorized", "Not authenticated", 401);
    }
    if (message.includes("owns shared workspaces")) {
      return apiError("conflict", SHARED_OWNERSHIP_MESSAGE, 409);
    }
    return apiError("internal", rpcError.message, 500);
  }

  try {
    const { error: deleteUserError } =
      await createServiceRoleClient().auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      return apiError("internal", deleteUserError.message, 500);
    }
  } catch (error) {
    return apiError(
      "internal",
      error instanceof Error ? error.message : "Failed to delete auth user",
      500,
    );
  }

  return new Response(null, { status: 204 });
}
