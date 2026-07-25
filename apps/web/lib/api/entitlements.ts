/**
 * Server-side entitlement gates for /api/v1 create mutations.
 * Uses the user-JWT client and plaintext counts only (never ciphertext).
 */
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
import {
  limitMessage,
  limitsForPlan,
  ownedWorkspacesLimitMessage,
  resolvePlan,
  seatLimitMessage,
  workspaceMeterLimit,
  type Plan,
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
};

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

  const [projects, notes, contacts, tasks, members, pendingInvitations] =
    await Promise.all([
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
    ]);

  return {
    projects: projects.count ?? 0,
    notes: notes.count ?? 0,
    contacts: contacts.count ?? 0,
    tasks: tasks.count ?? 0,
    members: members.count ?? 0,
    pendingInvitations: pendingInvitations.count ?? 0,
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

export async function getWorkspacePlan(
  supabase: Api,
  workspaceId: string,
): Promise<Plan> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return resolvePlan(data ?? null);
}

async function countMeter(
  supabase: Api,
  workspaceId: string,
  meter: WorkspaceMeter,
): Promise<number | null> {
  if (meter === "tasks") {
    const { count, error } = await supabase
      .from("tasks")
      .select("id, projects!inner(workspace_id)", {
        count: "exact",
        head: true,
      })
      .eq("projects.workspace_id", workspaceId)
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
 * Gate a net-new row in a workspace-scoped vault table.
 * Returns an error response to short-circuit with, or null when allowed.
 */
export async function assertWorkspaceCreateAllowed(
  supabase: Api,
  workspaceId: string,
  meter: WorkspaceMeter,
): Promise<NextResponse | null> {
  const plan = await getWorkspacePlan(supabase, workspaceId);
  const limit = workspaceMeterLimit(plan, meter);

  const current = await countMeter(supabase, workspaceId, meter);
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
 * Seat gate for inviting: accepted members + pending (uncancelled,
 * unaccepted) invitations must stay under the plan's seat cap.
 */
export async function assertInviteSeatAllowed(
  supabase: Api,
  workspaceId: string,
): Promise<NextResponse | null> {
  const plan = await getWorkspacePlan(supabase, workspaceId);
  const limit = limitsForPlan(plan).membersPerWorkspace;

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
  const seatsUsed = (membersResult.count ?? 0) + (invitesResult.count ?? 0);
  if (seatsUsed >= limit) {
    return apiError("limit_exceeded", seatLimitMessage(plan, limit), 403);
  }
  return null;
}

/**
 * Seat gate for accepting an invitation. The acceptor is not a member yet,
 * so counts come from the workspace_seat_usage RPC (members + invitees only).
 */
export async function assertAcceptSeatAllowed(
  supabase: Api,
  workspaceId: string,
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("workspace_seat_usage", {
    ws_id: workspaceId,
  });
  if (error || !data || data.length === 0) {
    // Not visible to this caller; the accept RPC enforces invite validity.
    return null;
  }
  const usage = data[0];
  const plan = resolvePlan({ plan: usage.plan, status: usage.status });
  const limit = limitsForPlan(plan).membersPerWorkspace;
  if (usage.member_count >= limit) {
    return apiError("limit_exceeded", seatLimitMessage(plan, limit), 403);
  }
  return null;
}

/**
 * Gate creating a new workspace: a user may own up to the free cap of
 * workspaces; owning at least one Pro workspace raises the cap to the Pro
 * tier (subscriptions are workspace-scoped, so there is no per-user plan).
 */
export async function assertOwnedWorkspaceAllowed(
  supabase: Api,
  userId: string,
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
  const freeLimit = limitsForPlan("free").ownedWorkspaces;
  if (ownedIds.length < freeLimit) {
    return null;
  }

  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .in("workspace_id", ownedIds);
  if (subsError) {
    return null;
  }
  const hasPro = (subs ?? []).some((sub) => resolvePlan(sub) === "pro");
  const plan: Plan = hasPro ? "pro" : "free";
  const limit = limitsForPlan(plan).ownedWorkspaces;

  if (ownedIds.length >= limit) {
    return apiError(
      "limit_exceeded",
      ownedWorkspacesLimitMessage(plan, limit),
      403,
    );
  }
  return null;
}
