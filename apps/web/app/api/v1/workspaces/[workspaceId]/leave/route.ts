import { wipeWorkspaceAttachmentStorage } from "@/lib/api/attachment-storage";
import { apiError } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * Leave-centric membership exit:
 * - Solo member → wipe workspace (same as delete; Storage cleared after DB delete)
 * - Shared → soft-leave only (no handover)
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  // Optional empty JSON body for older clients.
  const raw = await request.text();
  if (raw.trim().length > 0) {
    try {
      JSON.parse(raw);
    } catch {
      return apiError("invalid_body", "Request body must be JSON", 400);
    }
  }

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);
  if (membersError) {
    return apiError("internal", membersError.message, 500);
  }
  if (!(members ?? []).some((m) => m.user_id === user.id)) {
    return apiError("forbidden", "Not a workspace member", 403);
  }

  const isSolo = (members ?? []).length === 1;

  const { error } = await supabase.rpc("leave_workspace", {
    ws_id: workspaceId,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("workspace not found")) {
      return apiError("not_found", "Workspace not found", 404);
    }
    if (message.includes("not authenticated")) {
      return apiError("unauthorized", "Not authenticated", 401);
    }
    if (
      message.includes("not a workspace member") ||
      message.includes("not workspace")
    ) {
      return apiError("forbidden", error.message, 403);
    }
    if (
      message.includes("cannot leave personal") ||
      message.includes("active subscription")
    ) {
      return apiError("conflict", error.message, 409);
    }
    return apiError("internal", error.message, 500);
  }

  if (isSolo) {
    await wipeWorkspaceAttachmentStorage(workspaceId);
  }

  return new Response(null, { status: 204 });
}
