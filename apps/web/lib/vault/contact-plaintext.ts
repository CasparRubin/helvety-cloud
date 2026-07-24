export type ContactPlaintext = {
  version: 1;
  displayName: string;
  emails: string[];
  phones: string[];
  notes: string;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((t) => typeof t === "string");
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
  if (typeof obj.notes !== "string") {
    throw new Error("Invalid contact plaintext");
  }
  return {
    version: 1,
    displayName: obj.displayName,
    emails: emails.map((e) => e.trim()).filter(Boolean),
    phones: phones.map((p) => p.trim()).filter(Boolean),
    notes: obj.notes,
  };
}

export function toContactPlaintext(input: {
  displayName: string;
  emails?: string[];
  phones?: string[];
  notes?: string;
}): ContactPlaintext {
  return {
    version: 1,
    displayName: input.displayName.trim(),
    emails: (input.emails ?? []).map((e) => e.trim()).filter(Boolean),
    phones: (input.phones ?? []).map((p) => p.trim()).filter(Boolean),
    notes: input.notes ?? "",
  };
}
