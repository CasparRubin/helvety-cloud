import {
  EMPTY_ISSUE_BODY,
  isIssueBodyDoc,
  type IssueBodyDoc,
} from "@/lib/vault/issue-plaintext";

export type { IssueBodyDoc };

export type NotePlaintext = {
  version: 1;
  title: string;
  body: IssueBodyDoc;
  tags: string[];
};

export const EMPTY_NOTE_BODY: IssueBodyDoc = EMPTY_ISSUE_BODY;

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
  if (!isIssueBodyDoc(obj.body)) {
    throw new Error("Invalid note plaintext");
  }
  const tags = obj.tags === undefined ? [] : obj.tags;
  if (!isStringArray(tags)) {
    throw new Error("Invalid note plaintext");
  }
  return {
    version: 1,
    title: obj.title,
    body: {
      type: "doc",
      content: obj.body.content ?? [{ type: "paragraph" }],
    },
    tags: tags.map((t) => t.trim()).filter(Boolean),
  };
}

export function toNotePlaintext(
  title: string,
  body: IssueBodyDoc,
  tags: string[] = [],
): NotePlaintext {
  return {
    version: 1,
    title: title.trim(),
    body: isIssueBodyDoc(body) ? body : EMPTY_NOTE_BODY,
    tags: tags.map((t) => t.trim()).filter(Boolean),
  };
}
