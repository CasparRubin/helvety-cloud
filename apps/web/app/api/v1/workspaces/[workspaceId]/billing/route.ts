import { apiError, jsonOk } from "@/lib/api/errors";
import { buildWorkspaceBillingResponse } from "@/lib/billing/workspace-billing-response";
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

  try {
    return jsonOk(await buildWorkspaceBillingResponse(supabase, workspaceId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load billing";
    return apiError("internal", message, 500);
  }
}
