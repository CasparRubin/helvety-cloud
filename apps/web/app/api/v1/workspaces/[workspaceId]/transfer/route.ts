import { transferWorkspaceOwnershipRequestSchema } from "@helvety-cloud/api-contract";

import { apiError } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/** Promote another member to owner; caller becomes admin and stays. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = transferWorkspaceOwnershipRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }

  const { error } = await supabase.rpc("transfer_workspace_ownership", {
    ws_id: workspaceId,
    new_owner_id: parsed.data.newOwnerId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("workspace not found")) {
      return apiError("not_found", "Workspace not found", 404);
    }
    if (message.includes("not authenticated")) {
      return apiError("unauthorized", "Not authenticated", 401);
    }
    if (message.includes("not workspace owner")) {
      return apiError("forbidden", "Only the workspace owner can transfer it", 403);
    }
    if (
      message.includes("cannot transfer personal") ||
      message.includes("invalid new owner") ||
      message.includes("new owner is not a member")
    ) {
      return apiError("conflict", error.message, 409);
    }
    return apiError("internal", error.message, 500);
  }

  return new Response(null, { status: 204 });
}
