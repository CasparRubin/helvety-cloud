import { isWorkspaceOwner } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { syncWorkspaceSubscriptionFromStripe } from "@/lib/billing/stripe-subscription-sync";
import { buildWorkspaceBillingResponse } from "@/lib/billing/workspace-billing-response";
import { isStripeConfigured } from "@/lib/stripe";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/** Owner-only: reconcile `subscriptions` from Stripe after Checkout. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  if (!isStripeConfigured()) {
    return apiError("internal", "Billing is not configured", 500);
  }

  const owner = await isWorkspaceOwner(supabase, workspaceId, user.id);
  if (!owner) {
    return apiError("forbidden", "Only the workspace owner can sync billing", 403);
  }

  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }

  try {
    await syncWorkspaceSubscriptionFromStripe(
      createServiceRoleClient(),
      workspaceId,
      existing?.stripe_subscription_id ?? null,
    );
    return jsonOk(await buildWorkspaceBillingResponse(supabase, workspaceId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Billing sync failed";
    return apiError("internal", message, 500);
  }
}
