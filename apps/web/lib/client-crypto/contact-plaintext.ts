import {
  isEntityColor,
  type EntityColor,
} from "@/lib/client-crypto/entity-colors";
import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

export type ContactPlaintext = {
  version: 1;
  displayName: string;
  emails: string[];
  phones: string[];
  /** TipTap JSON notes body. */
  notes: TaskBodyDoc;
  color?: EntityColor;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((t) => typeof t === "string");
}

function parseNotesField(value: unknown): TaskBodyDoc {
  if (isTaskBodyDoc(value)) {
    return {
      type: "doc",
      content: value.content ?? [{ type: "paragraph" }],
    };
  }
  throw new Error("Invalid contact plaintext");
}

export function parseContactPlaintext(raw: unknown): ContactPlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid contact plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Invalid contact plaintext");
  }
  if (typeof obj.displayName !== "string") {
    throw new Error("Invalid contact plaintext");
  }
  const emails = obj.emails === undefined ? [] : obj.emails;
  const phones = obj.phones === undefined ? [] : obj.phones;
  if (!isStringArray(emails) || !isStringArray(phones)) {
    throw new Error("Invalid contact plaintext");
  }
  const notes =
    obj.notes === undefined ? EMPTY_TASK_BODY : parseNotesField(obj.notes);
  let color: EntityColor | undefined;
  if (obj.color !== undefined) {
    if (!isEntityColor(obj.color)) {
      throw new Error("Invalid contact plaintext");
    }
    color = obj.color;
  }
  return {
    version: 1,
    displayName: obj.displayName,
    emails: emails.map((e) => e.trim()).filter(Boolean),
    phones: phones.map((p) => p.trim()).filter(Boolean),
    notes,
    ...(color ? { color } : {}),
  };
}

export function toContactPlaintext(input: {
  displayName: string;
  emails?: string[];
  phones?: string[];
  notes?: TaskBodyDoc;
  color?: EntityColor;
}): ContactPlaintext {
  const notes = input.notes ?? EMPTY_TASK_BODY;
  return {
    version: 1,
    displayName: input.displayName.trim(),
    emails: (input.emails ?? []).map((e) => e.trim()).filter(Boolean),
    phones: (input.phones ?? []).map((p) => p.trim()).filter(Boolean),
    notes,
    ...(input.color ? { color: input.color } : {}),
  };
}
