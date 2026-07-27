import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
  type TaskBodyNode,
} from "@/lib/client-crypto/task-plaintext";

export type { TaskBodyDoc };

export type CommentPlaintext = {
  version: 1;
  body: TaskBodyDoc;
};

export const EMPTY_COMMENT_BODY: TaskBodyDoc = EMPTY_TASK_BODY;

function isEmptyParagraph(node: TaskBodyNode): boolean {
  if (node.type !== "paragraph") return false;
  for (const kid of node.content ?? []) {
    if (kid.type === "text" && kid.text?.trim()) return false;
    if (kid.type !== "text" && kid.type !== "hardBreak") return false;
  }
  return true;
}

export function trimTrailingEmptyParagraphs(body: TaskBodyDoc): TaskBodyDoc {
  const content = body.content ?? [];
  let end = content.length;
  while (end > 0 && isEmptyParagraph(content[end - 1]!)) {
    end -= 1;
  }
  if (end === content.length) return body;
  if (end === 0) return EMPTY_COMMENT_BODY;
  return { type: "doc", content: content.slice(0, end) };
}

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
    body: trimTrailingEmptyParagraphs({
      type: "doc",
      content: obj.body.content ?? [{ type: "paragraph" }],
    }),
  };
}

export function toCommentPlaintext(body: TaskBodyDoc): CommentPlaintext {
  const normalized = isTaskBodyDoc(body) ? body : EMPTY_COMMENT_BODY;
  return {
    version: 1,
    body: trimTrailingEmptyParagraphs(normalized),
  };
}
