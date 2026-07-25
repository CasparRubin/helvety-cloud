import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";
import {
  isEntityColor,
  type EntityColor,
} from "@/lib/vault/entity-colors";

export type { TaskBodyDoc };

export type NotePlaintext = {
  version: 1;
  title: string;
  body: TaskBodyDoc;
  tags: string[];
  color?: EntityColor;
};

export const EMPTY_NOTE_BODY: TaskBodyDoc = EMPTY_TASK_BODY;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((t) => typeof t === "string");
}

export function parseNotePlaintext(raw: unknown): NotePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid note plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Invalid note plaintext");
  }
  if (typeof obj.title !== "string") {
    throw new Error("Invalid note plaintext");
  }
  if (!isTaskBodyDoc(obj.body)) {
    throw new Error("Invalid note plaintext");
  }
  const tags = obj.tags === undefined ? [] : obj.tags;
  if (!isStringArray(tags)) {
    throw new Error("Invalid note plaintext");
  }
  let color: EntityColor | undefined;
  if (obj.color !== undefined) {
    if (!isEntityColor(obj.color)) {
      throw new Error("Invalid note plaintext");
    }
    color = obj.color;
  }
  return {
    version: 1,
    title: obj.title,
    body: {
      type: "doc",
      content: obj.body.content ?? [{ type: "paragraph" }],
    },
    tags: tags.map((t) => t.trim()).filter(Boolean),
    ...(color ? { color } : {}),
  };
}

export function toNotePlaintext(
  title: string,
  body: TaskBodyDoc,
  tags: string[] = [],
  color?: EntityColor,
): NotePlaintext {
  return {
    version: 1,
    title: title.trim(),
    body: isTaskBodyDoc(body) ? body : EMPTY_NOTE_BODY,
    tags: tags.map((t) => t.trim()).filter(Boolean),
    ...(color ? { color } : {}),
  };
}
