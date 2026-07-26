import {
  ciphertextEnvelopeSchema,
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
    .select("id, encrypted_blob, kind")
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
      encryptedBlob: ciphertextEnvelopeSchema.parse(workspace.encrypted_blob),
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
    .select("id")
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
    .update({ encrypted_blob: parsed.data.encryptedBlob })
    .eq("id", workspaceId)
    .select("id, encrypted_blob, kind")
    .maybeSingle();

  if (updateError) {
    return apiError("internal", updateError.message, 500);
  }
  if (!updated) {
    return apiError("forbidden", "Not allowed to update workspace", 403);
  }

  return jsonOk(
    patchWorkspaceResponseSchema.parse({
      id: updated.id,
      encryptedBlob: ciphertextEnvelopeSchema.parse(updated.encrypted_blob),
      kind: workspaceKindSchema.parse(updated.kind),
    }),
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  const { error } = await supabase.rpc("delete_workspace", {
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
    if (message.includes("not workspace owner")) {
      return apiError("forbidden", "Only the workspace owner can delete it", 403);
    }
    if (
      message.includes("cannot delete personal") ||
      message.includes("active subscription")
    ) {
      return apiError("conflict", error.message, 409);
    }
    return apiError("internal", error.message, 500);
  }

  return new Response(null, { status: 204 });
}
