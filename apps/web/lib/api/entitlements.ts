/**
 * Server-side entitlement gates for /api/v1 create mutations.
 * Uses the user-JWT client and plaintext counts only (never ciphertext).
 */
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import {
  effectiveLimits,
  freeOverflowLockMessage,
  isUnlimited,
  limitMessage,
  maxUploadLimitMessage,
  normalizeAddonQuantities,
  ownedWorkspacesLimitMessage,
  resolvePlan,
  memberLimitMessage,
  selectFreeOverflowLockedIds,
  storageLimitMessage,
  workspaceMeterLimit,
  type SubscriptionLike,
  type WorkspaceMeter,
} from "@/lib/billing/entitlements";

type Api = SupabaseClient<Database>;

export type WorkspaceUsageCounts = {
  projects: number;
  members: number;
  pendingInvitations: number;
  tasks: number;
  notes: number;
  contacts: number;
  storageBytes: number;
};

function subscriptionLikeFromRow(
  row: {
    plan: string;
    status: string;
    billing_source?: string | null;
    unmetered?: boolean | null;
    addon_quantities?: unknown;
  } | null,
): SubscriptionLike {
  if (!row) return null;
  return {
    plan: row.plan,
    status: row.status,
    billing_source: row.billing_source,
    unmetered: row.unmetered,
    addon_quantities: normalizeAddonQuantities(row.addon_quantities),
  };
}

/**
 * Soft-lock: lock overflow non-Pro owned workspaces (newest free_overflowed_at first).
 */
export async function isWorkspaceFreeOverflowLocked(
  supabase: Api,
  workspaceId: string,
): Promise<boolean> {
  const subscription = await getWorkspaceSubscription(supabase, workspaceId);
  if (resolvePlan(subscription) === "pro") {
    return false;
  }

  const { data: ownerRow, error: ownerError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .maybeSingle();
  if (ownerError || !ownerRow) {
    return false;
  }

  const { data: owned, error: ownedError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", ownerRow.user_id)
    .eq("role", "owner");
  if (ownedError || !owned?.length) {
    return false;
  }

  const ownedIds = owned.map((row) => row.workspace_id);
  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select(
      "workspace_id, plan, status, billing_source, unmetered, free_overflowed_at",
    )
    .in("workspace_id", ownedIds);
  if (subsError) {
    return false;
  }

  const subByWorkspace = new Map(
    (subs ?? []).map((row) => [row.workspace_id, row]),
  );
  const nonProOwned = ownedIds
    .filter((id) => resolvePlan(subscriptionLikeFromRow(subByWorkspace.get(id) ?? null)) !== "pro")
    .map((id) => ({
      workspaceId: id,
      freeOverflowedAt: subByWorkspace.get(id)?.free_overflowed_at ?? null,
    }));

  return selectFreeOverflowLockedIds(
    nonProOwned,
    effectiveLimits(null).ownedWorkspaces,
  ).has(workspaceId);
}

async function assertNotFreeOverflowLocked(
  supabase: Api,
  workspaceId: string,
): Promise<NextResponse | null> {
  if (!(await isWorkspaceFreeOverflowLocked(supabase, workspaceId))) {
    return null;
  }
  return apiError(
    "limit_exceeded",
    freeOverflowLockMessage(effectiveLimits(null).ownedWorkspaces),
    403,
  );
}

/**
 * Plaintext usage counts for the billing endpoint. Pending invitations are
 * only visible to owners/admins (RLS), so members see 0 there.
 */
export async function getWorkspaceUsage(
  supabase: Api,
  workspaceId: string,
): Promise<WorkspaceUsageCounts> {
  const countRows = (meter: "projects" | "notes" | "contacts") =>
    supabase
      .from(meter)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);

  const [
    projects,
    notes,
    contacts,
    tasks,
    members,
    pendingInvitations,
    storageRows,
  ] = await Promise.all([
    countRows("projects"),
    countRows("notes"),
    countRows("contacts"),
    supabase
      .from("tasks")
      .select("id, projects!inner(workspace_id)", {
        count: "exact",
        head: true,
      })
      .eq("projects.workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("cancelled_at", null)
      .is("accepted_at", null),
    supabase
      .from("attachments")
      .select("byte_size, status")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .in("status", ["ready", "pending"]),
  ]);

  const storageBytes = (storageRows.data ?? []).reduce(
    (sum, row) => sum + (row.byte_size ?? 0),
    0,
  );

  return {
    projects: projects.count ?? 0,
    notes: notes.count ?? 0,
    contacts: contacts.count ?? 0,
    tasks: tasks.count ?? 0,
    members: members.count ?? 0,
    pendingInvitations: pendingInvitations.count ?? 0,
    storageBytes,
  };
}

/** True when the caller holds the `owner` role in the workspace. */
export async function isWorkspaceOwner(
  supabase: Api,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "owner";
}

export async function getWorkspaceSubscription(
  supabase: Api,
  workspaceId: string,
): Promise<SubscriptionLike> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, billing_source, unmetered, addon_quantities")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return subscriptionLikeFromRow(data);
}

async function countMeter(
  supabase: Api,
  workspaceId: string,
  meter: WorkspaceMeter,
  projectId?: string,
): Promise<number | null> {
  if (meter === "tasks") {
    if (!projectId) {
      return null;
    }
    const { count, error } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null);
    return error ? null : (count ?? 0);
  }

  const { count, error } = await supabase
    .from(meter)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null);
  return error ? null : (count ?? 0);
}

/**
 * Gate a net-new row in a workspace-scoped encrypted entity table.
 * For tasks, pass projectId; limits are per project.
 * Returns an error response to short-circuit with, or null when allowed.
 */
export async function assertWorkspaceCreateAllowed(
  supabase: Api,
  workspaceId: string,
  meter: WorkspaceMeter,
  options?: { projectId?: string },
): Promise<NextResponse | null> {
  const overflow = await assertNotFreeOverflowLocked(supabase, workspaceId);
  if (overflow) {
    return overflow;
  }

  const subscription = await getWorkspaceSubscription(supabase, workspaceId);
  const plan = resolvePlan(subscription);
  const limit = workspaceMeterLimit(subscription, meter);

  if (isUnlimited(limit)) {
    return null;
  }

  const current = await countMeter(
    supabase,
    workspaceId,
    meter,
    options?.projectId,
  );
  if (current === null) {
    // Count failed (e.g. RLS): let the write itself surface the real error.
    return null;
  }
  if (current >= limit) {
    return apiError("limit_exceeded", limitMessage(plan, meter, limit), 403);
  }
  return null;
}

/**
 * Member gate for inviting: accepted members + pending (uncancelled,
 * unaccepted) invitations must stay under the plan's member cap.
 */
export async function assertInviteMemberAllowed(
  supabase: Api,
  workspaceId: string,
): Promise<NextResponse | null> {
  const overflow = await assertNotFreeOverflowLocked(supabase, workspaceId);
  if (overflow) {
    return overflow;
  }

  const subscription = await getWorkspaceSubscription(supabase, workspaceId);
  const plan = resolvePlan(subscription);
  const limit = effectiveLimits(subscription).membersPerWorkspace;
  if (isUnlimited(limit)) {
    return null;
  }

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_invitations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("cancelled_at", null)
      .is("accepted_at", null),
  ]);

  if (membersResult.error || invitesResult.error) {
    return null;
  }
  const membersUsed = (membersResult.count ?? 0) + (invitesResult.count ?? 0);
  if (membersUsed >= limit) {
    return apiError("limit_exceeded", memberLimitMessage(plan, limit), 403);
  }
  return null;
}

/**
 * Member gate for accepting an invitation. The acceptor is not a member yet,
 * so counts come from the workspace_seat_usage RPC (members + invitees only).
 */
export async function assertAcceptMemberAllowed(
  supabase: Api,
  workspaceId: string,
): Promise<NextResponse | null> {
  const overflow = await assertNotFreeOverflowLocked(supabase, workspaceId);
  if (overflow) {
    return overflow;
  }

  const { data, error } = await supabase.rpc("workspace_seat_usage", {
    ws_id: workspaceId,
  });
  if (error || !data || data.length === 0) {
    // Not visible to this caller; the accept RPC enforces invite validity.
    return null;
  }
  const usage = data[0];
  const subscription = subscriptionLikeFromRow({
    plan: usage.plan,
    status: usage.status,
    billing_source: usage.billing_source,
    unmetered: usage.unmetered,
    addon_quantities: usage.addon_quantities,
  });
  const plan = resolvePlan(subscription);
  const limit = effectiveLimits(subscription).membersPerWorkspace;
  if (isUnlimited(limit)) {
    return null;
  }
  if (usage.member_count >= limit) {
    return apiError("limit_exceeded", memberLimitMessage(plan, limit), 403);
  }
  return null;
}

/**
 * Gate a file upload: free workspaces get 0 bytes (no uploads);
 * Pro workspaces must stay under storage + per-file caps.
 */
export async function assertWorkspaceStorageAllowed(
  supabase: Api,
  workspaceId: string,
  incomingBytes: number,
): Promise<NextResponse | null> {
  if (!Number.isFinite(incomingBytes) || incomingBytes < 0) {
    return apiError("invalid_body", "byteSize must be a non-negative number", 400);
  }

  const overflow = await assertNotFreeOverflowLocked(supabase, workspaceId);
  if (overflow) {
    return overflow;
  }

  const subscription = await getWorkspaceSubscription(supabase, workspaceId);
  const plan = resolvePlan(subscription);
  const limits = effectiveLimits(subscription);

  if (limits.maxUploadBytes <= 0 || limits.storageBytesPerWorkspace <= 0) {
    return apiError(
      "limit_exceeded",
      storageLimitMessage(plan, limits.storageBytesPerWorkspace),
      403,
    );
  }

  if (
    !isUnlimited(limits.maxUploadBytes) &&
    incomingBytes > limits.maxUploadBytes
  ) {
    return apiError(
      "limit_exceeded",
      maxUploadLimitMessage(plan, limits.maxUploadBytes),
      403,
    );
  }

  if (isUnlimited(limits.storageBytesPerWorkspace)) {
    return null;
  }

  const { data: rows, error } = await supabase
    .from("attachments")
    .select("byte_size")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .in("status", ["ready", "pending"]);
  if (error) {
    return null;
  }
  const used = (rows ?? []).reduce((sum, row) => sum + (row.byte_size ?? 0), 0);
  if (used + incomingBytes > limits.storageBytesPerWorkspace) {
    return apiError(
      "limit_exceeded",
      storageLimitMessage(plan, limits.storageBytesPerWorkspace),
      403,
    );
  }
  return null;
}

/**
 * Gate creating a new workspace.
 * Free: up to PLAN_LIMITS.free.ownedWorkspaces non-Pro owned workspaces.
 * Beyond that: only allowed when creating as Pro (checkout/comp) and there is
 * at most one unpaid overflow workspace already.
 */
export async function assertOwnedWorkspaceAllowed(
  supabase: Api,
  userId: string,
  options?: { asPro?: boolean },
): Promise<NextResponse | null> {
  const { data: owned, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("role", "owner");
  if (error) {
    return null;
  }

  const ownedIds = (owned ?? []).map((row) => row.workspace_id);
  const freeSlots = effectiveLimits(null).ownedWorkspaces;
  if (ownedIds.length === 0) {
    return null;
  }

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select(
      "workspace_id, plan, status, billing_source, unmetered, addon_quantities",
    )
    .in("workspace_id", ownedIds);
  if (subsError) {
    return null;
  }

  const entitled = new Set(
    (subs ?? [])
      .filter((sub) => resolvePlan(subscriptionLikeFromRow(sub)) === "pro")
      .map((sub) => sub.workspace_id),
  );
  const nonProCount = ownedIds.filter((id) => !entitled.has(id)).length;
  const overflow = Math.max(0, nonProCount - freeSlots);

  if (!options?.asPro) {
    if (nonProCount >= freeSlots) {
      return apiError(
        "limit_exceeded",
        ownedWorkspacesLimitMessage("free", freeSlots),
        403,
      );
    }
    return null;
  }

  if (overflow >= 1) {
    return apiError(
      "limit_exceeded",
      "Complete Pro checkout (or redeem a complimentary code) on your pending workspace before creating another.",
      403,
    );
  }

  const proCeiling = effectiveLimits({
    plan: "pro",
    status: "active",
  }).ownedWorkspaces;
  if (!isUnlimited(proCeiling) && ownedIds.length >= proCeiling) {
    return apiError(
      "limit_exceeded",
      ownedWorkspacesLimitMessage("pro", proCeiling),
      403,
    );
  }
  return null;
}
