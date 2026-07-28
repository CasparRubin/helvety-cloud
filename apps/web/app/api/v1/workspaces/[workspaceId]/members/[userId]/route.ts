import { apiError } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; userId: string }>;
};

/** Any member may remove another member (and their wraps). */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, userId } = await context.params;

  const { error } = await supabase.rpc("remove_workspace_member", {
    ws_id: workspaceId,
    target_user_id: userId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("member not found")) {
      return apiError("not_found", "Member not found", 404);
    }
    if (message.includes("not authenticated")) {
      return apiError("unauthorized", "Not authenticated", 401);
    }
    if (message.includes("not a workspace member")) {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    if (message.includes("use leave for self")) {
      return apiError("conflict", error.message, 409);
    }
    return apiError("internal", error.message, 500);
  }

  return new Response(null, { status: 204 });
}
