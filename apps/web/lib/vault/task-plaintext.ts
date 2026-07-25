/** TipTap-compatible JSON document (kept free of TipTap imports for vault/tests). */
export type TaskBodyDoc = {
  type: "doc";
  content?: TaskBodyNode[];
};

export type TaskBodyNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TaskBodyNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export type TaskPlaintext = {
  version: 1;
  title: string;
  body: TaskBodyDoc;
};

export const EMPTY_TASK_BODY: TaskBodyDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function textToTaskBody(text: string): TaskBodyDoc {
  if (!text) return EMPTY_TASK_BODY;
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export function isTaskBodyDoc(value: unknown): value is TaskBodyDoc {
  if (typeof value !== "object" || value === null) return false;
  const doc = value as { type?: unknown; content?: unknown };
  if (doc.type !== "doc") return false;
  if (doc.content !== undefined && !Array.isArray(doc.content)) return false;
  return true;
}

/**
 * Normalize decrypted JSON into TaskPlaintext v1.
 * Legacy P6b blobs: `{ title, body: string }` (no version).
 */
export function parseTaskPlaintext(raw: unknown): TaskPlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid task plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string") {
    throw new Error("Invalid task plaintext");
  }

  if (obj.version === 1) {
    if (!isTaskBodyDoc(obj.body)) {
      throw new Error("Invalid task plaintext");
    }
    return {
      version: 1,
      title: obj.title,
      body: {
        type: "doc",
        content: obj.body.content ?? [{ type: "paragraph" }],
      },
    };
  }

  // Legacy P6b: unversioned { title, body: string }
  if (obj.version === undefined && typeof obj.body === "string") {
    return {
      version: 1,
      title: obj.title,
      body: textToTaskBody(obj.body),
    };
  }

  throw new Error("Invalid task plaintext");
}

export function toTaskPlaintext(
  title: string,
  body: TaskBodyDoc,
): TaskPlaintext {
  return {
    version: 1,
    title: title.trim(),
    body: isTaskBodyDoc(body) ? body : EMPTY_TASK_BODY,
  };
}
