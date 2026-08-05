import {
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

export type DatabasePlaintext = {
  version: 1;
  name: string;
  description?: unknown | null;
  publisherPrefix?: string;
  displayName?: string;
};

export function parseDatabasePlaintext(raw: unknown): DatabasePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid database plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Invalid database plaintext");
  }
  if (typeof obj.name !== "string") {
    throw new Error("Invalid database plaintext");
  }

  const result: DatabasePlaintext = {
    version: 1,
    name: obj.name,
  };

  if (obj.description === null) {
    result.description = null;
  } else if (obj.description !== undefined) {
    if (!isTaskBodyDoc(obj.description)) {
      throw new Error("Invalid database plaintext");
    }
    result.description = {
      type: "doc",
      content: obj.description.content ?? [{ type: "paragraph" }],
    } satisfies TaskBodyDoc;
  }

  if (typeof obj.publisherPrefix === "string") {
    result.publisherPrefix = obj.publisherPrefix;
  }
  if (typeof obj.displayName === "string") {
    result.displayName = obj.displayName;
  }

  return result;
}

export function toDatabasePlaintext(input: {
  name: string;
  description?: TaskBodyDoc | null;
  publisherPrefix?: string;
  displayName?: string;
}): DatabasePlaintext {
  const result: DatabasePlaintext = {
    version: 1,
    name: input.name.trim(),
  };
  if (input.description === null) {
    result.description = null;
  } else if (input.description !== undefined) {
    result.description = isTaskBodyDoc(input.description)
      ? input.description
      : null;
  }
  if (input.publisherPrefix !== undefined) {
    const prefix = input.publisherPrefix.trim();
    if (prefix) result.publisherPrefix = prefix;
  }
  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (displayName) result.displayName = displayName;
  }
  return result;
}
