import {
  getWorkspaceBillingResponseSchema,
  subscriptionStatusSchema,
} from "@helvety-cloud/api-contract";

import { getWorkspaceUsage } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { limitsForPlan, resolvePlan } from "@/lib/billing/entitlements";
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
      "plan, status, stripe_customer_id, current_period_end, cancel_at_period_end",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (subscriptionError) {
    return apiError("internal", subscriptionError.message, 500);
  }

  const plan = resolvePlan(subscription ?? null);
  const limits = limitsForPlan(plan);
  const usage = await getWorkspaceUsage(supabase, workspaceId);

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
      limits: {
        projects: limits.projectsPerWorkspace,
        members: limits.membersPerWorkspace,
        tasks: limits.tasksPerWorkspace,
        notes: limits.notesPerWorkspace,
        contacts: limits.contactsPerWorkspace,
        storageBytes: limits.storageBytesPerWorkspace,
        maxUploadBytes: limits.maxUploadBytes,
      },
      usage,
    }),
  );
}
