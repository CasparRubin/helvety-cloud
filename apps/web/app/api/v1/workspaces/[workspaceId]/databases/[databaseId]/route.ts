import {
  ciphertextEnvelopeSchema,
  databaseResponseSchema,
  putDatabaseRequestSchema,
} from "@helvety-cloud/api-contract";

import { deleteLinksTouching } from "@/lib/api/entity-links";
import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; databaseId: string }>;
};

const DATABASE_SELECT =
  "id, workspace_id, encrypted_blob, sort_order, is_pinned, pin_sort_order, created_at, updated_at, deleted_at";

function toDatabaseResponse(row: {
  id: string;
  workspace_id: string;
  encrypted_blob: unknown;
  sort_order: number;
  is_pinned: boolean;
  pin_sort_order: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}) {
  return databaseResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    sortOrder: row.sort_order,
    isPinned: row.is_pinned,
    pinSortOrder: row.pin_sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser(_request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, databaseId } = await context.params;

  const { data, error } = await supabase
    .from("databases")
    .select(DATABASE_SELECT)
    .eq("id", databaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Database not found", 404);
  }

  return jsonOk(toDatabaseResponse(data));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, databaseId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putDatabaseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("databases")
    .select("workspace_id")
    .eq("id", databaseId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.workspace_id !== workspaceId) {
    return apiError(
      "conflict",
      "Database id belongs to another workspace",
      409,
    );
  }

  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "databases",
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  const { data: row, error } = await supabase
    .from("databases")
    .upsert(
      {
        id: databaseId,
        workspace_id: workspaceId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        is_pinned: data.isPinned ?? false,
        pin_sort_order:
          data.isPinned === false ? null : (data.pinSortOrder ?? null),
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(DATABASE_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  return jsonOk(toDatabaseResponse(row));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, databaseId } = await context.params;

  const { data: existing, error: existingError } = await supabase
    .from("databases")
    .select("id")
    .eq("id", databaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existingError) {
    if (existingError.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", existingError.message, 500);
  }
  if (!existing) {
    return apiError("not_found", "Database not found", 404);
  }

  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("id")
    .eq("database_id", databaseId);
  if (tablesError) {
    return apiError("internal", tablesError.message, 500);
  }

  try {
    for (const table of tables ?? []) {
      await deleteLinksTouching(supabase, workspaceId, "table", table.id);
    }
    await deleteLinksTouching(supabase, workspaceId, "database", databaseId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to delete links",
      500,
    );
  }

  const { data, error } = await supabase
    .from("databases")
    .delete()
    .eq("id", databaseId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Database not found", 404);
  }

  return new Response(null, { status: 204 });
}
