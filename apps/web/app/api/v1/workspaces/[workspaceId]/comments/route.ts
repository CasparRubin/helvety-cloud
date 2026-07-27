import {
  commentParentKindSchema,
  listCommentsResponseSchema,
  uuidSchema,
} from "@helvety-cloud/api-contract";

import {
  COMMENT_SELECT,
  toCommentResponse,
} from "@/lib/api/comments";
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
  const parentKindRaw = url.searchParams.get("parentKind");
  const parentIdRaw = url.searchParams.get("parentId");
  if (!parentKindRaw || !parentIdRaw) {
    return apiError(
      "invalid_body",
      "parentKind and parentId query params are required",
      400,
    );
  }
  const parentKindParsed = commentParentKindSchema.safeParse(parentKindRaw);
  const parentIdParsed = uuidSchema.safeParse(parentIdRaw);
  if (!parentKindParsed.success || !parentIdParsed.success) {
    return apiError("invalid_body", "invalid parentKind or parentId", 400);
  }

  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  let query = supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("parent_kind", parentKindParsed.data)
    .eq("parent_id", parentIdParsed.data)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }

  return jsonOk(
    listCommentsResponseSchema.parse({
      comments: (data ?? []).map(toCommentResponse),
    }),
  );
}
