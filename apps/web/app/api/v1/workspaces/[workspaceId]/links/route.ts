import {
  entityLinkEdgeSchema,
  entityLinkKindSchema,
  listEntityLinksResponseSchema,
  uuidSchema,
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
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  const url = new URL(request.url);
  const sourceKindRaw = url.searchParams.get("sourceKind");
  const sourceIdRaw = url.searchParams.get("sourceId");
  const targetKindRaw = url.searchParams.get("targetKind");
  const targetIdRaw = url.searchParams.get("targetId");

  if (!sourceKindRaw && !targetKindRaw) {
    return apiError(
      "invalid_body",
      "Provide sourceKind+sourceId and/or targetKind+targetId",
      400,
    );
  }

  let query = supabase
    .from("entity_links")
    .select(
      "id, workspace_id, source_kind, source_id, target_kind, target_id, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (sourceKindRaw !== null) {
    const kind = entityLinkKindSchema.safeParse(sourceKindRaw);
    if (!kind.success) {
      return apiError("invalid_body", "invalid sourceKind", 400);
    }
    if (!sourceIdRaw) {
      return apiError("invalid_body", "sourceId required with sourceKind", 400);
    }
    const id = uuidSchema.safeParse(sourceIdRaw);
    if (!id.success) {
      return apiError("invalid_body", "invalid sourceId", 400);
    }
    query = query.eq("source_kind", kind.data).eq("source_id", id.data);
  }

  if (targetKindRaw !== null) {
    const kind = entityLinkKindSchema.safeParse(targetKindRaw);
    if (!kind.success) {
      return apiError("invalid_body", "invalid targetKind", 400);
    }
    if (!targetIdRaw) {
      return apiError("invalid_body", "targetId required with targetKind", 400);
    }
    const id = uuidSchema.safeParse(targetIdRaw);
    if (!id.success) {
      return apiError("invalid_body", "invalid targetId", 400);
    }
    query = query.eq("target_kind", kind.data).eq("target_id", id.data);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }

  const links = (data ?? []).map((row) =>
    entityLinkEdgeSchema.parse({
      id: row.id,
      workspaceId: row.workspace_id,
      sourceKind: row.source_kind,
      sourceId: row.source_id,
      targetKind: row.target_kind,
      targetId: row.target_id,
      createdAt: row.created_at,
    }),
  );

  return jsonOk(listEntityLinksResponseSchema.parse({ links }));
}
