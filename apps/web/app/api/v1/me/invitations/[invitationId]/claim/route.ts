import {
  ciphertextEnvelopeSchema,
  workspaceInvitationSchema,
} from "@helvety-cloud/api-contract";

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
  const { supabase, user } = auth;
  const { invitationId } = await context.params;

  const { data: cryptoRow, error: cryptoError } = await supabase
    .from("user_crypto")
    .select("public_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cryptoError) {
    return apiError("internal", cryptoError.message, 500);
  }
  if (!cryptoRow?.public_key) {
    return apiError(
      "forbidden",
      "Set up encryption and unlock with your passkey before claiming an invitation",
      403,
    );
  }

  const { data, error } = await supabase.rpc("claim_workspace_invitation", {
    invitation_id: invitationId,
    public_key: cryptoRow.public_key,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not claimable") || message.includes("not found")) {
      return apiError("not_found", "Invitation not claimable", 404);
    }
    if (message.includes("encryption not set up")) {
      return apiError(
        "forbidden",
        "Set up encryption and unlock with your passkey before claiming an invitation",
        403,
      );
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
