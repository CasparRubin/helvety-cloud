import type { Database } from "@helvety-cloud/db";
import {
  getWorkspaceBillingResponseSchema,
  subscriptionStatusSchema,
  type GetWorkspaceBillingResponse,
} from "@helvety-cloud/api-contract";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getWorkspaceUsage,
  isWorkspaceFreeOverflowLocked,
} from "@/lib/api/entitlements";
import {
  ADDON_PACKS,
  effectiveLimits,
  limitToApi,
  normalizeAddonQuantities,
  resolvePlan,
} from "@/lib/billing/entitlements";

type UserApi = SupabaseClient<Database>;

export async function buildWorkspaceBillingResponse(
  supabase: UserApi,
  workspaceId: string,
): Promise<GetWorkspaceBillingResponse> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, stripe_customer_id, current_period_end, cancel_at_period_end, addon_quantities",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subscriptionError) {
    throw new Error(subscriptionError.message);
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

  return getWorkspaceBillingResponseSchema.parse({
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
      comments: limitToApi(limits.commentsPerWorkspace),
      boards: limitToApi(limits.boardsPerWorkspace),
      nodesPerBoard: limitToApi(limits.nodesPerBoard),
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
  });
}
