import {
  ciphertextEnvelopeSchema,
  issueResponseSchema,
  listIssuesResponseSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import {
  encodeSortOrderCursor,
  parseListSearchParams,
} from "@/lib/api/list-cursor";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId } = await context.params;

  const url = new URL(request.url);
  const parsed = parseListSearchParams(url);
  if (!parsed.ok) {
    return apiError("invalid_body", parsed.message, 400);
  }
  const { limit, cursor, includeDeleted } = parsed;

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
    .from("issues")
    .select(
      "id, project_id, encrypted_blob, sort_order, updated_at, deleted_at",
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
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

  const issues = page.map((row) =>
    issueResponseSchema.parse({
      id: row.id,
      projectId: row.project_id,
      workspaceId,
      encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }),
  );

  return jsonOk(
    listIssuesResponseSchema.parse({
      issues,
      nextCursor,
    }),
  );
}
