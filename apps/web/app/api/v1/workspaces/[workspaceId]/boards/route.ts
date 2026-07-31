import {
  ciphertextEnvelopeSchema,
  listBoardsResponseSchema,
  boardResponseSchema,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import { listOutgoingLinksForSources } from "@/lib/api/entity-links";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  encodeCreatedAtCursor,
  parseNotesListSearchParams,
} from "@/lib/api/list-cursor";
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

  const url = new URL(request.url);
  const parsed = parseNotesListSearchParams(url);
  if (!parsed.ok) {
    return apiError("invalid_body", parsed.message, 400);
  }
  const { limit, cursor, includeDeleted } = parsed;

  let query = supabase
    .from("boards")
    .select(
      "id, workspace_id, encrypted_blob, sort_order, is_pinned, pin_sort_order, created_at, updated_at, deleted_at",
    )
    .eq("workspace_id", workspaceId)
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

  let linksByBoard: Map<string, EntityLinkTarget[]>;
  try {
    linksByBoard = await listOutgoingLinksForSources(
      supabase,
      workspaceId,
      "board",
      page.map((r) => r.id),
    );
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  const boards = page.map((row) =>
    boardResponseSchema.parse({
      id: row.id,
      workspaceId: row.workspace_id,
      links: linksByBoard.get(row.id) ?? [],
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
    listBoardsResponseSchema.parse({
      boards,
      nextCursor,
    }),
  );
}
