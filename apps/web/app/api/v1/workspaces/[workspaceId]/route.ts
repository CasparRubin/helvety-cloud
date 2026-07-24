import {
  getWorkspaceResponseSchema,
  sealedKeyEnvelopeSchema,
} from "@helvety-cloud/api-contract";

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
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError) {
    return apiError("internal", workspaceError.message, 500);
  }
  if (!workspace) {
    return apiError("not_found", "Workspace not found", 404);
  }

  const { data: wrapped, error: wrapError } = await supabase
    .from("wrapped_keys")
    .select("wrapped_key")
    .eq("subject_type", "workspace")
    .eq("subject_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (wrapError) {
    return apiError("internal", wrapError.message, 500);
  }
  if (!wrapped) {
    return apiError("not_found", "Wrapped workspace key not found", 404);
  }

  return jsonOk(
    getWorkspaceResponseSchema.parse({
      id: workspaceId,
      wrappedKey: sealedKeyEnvelopeSchema.parse(wrapped.wrapped_key),
    }),
  );
}
