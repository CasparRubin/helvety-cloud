import {
  ciphertextEnvelopeSchema,
  putTableRequestSchema,
  tableResponseSchema,
} from "@helvety-cloud/api-contract";

import { deleteLinksTouching } from "@/lib/api/entity-links";
import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
    databaseId: string;
    tableId: string;
  }>;
};

const TABLE_SELECT =
  "id, database_id, encrypted_blob, sort_order, is_pinned, pin_sort_order, created_at, updated_at, deleted_at";

function toTableResponse(
  row: {
    id: string;
    database_id: string;
    encrypted_blob: unknown;
    sort_order: number;
    is_pinned: boolean;
    pin_sort_order: number | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  },
  workspaceId: string,
) {
  return tableResponseSchema.parse({
    id: row.id,
    databaseId: row.database_id,
    workspaceId,
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
  const { workspaceId, databaseId, tableId } = await context.params;

  const { data: database, error: databaseError } = await supabase
    .from("databases")
    .select("id")
    .eq("id", databaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (databaseError) {
    return apiError("internal", databaseError.message, 500);
  }
  if (!database) {
    return apiError("not_found", "Database not found", 404);
  }

  const { data, error } = await supabase
    .from("tables")
    .select(TABLE_SELECT)
    .eq("id", tableId)
    .eq("database_id", databaseId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Table not found", 404);
  }

  return jsonOk(toTableResponse(data, workspaceId));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, databaseId, tableId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putTableRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { data: database, error: databaseError } = await supabase
    .from("databases")
    .select("id")
    .eq("id", databaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (databaseError) {
    return apiError("internal", databaseError.message, 500);
  }
  if (!database) {
    return apiError("not_found", "Database not found", 404);
  }

  const { data: existing, error: existingError } = await supabase
    .from("tables")
    .select("id, database_id")
    .eq("id", tableId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.database_id !== databaseId) {
    return apiError("conflict", "Table id belongs to another database", 409);
  }
  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "tables",
      { databaseId },
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  const { data: row, error } = await supabase
    .from("tables")
    .upsert(
      {
        id: tableId,
        database_id: databaseId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        is_pinned: data.isPinned ?? false,
        pin_sort_order:
          data.isPinned === false ? null : (data.pinSortOrder ?? null),
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(TABLE_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  return jsonOk(toTableResponse(row, workspaceId));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, databaseId, tableId } = await context.params;

  const { data: database, error: databaseError } = await supabase
    .from("databases")
    .select("id")
    .eq("id", databaseId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (databaseError) {
    return apiError("internal", databaseError.message, 500);
  }
  if (!database) {
    return apiError("not_found", "Database not found", 404);
  }

  try {
    await deleteLinksTouching(supabase, workspaceId, "table", tableId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to delete links",
      500,
    );
  }

  const { data, error } = await supabase
    .from("tables")
    .delete()
    .eq("id", tableId)
    .eq("database_id", databaseId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Table not found", 404);
  }

  return new Response(null, { status: 204 });
}
