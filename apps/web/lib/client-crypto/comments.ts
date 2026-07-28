import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type {
  CommentParentKind,
  CommentResponse,
} from "@helvety-cloud/api-contract";

import {
  deleteComment as deleteCommentApi,
  listComments,
  putComment,
} from "@/lib/api/v1-client";
import {
  EMPTY_COMMENT_BODY,
  parseCommentPlaintext,
  toCommentPlaintext,
  type CommentPlaintext,
  type TaskBodyDoc,
} from "@/lib/client-crypto/comment-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedComment = {
  id: string;
  workspaceId: string;
  parentKind: CommentParentKind;
  parentId: string;
  parentCommentId: string | null;
  authorId: string | null;
  body: TaskBodyDoc;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function commentAad(commentId: string) {
  return {
    table: "comments" as const,
    recordId: commentId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptCommentContent(
  workspaceKey: Uint8Array,
  commentId: string,
  content: CommentPlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: commentAad(commentId),
    keyVersion,
  });
}

export async function decryptCommentContent(
  workspaceKey: Uint8Array,
  commentId: string,
  envelope: CiphertextEnvelope,
): Promise<CommentPlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: commentAad(commentId),
  });
  return parseCommentPlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: CommentResponse,
): Promise<DecryptedComment> {
  let body: TaskBodyDoc = EMPTY_COMMENT_BODY;
  try {
    const content = await decryptCommentContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    body = content.body;
  } catch {
    body = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Unable to decrypt" }],
        },
      ],
    };
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    parentKind: row.parentKind,
    parentId: row.parentId,
    parentCommentId: row.parentCommentId,
    authorId: row.authorId,
    body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedComments(
  workspaceId: string,
  workspaceKey: Uint8Array,
  parentKind: CommentParentKind,
  parentId: string,
): Promise<DecryptedComment[]> {
  const page = await listComments(workspaceId, { parentKind, parentId });
  return Promise.all(
    page.comments.map((row) => toDecrypted(workspaceKey, row)),
  );
}

export async function createComment(
  workspaceId: string,
  workspaceKey: Uint8Array,
  input: {
    parentKind: CommentParentKind;
    parentId: string;
    parentCommentId?: string | null;
    body?: TaskBodyDoc;
  },
): Promise<DecryptedComment> {
  const commentId = crypto.randomUUID();
  const plaintext = toCommentPlaintext(input.body ?? EMPTY_COMMENT_BODY);
  const encryptedBlob = await encryptCommentContent(
    workspaceKey,
    commentId,
    plaintext,
  );
  const row = await putComment(workspaceId, commentId, {
    encryptedBlob,
    parentKind: input.parentKind,
    parentId: input.parentId,
    parentCommentId: input.parentCommentId ?? null,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveComment(
  workspaceId: string,
  workspaceKey: Uint8Array,
  comment: DecryptedComment,
  body: TaskBodyDoc,
): Promise<DecryptedComment> {
  const plaintext = toCommentPlaintext(body);
  const encryptedBlob = await encryptCommentContent(
    workspaceKey,
    comment.id,
    plaintext,
  );
  const row = await putComment(workspaceId, comment.id, {
    encryptedBlob,
    parentKind: comment.parentKind,
    parentId: comment.parentId,
    parentCommentId: comment.parentCommentId,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteComment(
  workspaceId: string,
  commentId: string,
): Promise<void> {
  await deleteCommentApi(workspaceId, commentId);
}
