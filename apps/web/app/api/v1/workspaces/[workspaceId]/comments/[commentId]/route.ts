import { putCommentRequestSchema } from "@helvety-cloud/api-contract";

import {
  COMMENT_SELECT,
  parentExistsInWorkspace,
  toCommentResponse,
} from "@/lib/api/comments";
import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; commentId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId, commentId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putCommentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;
  const parentCommentId = data.parentCommentId ?? null;

  const { data: existing, error: existingError } = await supabase
    .from("comments")
    .select(
      "id, workspace_id, parent_kind, parent_id, parent_comment_id, author_id",
    )
    .eq("id", commentId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.workspace_id !== workspaceId) {
    return apiError("conflict", "Comment id belongs to another workspace", 409);
  }

  if (existing) {
    if (
      existing.parent_kind !== data.parentKind ||
      existing.parent_id !== data.parentId ||
      existing.parent_comment_id !== parentCommentId
    ) {
      return apiError(
        "invalid_body",
        "Comment parent binding is immutable",
        400,
      );
    }
  } else {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "comments",
    );
    if (limitResponse) {
      return limitResponse;
    }

    const parentOk = await parentExistsInWorkspace(
      supabase,
      workspaceId,
      data.parentKind,
      data.parentId,
    );
    if (!parentOk) {
      return apiError("invalid_body", "Parent entity not found", 400);
    }

    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, parent_kind, parent_id")
        .eq("id", parentCommentId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .maybeSingle();
      if (parentError) {
        return apiError("internal", parentError.message, 500);
      }
      if (!parentComment) {
        return apiError("invalid_body", "Parent comment not found", 400);
      }
      if (
        parentComment.parent_kind !== data.parentKind ||
        parentComment.parent_id !== data.parentId
      ) {
        return apiError(
          "invalid_body",
          "Reply must share the same parent entity as its parent comment",
          400,
        );
      }
    }
  }

  const { data: row, error } = await supabase
    .from("comments")
    .upsert(
      {
        id: commentId,
        workspace_id: workspaceId,
        parent_kind: data.parentKind,
        parent_id: data.parentId,
        parent_comment_id: parentCommentId,
        author_id: existing?.author_id ?? user.id,
        encrypted_blob: data.encryptedBlob,
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    if (error.code === "P0001") {
      return apiError("invalid_body", error.message, 400);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  return jsonOk(toCommentResponse(row));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, commentId } = await context.params;

  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
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
    return apiError("not_found", "Comment not found", 404);
  }

  return new Response(null, { status: 204 });
}
