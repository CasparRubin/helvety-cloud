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
  /** ISO date `YYYY-MM-DD` when the task is due, or null when unset. */
  dueDate: string | null;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

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

export function parseTaskPlaintext(raw: unknown): TaskPlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid task plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string") {
    throw new Error("Invalid task plaintext");
  }

  let dueDate: string | null = null;
  if (obj.dueDate !== undefined && obj.dueDate !== null) {
    if (!isIsoDate(obj.dueDate)) {
      throw new Error("Invalid task dueDate");
    }
    dueDate = obj.dueDate;
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
      dueDate,
    };
  }

  throw new Error("Invalid task plaintext");
}

export function toTaskPlaintext(
  title: string,
  body: TaskBodyDoc,
  dueDate: string | null = null,
): TaskPlaintext {
  return {
    version: 1,
    title: title.trim(),
    body: isTaskBodyDoc(body) ? body : EMPTY_TASK_BODY,
    dueDate: dueDate && isIsoDate(dueDate) ? dueDate : null,
  };
}

/** Flatten TipTap JSON to plain text for list previews. */
export function taskBodyPlainText(doc: TaskBodyDoc): string {
  const parts: string[] = [];

  function walk(nodes: TaskBodyNode[] | undefined) {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === "text" && typeof node.text === "string") {
        parts.push(node.text);
      }
      if (node.content) walk(node.content);
      if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "listItem" ||
        node.type === "blockquote"
      ) {
        parts.push("\n");
      }
    }
  }

  walk(doc.content);
  return parts.join("").replace(/\n+/g, " ").trim();
}
