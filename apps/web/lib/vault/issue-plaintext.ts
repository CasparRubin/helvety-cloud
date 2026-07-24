/** TipTap-compatible JSON document (kept free of TipTap imports for vault/tests). */
export type IssueBodyDoc = {
  type: "doc";
  content?: IssueBodyNode[];
};

export type IssueBodyNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: IssueBodyNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export type IssuePlaintext = {
  version: 1;
  title: string;
  body: IssueBodyDoc;
};

export const EMPTY_ISSUE_BODY: IssueBodyDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function textToIssueBody(text: string): IssueBodyDoc {
  if (!text) return EMPTY_ISSUE_BODY;
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

function isIssueBodyDoc(value: unknown): value is IssueBodyDoc {
  if (typeof value !== "object" || value === null) return false;
  const doc = value as { type?: unknown; content?: unknown };
  if (doc.type !== "doc") return false;
  if (doc.content !== undefined && !Array.isArray(doc.content)) return false;
  return true;
}

/**
 * Normalize decrypted JSON into IssuePlaintext v1.
 * Legacy P6b blobs: `{ title, body: string }` (no version).
 */
export function parseIssuePlaintext(raw: unknown): IssuePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid issue plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string") {
    throw new Error("Invalid issue plaintext");
  }

  if (obj.version === 1) {
    if (!isIssueBodyDoc(obj.body)) {
      throw new Error("Invalid issue plaintext");
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
      body: textToIssueBody(obj.body),
    };
  }

  throw new Error("Invalid issue plaintext");
}

export function toIssuePlaintext(
  title: string,
  body: IssueBodyDoc,
): IssuePlaintext {
  return {
    version: 1,
    title: title.trim(),
    body: isIssueBodyDoc(body) ? body : EMPTY_ISSUE_BODY,
  };
}
