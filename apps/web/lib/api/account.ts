import {
  workspaceKindSchema,
  workspaceRoleSchema,
  type WorkspaceKind,
  type WorkspaceRole,
} from "@helvety-cloud/api-contract";
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";

type Api = SupabaseClient<Database>;

export type AccountWorkspaceSplit = {
  /** Owned but shared with other members; deletion is blocked until resolved. */
  blockingWorkspaces: { id: string; name: string }[];
  /** Owned with no other members; hard-deleted with the account. */
  soloOwnedWorkspaces: { id: string; name: string; kind: WorkspaceKind }[];
  /** Not owned; the account is only removed from these. */
  leavingWorkspaces: { id: string; name: string; role: WorkspaceRole }[];
};

const EMPTY_SPLIT: AccountWorkspaceSplit = {
  blockingWorkspaces: [],
  soloOwnedWorkspaces: [],
  leavingWorkspaces: [],
};

/** Group the caller's workspaces by what account deletion does to each one. */
export async function loadAccountWorkspaceSplit(
  supabase: Api,
  userId: string,
): Promise<AccountWorkspaceSplit> {
  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
  if (workspaceIds.length === 0) {
    return EMPTY_SPLIT;
  }

  const [workspacesResult, membersResult] = await Promise.all([
    supabase.from("workspaces").select("id, name, kind").in("id", workspaceIds),
    supabase
      .from("workspace_members")
      .select("workspace_id, user_id")
      .in("workspace_id", workspaceIds),
  ]);

  if (workspacesResult.error) {
    throw new Error(workspacesResult.error.message);
  }
  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  const workspacesById = new Map(
    (workspacesResult.data ?? []).map((w) => [w.id, w]),
  );
  const memberCounts = new Map<string, number>();
  for (const row of membersResult.data ?? []) {
    memberCounts.set(
      row.workspace_id,
      (memberCounts.get(row.workspace_id) ?? 0) + 1,
    );
  }

  const split: AccountWorkspaceSplit = {
    blockingWorkspaces: [],
    soloOwnedWorkspaces: [],
    leavingWorkspaces: [],
  };

  for (const membership of memberships ?? []) {
    const workspace = workspacesById.get(membership.workspace_id);
    if (!workspace) continue;

    if (membership.role !== "owner") {
      split.leavingWorkspaces.push({
        id: workspace.id,
        name: workspace.name,
        role: workspaceRoleSchema.parse(membership.role),
      });
      continue;
    }

    if ((memberCounts.get(workspace.id) ?? 1) > 1) {
      split.blockingWorkspaces.push({ id: workspace.id, name: workspace.name });
    } else {
      split.soloOwnedWorkspaces.push({
        id: workspace.id,
        name: workspace.name,
        kind: workspaceKindSchema.parse(workspace.kind),
      });
    }
  }

  return split;
}
