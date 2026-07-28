/**
 * Stamp / clear subscriptions.free_overflowed_at after entitlement transitions.
 */
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  effectiveLimits,
  resolvePlan,
} from "@/lib/billing/entitlements";

type ServiceApi = SupabaseClient<Database>;

/** Clear the tag when Pro again; set it when this free workspace is over the allowance. */
export async function syncWorkspaceFreeOverflowTag(
  service: ServiceApi,
  workspaceId: string,
): Promise<void> {
  const { data: sub } = await service
    .from("subscriptions")
    .select("plan, status, free_overflowed_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!sub) {
    return;
  }

  if (resolvePlan(sub) === "pro") {
    if (sub.free_overflowed_at) {
      await service
        .from("subscriptions")
        .update({ free_overflowed_at: null })
        .eq("workspace_id", workspaceId);
    }
    return;
  }

  if (sub.free_overflowed_at) {
    return;
  }

  const { data: workspaceRow } = await service
    .from("workspaces")
    .select("created_by")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspaceRow?.created_by) {
    return;
  }

  const { data: owned } = await service
    .from("workspaces")
    .select("id")
    .eq("created_by", workspaceRow.created_by);
  const ownedIds = (owned ?? []).map((row) => row.id);
  if (ownedIds.length === 0) {
    return;
  }

  const { data: subs } = await service
    .from("subscriptions")
    .select("workspace_id, plan, status")
    .in("workspace_id", ownedIds);

  const entitled = new Set(
    (subs ?? [])
      .filter((row) => resolvePlan(row) === "pro")
      .map((row) => row.workspace_id),
  );
  const nonProCount = ownedIds.filter((id) => !entitled.has(id)).length;
  if (nonProCount <= effectiveLimits(null).ownedWorkspaces) {
    return;
  }

  await service
    .from("subscriptions")
    .update({ free_overflowed_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId);
}
