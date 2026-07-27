import {
  getWorkspaceBillingResponseSchema,
  subscriptionStatusSchema,
} from "@helvety-cloud/api-contract";

import { getWorkspaceUsage, isWorkspaceFreeOverflowLocked } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  ADDON_PACKS,
  effectiveLimits,
  limitToApi,
  normalizeAddonQuantities,
  resolvePlan,
} from "@/lib/billing/entitlements";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  const { data: isMember, error: memberError } = await supabase.rpc(
    "is_workspace_member",
    { ws_id: workspaceId },
  );
  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }
  if (!isMember) {
    return apiError("forbidden", "Not a workspace member", 403);
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, stripe_customer_id, current_period_end, cancel_at_period_end, addon_quantities",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subscriptionError) {
    return apiError("internal", subscriptionError.message, 500);
  }

  const subscriptionLike = subscription
    ? {
        plan: subscription.plan,
        status: subscription.status,
        addon_quantities: normalizeAddonQuantities(
          subscription.addon_quantities,
        ),
      }
    : null;

  const plan = resolvePlan(subscriptionLike);
  const limits = effectiveLimits(subscriptionLike);
  const quantities = normalizeAddonQuantities(
    subscription?.addon_quantities ?? {},
  );
  const [usage, freeOverflowLocked] = await Promise.all([
    getWorkspaceUsage(supabase, workspaceId),
    isWorkspaceFreeOverflowLocked(supabase, workspaceId),
  ]);

  const statusParsed = subscriptionStatusSchema.safeParse(
    subscription?.status ?? "active",
  );

  return jsonOk(
    getWorkspaceBillingResponseSchema.parse({
      workspaceId,
      plan,
      status: statusParsed.success ? statusParsed.data : "active",
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      hasStripeCustomer: Boolean(subscription?.stripe_customer_id),
      freeOverflowLocked,
      limits: {
        projects: limitToApi(limits.projectsPerWorkspace),
        members: limitToApi(limits.membersPerWorkspace),
        tasks: limitToApi(limits.tasksPerProject),
        notes: limitToApi(limits.notesPerWorkspace),
        contacts: limitToApi(limits.contactsPerWorkspace),
        filesPerTask: limitToApi(limits.filesPerTask),
        storageBytes: limitToApi(limits.storageBytesPerWorkspace),
        maxUploadBytes: Number.isFinite(limits.maxUploadBytes)
          ? limits.maxUploadBytes
          : 0,
      },
      usage,
      addons: ADDON_PACKS.map((pack) => ({
        meter: pack.meter,
        quantity: quantities[pack.meter] ?? 0,
        packSize: pack.packSize,
        label: pack.label,
      })),
    }),
  );
}
