import {
  EMPTY_TASK_BODY,
  isIsoDate,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";

export type MilestonePlaintext = {
  version: 1;
  title: string;
  description: TaskBodyDoc;
  /** ISO date `YYYY-MM-DD`, or null when unset. */
  startDate: string | null;
  /** ISO date `YYYY-MM-DD`, or null when unset. */
  endDate: string | null;
};

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

  let startDate: string | null = null;
  if (obj.startDate !== undefined && obj.startDate !== null) {
    if (!isIsoDate(obj.startDate)) {
      throw new Error("Invalid milestone startDate");
    }
    startDate = obj.startDate;
  }

  let endDate: string | null = null;
  if (obj.endDate !== undefined && obj.endDate !== null) {
    if (!isIsoDate(obj.endDate)) {
      throw new Error("Invalid milestone endDate");
    }
    endDate = obj.endDate;
  }

  return {
    version: 1,
    title: obj.title,
    description,
    startDate,
    endDate,
  };
}

export function toMilestonePlaintext(
  title: string,
  description: TaskBodyDoc = EMPTY_TASK_BODY,
  startDate: string | null = null,
  endDate: string | null = null,
): MilestonePlaintext {
  return {
    version: 1,
    title: title.trim(),
    description,
    startDate: startDate && isIsoDate(startDate) ? startDate : null,
    endDate: endDate && isIsoDate(endDate) ? endDate : null,
  };
}
