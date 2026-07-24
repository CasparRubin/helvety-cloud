import { listMyInvitationsResponseSchema } from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { mapInvitationRow } from "@/lib/api/invitations";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    return apiError("forbidden", "Account email required for invitations", 403);
  }

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select(
      "id, workspace_id, email, invited_by, role, claimed_by, claimed_public_key, claimed_at, sealed_workspace_key, sealed_at, sealed_by, accepted_at, cancelled_at, created_at, updated_at",
    )
    .eq("email", email)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("internal", error.message, 500);
  }

  const workspaceIds = [...new Set((data ?? []).map((row) => row.workspace_id))];
  const nameById = new Map<string, string>();
  if (workspaceIds.length > 0) {
    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("id, name")
      .in("id", workspaceIds);
    if (wsError) {
      return apiError("internal", wsError.message, 500);
    }
    for (const workspace of workspaces ?? []) {
      nameById.set(workspace.id, workspace.name);
    }
  }

  return jsonOk(
    listMyInvitationsResponseSchema.parse({
      invitations: (data ?? []).map((row) =>
        mapInvitationRow(row, nameById.get(row.workspace_id)),
      ),
    }),
  );
}
