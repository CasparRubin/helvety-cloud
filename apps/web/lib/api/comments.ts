import {
  ciphertextEnvelopeSchema,
  commentParentKindSchema,
  commentResponseSchema,
  type CommentParentKind,
} from "@helvety-cloud/api-contract";
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";

type Api = SupabaseClient<Database>;

export const COMMENT_SELECT =
  "id, workspace_id, parent_kind, parent_id, parent_comment_id, author_id, encrypted_blob, created_at, updated_at, deleted_at";

export function toCommentResponse(row: {
  id: string;
  workspace_id: string;
  parent_kind: string;
  parent_id: string;
  parent_comment_id: string | null;
  author_id: string;
  encrypted_blob: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}) {
  return commentResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    parentKind: commentParentKindSchema.parse(row.parent_kind),
    parentId: row.parent_id,
    parentCommentId: row.parent_comment_id,
    authorId: row.author_id,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

export async function parentExistsInWorkspace(
  supabase: Api,
  workspaceId: string,
  parentKind: CommentParentKind,
  parentId: string,
): Promise<boolean> {
  switch (parentKind) {
    case "note": {
      const { data } = await supabase
        .from("notes")
        .select("id")
        .eq("id", parentId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .maybeSingle();
      return Boolean(data);
    }
    case "contact": {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("id", parentId)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .maybeSingle();
      return Boolean(data);
    }
    case "task": {
      const { data } = await supabase
        .from("tasks")
        .select("id, projects!inner(workspace_id)")
        .eq("id", parentId)
        .eq("projects.workspace_id", workspaceId)
        .is("deleted_at", null)
        .maybeSingle();
      return Boolean(data);
    }
    default: {
      const _exhaustive: never = parentKind;
      return _exhaustive;
    }
  }
}

/** Hard-delete all comments (and replies via ON DELETE CASCADE) for a parent entity. */
export async function deleteCommentsForParent(
  supabase: Api,
  workspaceId: string,
  parentKind: CommentParentKind,
  parentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("parent_kind", parentKind)
    .eq("parent_id", parentId);
  if (error) {
    throw new Error(error.message);
  }
}
