import {
  ciphertextEnvelopeSchema,
  projectResponseSchema,
  putProjectRequestSchema,
} from "@helvety-cloud/api-contract";

import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser(_request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId } = await context.params;

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, encrypted_blob, sort_order, updated_at, deleted_at",
    )
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Project not found", 404);
  }

  return jsonOk(
    projectResponseSchema.parse({
      id: data.id,
      workspaceId: data.workspace_id,
      encryptedBlob: ciphertextEnvelopeSchema.parse(data.encrypted_blob),
      sortOrder: data.sort_order,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    }),
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putProjectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "projects",
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  const { data: row, error } = await supabase
    .from("projects")
    .upsert(
      {
        id: projectId,
        workspace_id: workspaceId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(
      "id, workspace_id, encrypted_blob, sort_order, updated_at, deleted_at",
    )
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  return jsonOk(
    projectResponseSchema.parse({
      id: row.id,
      workspaceId: row.workspace_id,
      encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }),
  );
}
