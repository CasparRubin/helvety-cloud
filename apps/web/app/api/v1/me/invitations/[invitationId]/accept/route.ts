import {
  ciphertextEnvelopeSchema,
  workspaceInvitationSchema,
} from "@helvety-cloud/api-contract";

import { assertAcceptMemberAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { mapInvitationRow } from "@/lib/api/invitations";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { invitationId } = await context.params;

  const { data: invitation, error: invitationError } = await supabase
    .from("workspace_invitations")
    .select("workspace_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (invitationError) {
    return apiError("internal", invitationError.message, 500);
  }
  if (invitation) {
    const limitResponse = await assertAcceptMemberAllowed(
      supabase,
      invitation.workspace_id,
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    invitation_id: invitationId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not acceptable") || message.includes("not found")) {
      return apiError("not_found", "Invitation not acceptable", 404);
    }
    if (message.includes("already a member")) {
      return apiError("conflict", "Already a workspace member", 409);
    }
    if (message.includes("not authenticated")) {
      return apiError("unauthorized", "Not authenticated", 401);
    }
    return apiError("forbidden", error.message, 403);
  }

  if (!data) {
    return apiError("not_found", "Invitation not found", 404);
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, encrypted_blob")
    .eq("id", data.workspace_id)
    .maybeSingle();

  return jsonOk(
    workspaceInvitationSchema.parse(
      mapInvitationRow(
        data,
        workspace
          ? ciphertextEnvelopeSchema.parse(workspace.encrypted_blob)
          : undefined,
      ),
    ),
  );
}
