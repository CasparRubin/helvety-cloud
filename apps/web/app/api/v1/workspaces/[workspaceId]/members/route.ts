import { listWorkspaceMembersResponseSchema } from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  const { data: isMember, error: memberError } = await supabase.rpc(
    "is_workspace_member",
    { ws_id: workspaceId },
  );
  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }
  if (!isMember) {
    return apiError("forbidden", "Not a workspace member", 403);
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return apiError("internal", error.message, 500);
  }

  return jsonOk(
    listWorkspaceMembersResponseSchema.parse({
      members: (data ?? []).map((row) => ({
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at,
      })),
    }),
  );
}
