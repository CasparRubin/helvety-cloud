import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

export type { TaskBodyDoc };

export type NotePlaintext = {
  version: 1;
  title: string;
  body: TaskBodyDoc;
};

export const EMPTY_NOTE_BODY: TaskBodyDoc = EMPTY_TASK_BODY;

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
  return {
    version: 1,
    title: obj.title,
    body: {
      type: "doc",
      content: obj.body.content ?? [{ type: "paragraph" }],
    },
  };
}

export function toNotePlaintext(
  title: string,
  body: TaskBodyDoc,
): NotePlaintext {
  return {
    version: 1,
    title: title.trim(),
    body: isTaskBodyDoc(body) ? body : EMPTY_NOTE_BODY,
  };
}
