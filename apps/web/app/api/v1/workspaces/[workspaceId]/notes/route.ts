import {
  ciphertextEnvelopeSchema,
  listNotesResponseSchema,
  noteResponseSchema,
  uuidSchema,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import {
  findNoteIdsLinkedToTask,
  listOutgoingLinksForSources,
} from "@/lib/api/entity-links";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  encodeSortOrderCursor,
  parseListSearchParams,
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
  const parsed = parseListSearchParams(url);
  if (!parsed.ok) {
    return apiError("invalid_body", parsed.message, 400);
  }
  const { limit, cursor, includeDeleted } = parsed;

  const projectIdRaw = url.searchParams.get("projectId");
  const taskIdRaw = url.searchParams.get("taskId");
  let projectId: string | null = null;
  let taskId: string | null = null;
  if (projectIdRaw !== null) {
    const p = uuidSchema.safeParse(projectIdRaw);
    if (!p.success) {
      return apiError("invalid_body", "invalid projectId", 400);
    }
    projectId = p.data;
  }
  if (taskIdRaw !== null) {
    const i = uuidSchema.safeParse(taskIdRaw);
    if (!i.success) {
      return apiError("invalid_body", "invalid taskId", 400);
    }
    taskId = i.data;
  }

  let noteIdFilter: string[] | null = null;
  if (taskId !== null) {
    try {
      noteIdFilter = await findNoteIdsLinkedToTask(
        supabase,
        workspaceId,
        taskId,
      );
    } catch (e) {
      return apiError(
        "internal",
        e instanceof Error ? e.message : "Failed to resolve task links",
        500,
      );
    }
    if (noteIdFilter.length === 0) {
      return jsonOk(
        listNotesResponseSchema.parse({ notes: [], nextCursor: null }),
      );
    }
  }

  let query = supabase
    .from("notes")
    .select(
      "id, workspace_id, project_id, encrypted_blob, sort_order, updated_at, deleted_at",
    )
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (projectId !== null) {
    query = query.eq("project_id", projectId);
  }
  if (noteIdFilter !== null) {
    query = query.in("id", noteIdFilter);
  }

  if (cursor) {
    query = query.or(
      `sort_order.gt.${cursor.sortOrder},and(sort_order.eq.${cursor.sortOrder},id.gt.${cursor.id})`,
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
      ? encodeSortOrderCursor({ sortOrder: last.sort_order, id: last.id })
      : null;

  let linksByNote: Map<string, EntityLinkTarget[]>;
  try {
    linksByNote = await listOutgoingLinksForSources(
      supabase,
      workspaceId,
      "note",
      page.map((r) => r.id),
    );
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  const notes = page.map((row) =>
    noteResponseSchema.parse({
      id: row.id,
      workspaceId: row.workspace_id,
      projectId: row.project_id,
      links: linksByNote.get(row.id) ?? [],
      encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }),
  );

  return jsonOk(
    listNotesResponseSchema.parse({
      notes,
      nextCursor,
    }),
  );
}
