import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { TableResponse } from "@helvety-cloud/api-contract";

import {
  deleteTable as deleteTableApi,
  getTable,
  listTables,
  putTable,
  type ListParams,
} from "@/lib/api/v1-client";
import {
  emptyTablePlaintext,
  parseTablePlaintext,
  toTablePlaintext,
  type ColumnDef,
  type OwnershipType,
  type PrimaryColumnDef,
  type RelationshipDef,
  type SampleRow,
  type TablePlaintext,
} from "@/lib/client-crypto/table-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedTable = {
  id: string;
  databaseId: string;
  workspaceId: string;
  schemaName: string;
  displayName: string;
  displayNamePlural: string;
  description: string | null;
  ownershipType: OwnershipType;
  auditingEnabled: boolean;
  primaryColumn: PrimaryColumnDef;
  columns: ColumnDef[];
  relationships: RelationshipDef[];
  sampleRows: SampleRow[];
  sortOrder: number;
  isPinned: boolean;
  pinSortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function tableAad(tableId: string) {
  return {
    table: "tables" as const,
    recordId: tableId,
    field: "encrypted_blob" as const,
  };
}

async function encryptTableContent(
  workspaceKey: Uint8Array,
  tableId: string,
  content: TablePlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: tableAad(tableId),
    keyVersion,
  });
}

async function decryptTableContent(
  workspaceKey: Uint8Array,
  tableId: string,
  envelope: CiphertextEnvelope,
): Promise<TablePlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: tableAad(tableId),
  });
  return parseTablePlaintext(JSON.parse(textDecoder.decode(bytes)));
}

function fallbackPrimary(): PrimaryColumnDef {
  return { schemaName: "name", displayName: "Name" };
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: TableResponse,
): Promise<DecryptedTable> {
  let schemaName = "untitled";
  let displayName = "Untitled";
  let displayNamePlural = "Untitled";
  let description: string | null = null;
  let ownershipType: OwnershipType = "userOwned";
  let auditingEnabled = false;
  let primaryColumn = fallbackPrimary();
  let columns: ColumnDef[] = [];
  let relationships: RelationshipDef[] = [];
  let sampleRows: SampleRow[] = [];
  try {
    const content = await decryptTableContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    schemaName = content.schemaName;
    displayName = content.displayName;
    displayNamePlural = content.displayNamePlural;
    description = content.description ?? null;
    ownershipType = content.ownershipType;
    auditingEnabled = content.auditingEnabled;
    primaryColumn = content.primaryColumn;
    columns = content.columns;
    relationships = content.relationships;
    sampleRows = content.sampleRows;
  } catch {
    displayName = "Unable to decrypt";
    displayNamePlural = "Unable to decrypt";
  }
  return {
    id: row.id,
    databaseId: row.databaseId,
    workspaceId: row.workspaceId,
    schemaName,
    displayName,
    displayNamePlural,
    description,
    ownershipType,
    auditingEnabled,
    primaryColumn,
    columns,
    relationships,
    sampleRows,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedTables(
  workspaceId: string,
  databaseId: string,
  workspaceKey: Uint8Array,
  params?: ListParams,
): Promise<{ tables: DecryptedTable[]; nextCursor: string | null }> {
  const page = await listTables(workspaceId, databaseId, params);
  const tables = await Promise.all(
    page.tables.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { tables, nextCursor: page.nextCursor };
}

export async function loadDecryptedTable(
  workspaceId: string,
  databaseId: string,
  tableId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedTable> {
  const row = await getTable(workspaceId, databaseId, tableId);
  return toDecrypted(workspaceKey, row);
}

export async function createTable(
  workspaceId: string,
  databaseId: string,
  workspaceKey: Uint8Array,
  content: {
    schemaName: string;
    displayName: string;
    displayNamePlural: string;
    publisherPrefix?: string;
  },
  sortOrder = 0,
): Promise<DecryptedTable> {
  const tableId = crypto.randomUUID();
  const plaintext = emptyTablePlaintext(
    content.schemaName,
    content.displayName,
    content.displayNamePlural,
    content.publisherPrefix,
  );
  const encryptedBlob = await encryptTableContent(
    workspaceKey,
    tableId,
    plaintext,
  );
  const row = await putTable(workspaceId, databaseId, tableId, {
    encryptedBlob,
    sortOrder,
    isPinned: false,
    pinSortOrder: null,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveTable(
  workspaceId: string,
  workspaceKey: Uint8Array,
  table: DecryptedTable,
  content: {
    schemaName: string;
    displayName: string;
    displayNamePlural: string;
    description?: string | null;
    ownershipType: OwnershipType;
    auditingEnabled: boolean;
    primaryColumn: PrimaryColumnDef;
    columns: ColumnDef[];
    relationships: RelationshipDef[];
    sampleRows: SampleRow[];
  },
): Promise<DecryptedTable> {
  const plaintext = toTablePlaintext(content);
  const encryptedBlob = await encryptTableContent(
    workspaceKey,
    table.id,
    plaintext,
  );
  const row = await putTable(workspaceId, table.databaseId, table.id, {
    encryptedBlob,
    sortOrder: table.sortOrder,
    isPinned: table.isPinned,
    pinSortOrder: table.pinSortOrder,
    deletedAt: table.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteTable(
  workspaceId: string,
  databaseId: string,
  tableId: string,
): Promise<void> {
  await deleteTableApi(workspaceId, databaseId, tableId);
}
