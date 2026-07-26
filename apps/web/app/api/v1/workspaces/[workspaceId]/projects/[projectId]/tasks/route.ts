import {
  ciphertextEnvelopeSchema,
  listTasksResponseSchema,
  taskResponseSchema,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import { listOutgoingLinksForSources } from "@/lib/api/entity-links";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  encodeSortOrderCursor,
  parseTaskListSearchParams,
} from "@/lib/api/list-cursor";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

const TASK_SELECT =
  "id, project_id, encrypted_blob, label_id, stage_id, priority_id, milestone_id, sort_order, created_at, updated_at, deleted_at";

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId } = await context.params;

  const url = new URL(request.url);
  const parsed = parseTaskListSearchParams(url);
  if (!parsed.ok) {
    return apiError("invalid_body", parsed.message, 400);
  }
  const {
    limit,
    cursor,
    includeDeleted,
    labelId,
    stageId,
    priorityId,
    milestoneId,
  } = parsed;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (projectError) {
    return apiError("internal", projectError.message, 500);
  }
  if (!project) {
    return apiError("not_found", "Project not found", 404);
  }

  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (labelId) {
    query = query.eq("label_id", labelId);
  }
  if (stageId) {
    query = query.eq("stage_id", stageId);
  }
  if (priorityId) {
    query = query.eq("priority_id", priorityId);
  }
  if (milestoneId) {
    query = query.eq("milestone_id", milestoneId);
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

  let linksByTask: Map<string, EntityLinkTarget[]>;
  try {
    linksByTask = await listOutgoingLinksForSources(
      supabase,
      workspaceId,
      "task",
      page.map((r) => r.id),
    );
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  const tasks = page.map((row) =>
    taskResponseSchema.parse({
      id: row.id,
      projectId: row.project_id,
      workspaceId,
      encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
      labelId: row.label_id,
      stageId: row.stage_id,
      priorityId: row.priority_id,
      milestoneId: row.milestone_id,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      links: linksByTask.get(row.id) ?? [],
    }),
  );

  return jsonOk(
    listTasksResponseSchema.parse({
      tasks,
      nextCursor,
    }),
  );
}
