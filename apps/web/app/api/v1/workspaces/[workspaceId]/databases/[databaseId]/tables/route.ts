import {
  ciphertextEnvelopeSchema,
  listTablesResponseSchema,
  tableResponseSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import {
  encodeCreatedAtCursor,
  parseNotesListSearchParams,
} from "@/lib/api/list-cursor";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; databaseId: string }>;
};

const TABLE_SELECT =
  "id, database_id, encrypted_blob, sort_order, is_pinned, pin_sort_order, created_at, updated_at, deleted_at";

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, databaseId } = await context.params;

  const url = new URL(request.url);
  const parsed = parseNotesListSearchParams(url);
  if (!parsed.ok) {
    return apiError("invalid_body", parsed.message, 400);
  }
  const { limit, cursor, includeDeleted } = parsed;

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

  let query = supabase
    .from("tables")
    .select(TABLE_SELECT)
    .eq("database_id", databaseId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (cursor) {
    const createdAt = `"${cursor.createdAt}"`;
    query = query.or(
      `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCreatedAtCursor({ createdAt: last.created_at, id: last.id })
      : null;

  const tables = page.map((row) =>
    tableResponseSchema.parse({
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
    }),
  );

  return jsonOk(
    listTablesResponseSchema.parse({
      tables,
      nextCursor,
    }),
  );
}
