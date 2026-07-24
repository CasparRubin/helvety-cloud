import {
  sealWorkspaceInvitationRequestSchema,
  workspaceInvitationSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { mapInvitationRow } from "@/lib/api/invitations";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; invitationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, invitationId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = sealWorkspaceInvitationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }

  const { data, error } = await supabase.rpc("seal_workspace_invitation", {
    invitation_id: invitationId,
    sealed_key: parsed.data.sealedKey,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not sealable") || message.includes("not found")) {
      return apiError("not_found", "Invitation not sealable", 404);
    }
    if (message.includes("not authenticated")) {
      return apiError("unauthorized", "Not authenticated", 401);
    }
    return apiError("forbidden", error.message, 403);
  }

  if (!data || data.workspace_id !== workspaceId) {
    return apiError("not_found", "Invitation not found", 404);
  }

  return jsonOk(workspaceInvitationSchema.parse(mapInvitationRow(data)));
}
