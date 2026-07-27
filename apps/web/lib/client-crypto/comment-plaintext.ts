import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

export type { TaskBodyDoc };

export type CommentPlaintext = {
  version: 1;
  body: TaskBodyDoc;
};

export const EMPTY_COMMENT_BODY: TaskBodyDoc = EMPTY_TASK_BODY;

export function parseCommentPlaintext(raw: unknown): CommentPlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid comment plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Invalid comment plaintext");
  }
  if (!isTaskBodyDoc(obj.body)) {
    throw new Error("Invalid comment plaintext");
  }
  return {
    version: 1,
    body: {
      type: "doc",
      content: obj.body.content ?? [{ type: "paragraph" }],
    },
  };
}

export function toCommentPlaintext(body: TaskBodyDoc): CommentPlaintext {
  return {
    version: 1,
    body: isTaskBodyDoc(body) ? body : EMPTY_COMMENT_BODY,
  };
}
