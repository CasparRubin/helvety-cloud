import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";

export type MilestonePlaintext = {
  version: 1;
  title: string;
  description: TaskBodyDoc;
  /** ISO date `YYYY-MM-DD`, or null when unset. */
  targetDate: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

export function parseMilestonePlaintext(raw: unknown): MilestonePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid milestone plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string") {
    throw new Error("Invalid milestone plaintext");
  }

  let description: TaskBodyDoc = EMPTY_TASK_BODY;
  if (obj.description !== undefined) {
    if (!isTaskBodyDoc(obj.description)) {
      throw new Error("Invalid milestone plaintext");
    }
    description = {
      type: "doc",
      content: obj.description.content ?? [{ type: "paragraph" }],
    };
  }

  let targetDate: string | null = null;
  if (obj.targetDate !== undefined && obj.targetDate !== null) {
    if (!isIsoDate(obj.targetDate)) {
      throw new Error("Invalid milestone targetDate");
    }
    targetDate = obj.targetDate;
  }

  return {
    version: 1,
    title: obj.title,
    description,
    targetDate,
  };
}

export function toMilestonePlaintext(
  title: string,
  description: TaskBodyDoc = EMPTY_TASK_BODY,
  targetDate: string | null = null,
): MilestonePlaintext {
  return {
    version: 1,
    title: title.trim(),
    description,
    targetDate: targetDate && isIsoDate(targetDate) ? targetDate : null,
  };
}
