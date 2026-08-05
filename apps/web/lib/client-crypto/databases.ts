import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { DatabaseResponse } from "@helvety-cloud/api-contract";

import {
  deleteDatabase as deleteDatabaseApi,
  getDatabase,
  listDatabases,
  putDatabase,
  type ListParams,
} from "@/lib/api/v1-client";
import {
  parseDatabasePlaintext,
  toDatabasePlaintext,
  type DatabasePlaintext,
} from "@/lib/client-crypto/database-plaintext";
import {
  comparePinned,
  movePinnedItem,
  nextPinSortOrder,
} from "@/lib/client-crypto/pins";
import {
  EMPTY_TASK_BODY,
  isTaskBodyDoc,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedDatabase = {
  id: string;
  workspaceId: string;
  name: string;
  description: TaskBodyDoc | null;
  publisherPrefix?: string;
  displayName?: string;
  sortOrder: number;
  isPinned: boolean;
  pinSortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function databaseAad(databaseId: string) {
  return {
    table: "databases" as const,
    recordId: databaseId,
    field: "encrypted_blob" as const,
  };
}

async function encryptDatabaseContent(
  workspaceKey: Uint8Array,
  databaseId: string,
  content: DatabasePlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: databaseAad(databaseId),
    keyVersion,
  });
}

async function decryptDatabaseContent(
  workspaceKey: Uint8Array,
  databaseId: string,
  envelope: CiphertextEnvelope,
): Promise<DatabasePlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: databaseAad(databaseId),
  });
  return parseDatabasePlaintext(JSON.parse(textDecoder.decode(bytes)));
}

function descriptionFromPlain(
  description: unknown | null | undefined,
): TaskBodyDoc | null {
  if (description === null || description === undefined) return null;
  if (isTaskBodyDoc(description)) {
    return {
      type: "doc",
      content: description.content ?? [{ type: "paragraph" }],
    };
  }
  return null;
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: DatabaseResponse,
): Promise<DecryptedDatabase> {
  let name = "Untitled";
  let description: TaskBodyDoc | null = null;
  let publisherPrefix: string | undefined;
  let displayName: string | undefined;
  try {
    const content = await decryptDatabaseContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    name = content.name;
    description = descriptionFromPlain(content.description);
    publisherPrefix = content.publisherPrefix;
    displayName = content.displayName;
  } catch {
    name = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name,
    description,
    publisherPrefix,
    displayName,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedDatabases(
  workspaceId: string,
  workspaceKey: Uint8Array,
  params?: ListParams,
): Promise<{ databases: DecryptedDatabase[]; nextCursor: string | null }> {
  const page = await listDatabases(workspaceId, params);
  const databases = await Promise.all(
    page.databases.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { databases, nextCursor: page.nextCursor };
}

export async function loadDecryptedDatabase(
  workspaceId: string,
  databaseId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedDatabase> {
  const row = await getDatabase(workspaceId, databaseId);
  return toDecrypted(workspaceKey, row);
}

export async function createDatabase(
  workspaceId: string,
  workspaceKey: Uint8Array,
  content: {
    name: string;
    description?: TaskBodyDoc | null;
    publisherPrefix?: string;
    displayName?: string;
  },
  sortOrder = 0,
): Promise<DecryptedDatabase> {
  const databaseId = crypto.randomUUID();
  const plaintext = toDatabasePlaintext({
    name: content.name,
    description: content.description ?? EMPTY_TASK_BODY,
    publisherPrefix: content.publisherPrefix,
    displayName: content.displayName,
  });
  const encryptedBlob = await encryptDatabaseContent(
    workspaceKey,
    databaseId,
    plaintext,
  );
  const row = await putDatabase(workspaceId, databaseId, {
    encryptedBlob,
    sortOrder,
    isPinned: false,
    pinSortOrder: null,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveDatabase(
  workspaceId: string,
  workspaceKey: Uint8Array,
  database: DecryptedDatabase,
  content: {
    name: string;
    description?: TaskBodyDoc | null;
    publisherPrefix?: string;
    displayName?: string;
  },
): Promise<DecryptedDatabase> {
  const plaintext = toDatabasePlaintext({
    name: content.name,
    description: content.description ?? database.description,
    publisherPrefix:
      content.publisherPrefix !== undefined
        ? content.publisherPrefix
        : database.publisherPrefix,
    displayName:
      content.displayName !== undefined
        ? content.displayName
        : database.displayName,
  });
  const encryptedBlob = await encryptDatabaseContent(
    workspaceKey,
    database.id,
    plaintext,
  );
  const row = await putDatabase(workspaceId, database.id, {
    encryptedBlob,
    sortOrder: database.sortOrder,
    isPinned: database.isPinned,
    pinSortOrder: database.pinSortOrder,
    deletedAt: database.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteDatabase(
  workspaceId: string,
  databaseId: string,
): Promise<void> {
  await deleteDatabaseApi(workspaceId, databaseId);
}

export function sortDatabasesForDisplay(
  databases: DecryptedDatabase[],
  compare: (a: DecryptedDatabase, b: DecryptedDatabase) => number,
): DecryptedDatabase[] {
  return [...databases].sort((a, b) => {
    const pin = comparePinned(a, b);
    if (pin !== 0) return pin;
    return compare(a, b);
  });
}

export async function setDatabasePinned(
  workspaceId: string,
  workspaceKey: Uint8Array,
  database: DecryptedDatabase,
  isPinned: boolean,
  siblings: DecryptedDatabase[],
): Promise<DecryptedDatabase> {
  const pinSortOrder = isPinned
    ? nextPinSortOrder(
        siblings.filter((d) => d.isPinned && d.id !== database.id),
      )
    : null;
  const plaintext = toDatabasePlaintext({
    name: database.name,
    description: database.description,
    publisherPrefix: database.publisherPrefix,
    displayName: database.displayName,
  });
  const encryptedBlob = await encryptDatabaseContent(
    workspaceKey,
    database.id,
    plaintext,
  );
  const row = await putDatabase(workspaceId, database.id, {
    encryptedBlob,
    sortOrder: database.sortOrder,
    isPinned,
    pinSortOrder,
    deletedAt: database.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function reorderPinnedDatabases(
  workspaceId: string,
  workspaceKey: Uint8Array,
  databases: DecryptedDatabase[],
  databaseId: string,
  direction: "up" | "down",
): Promise<DecryptedDatabase[]> {
  const next = movePinnedItem(databases, databaseId, direction);
  const results: DecryptedDatabase[] = [];
  for (const database of next) {
    if (!database.isPinned) {
      results.push(database);
      continue;
    }
    const plaintext = toDatabasePlaintext({
      name: database.name,
      description: database.description,
      publisherPrefix: database.publisherPrefix,
      displayName: database.displayName,
    });
    const encryptedBlob = await encryptDatabaseContent(
      workspaceKey,
      database.id,
      plaintext,
    );
    const row = await putDatabase(workspaceId, database.id, {
      encryptedBlob,
      sortOrder: database.sortOrder,
      isPinned: database.isPinned,
      pinSortOrder: database.pinSortOrder,
      deletedAt: database.deletedAt,
    });
    results.push(await toDecrypted(workspaceKey, row));
  }
  return results;
}
