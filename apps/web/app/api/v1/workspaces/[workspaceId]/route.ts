import {
  getWorkspaceResponseSchema,
  patchWorkspaceRequestSchema,
  patchWorkspaceResponseSchema,
  sealedKeyEnvelopeSchema,
  workspaceKindSchema,
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
    .select("id, name, kind")
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
      id: workspace.id,
      name: workspace.name,
      kind: workspaceKindSchema.parse(workspace.kind),
      wrappedKey: sealedKeyEnvelopeSchema.parse(wrapped.wrapped_key),
    }),
  );
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = patchWorkspaceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from("workspaces")
    .select("id, name, kind")
    .eq("id", workspaceId)
    .maybeSingle();

  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (!existing) {
    return apiError("not_found", "Workspace not found", 404);
  }

  const { data: updated, error: updateError } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name })
    .eq("id", workspaceId)
    .select("id, name, kind")
    .maybeSingle();

  if (updateError) {
    return apiError("internal", updateError.message, 500);
  }
  if (!updated) {
    return apiError("forbidden", "Not allowed to rename workspace", 403);
  }

  return jsonOk(
    patchWorkspaceResponseSchema.parse({
      id: updated.id,
      name: updated.name,
      kind: workspaceKindSchema.parse(updated.kind),
    }),
  );
}
