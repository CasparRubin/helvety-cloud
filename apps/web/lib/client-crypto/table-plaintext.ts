export const MAX_SAMPLE_ROWS = 10;

export type ColumnType =
  | "text"
  | "multiline"
  | "integer"
  | "decimal"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "choice"
  | "choices"
  | "lookup"
  | "email"
  | "phone"
  | "url"
  | "autonumber"
  | "file"
  | "image";

export type RequiredLevel = "none" | "recommended" | "required";

export type ChoiceOption = {
  id: string;
  label: string;
  color?: string;
};

export type ColumnDef = {
  id: string;
  schemaName: string;
  displayName: string;
  description?: string;
  type: ColumnType;
  requiredLevel: RequiredLevel;
  auditingEnabled: boolean;
  searchable: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  precision?: number;
  options?: ChoiceOption[];
  targetTableId?: string;
  format?: string;
};

export type PrimaryColumnDef = {
  schemaName: string;
  displayName: string;
  maxLength?: number;
};

export type CascadeDelete =
  | "parental"
  | "referential"
  | "restrict"
  | "removeLink";

export type OneToManyRelationship = {
  id: string;
  type: "oneToMany";
  referencingTableId: string;
  referencedTableId: string;
  lookupColumnId: string;
  cascade: CascadeDelete;
  schemaName?: string;
};

export type ManyToManyRelationship = {
  id: string;
  type: "manyToMany";
  tableAId: string;
  tableBId: string;
  schemaName: string;
  cascade?: CascadeDelete;
};

export type RelationshipDef = OneToManyRelationship | ManyToManyRelationship;

export type SampleRow = {
  id: string;
  values: Record<string, unknown>;
};

export type OwnershipType = "userOwned" | "organizationOwned";

export type TablePlaintext = {
  version: 1;
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
};

const COLUMN_TYPES = new Set<ColumnType>([
  "text",
  "multiline",
  "integer",
  "decimal",
  "currency",
  "date",
  "datetime",
  "boolean",
  "choice",
  "choices",
  "lookup",
  "email",
  "phone",
  "url",
  "autonumber",
  "file",
  "image",
]);

const REQUIRED_LEVELS = new Set<RequiredLevel>([
  "none",
  "recommended",
  "required",
]);

const CASCADE_VALUES = new Set<CascadeDelete>([
  "parental",
  "referential",
  "restrict",
  "removeLink",
]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isColumnType(value: unknown): value is ColumnType {
  return typeof value === "string" && COLUMN_TYPES.has(value as ColumnType);
}

function isRequiredLevel(value: unknown): value is RequiredLevel {
  return (
    typeof value === "string" && REQUIRED_LEVELS.has(value as RequiredLevel)
  );
}

function isCascade(value: unknown): value is CascadeDelete {
  return (
    typeof value === "string" && CASCADE_VALUES.has(value as CascadeDelete)
  );
}

function parseChoiceOption(raw: unknown): ChoiceOption | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string" || typeof obj.label !== "string") return null;
  const option: ChoiceOption = { id: obj.id, label: obj.label };
  if (typeof obj.color === "string") option.color = obj.color;
  return option;
}

function parseColumnDef(raw: unknown): ColumnDef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.id !== "string" ||
    typeof obj.schemaName !== "string" ||
    typeof obj.displayName !== "string" ||
    !isColumnType(obj.type) ||
    !isRequiredLevel(obj.requiredLevel) ||
    typeof obj.auditingEnabled !== "boolean" ||
    typeof obj.searchable !== "boolean"
  ) {
    return null;
  }

  const column: ColumnDef = {
    id: obj.id,
    schemaName: obj.schemaName,
    displayName: obj.displayName,
    type: obj.type,
    requiredLevel: obj.requiredLevel,
    auditingEnabled: obj.auditingEnabled,
    searchable: obj.searchable,
  };

  if (typeof obj.description === "string") {
    column.description = obj.description;
  }
  if (isFiniteNumber(obj.maxLength)) column.maxLength = obj.maxLength;
  if (isFiniteNumber(obj.min)) column.min = obj.min;
  if (isFiniteNumber(obj.max)) column.max = obj.max;
  if (isFiniteNumber(obj.precision)) column.precision = obj.precision;
  if (typeof obj.targetTableId === "string") {
    column.targetTableId = obj.targetTableId;
  }
  if (typeof obj.format === "string") column.format = obj.format;

  if (Array.isArray(obj.options)) {
    const options: ChoiceOption[] = [];
    for (const item of obj.options) {
      const parsed = parseChoiceOption(item);
      if (parsed) options.push(parsed);
    }
    column.options = options;
  }

  return column;
}

function parsePrimaryColumn(raw: unknown): PrimaryColumnDef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.schemaName !== "string" || typeof obj.displayName !== "string") {
    return null;
  }
  const primary: PrimaryColumnDef = {
    schemaName: obj.schemaName,
    displayName: obj.displayName,
  };
  if (isFiniteNumber(obj.maxLength)) primary.maxLength = obj.maxLength;
  return primary;
}

function parseRelationship(raw: unknown): RelationshipDef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;

  if (obj.type === "oneToMany") {
    if (
      typeof obj.referencingTableId !== "string" ||
      typeof obj.referencedTableId !== "string" ||
      typeof obj.lookupColumnId !== "string" ||
      !isCascade(obj.cascade)
    ) {
      return null;
    }
    const rel: OneToManyRelationship = {
      id: obj.id,
      type: "oneToMany",
      referencingTableId: obj.referencingTableId,
      referencedTableId: obj.referencedTableId,
      lookupColumnId: obj.lookupColumnId,
      cascade: obj.cascade,
    };
    if (typeof obj.schemaName === "string") rel.schemaName = obj.schemaName;
    return rel;
  }

  if (obj.type === "manyToMany") {
    if (
      typeof obj.tableAId !== "string" ||
      typeof obj.tableBId !== "string" ||
      typeof obj.schemaName !== "string"
    ) {
      return null;
    }
    const rel: ManyToManyRelationship = {
      id: obj.id,
      type: "manyToMany",
      tableAId: obj.tableAId,
      tableBId: obj.tableBId,
      schemaName: obj.schemaName,
    };
    if (obj.cascade !== undefined) {
      if (!isCascade(obj.cascade)) return null;
      rel.cascade = obj.cascade;
    }
    return rel;
  }

  return null;
}

function parseSampleRow(raw: unknown): SampleRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.values !== "object" || obj.values === null) return null;
  return {
    id: obj.id,
    values: { ...(obj.values as Record<string, unknown>) },
  };
}

export function parseTablePlaintext(raw: unknown): TablePlaintext {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid table plaintext");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error("Invalid table plaintext");
  }
  if (
    typeof obj.schemaName !== "string" ||
    typeof obj.displayName !== "string" ||
    typeof obj.displayNamePlural !== "string" ||
    (obj.ownershipType !== "userOwned" &&
      obj.ownershipType !== "organizationOwned") ||
    typeof obj.auditingEnabled !== "boolean" ||
    !Array.isArray(obj.columns) ||
    !Array.isArray(obj.relationships) ||
    !Array.isArray(obj.sampleRows)
  ) {
    throw new Error("Invalid table plaintext");
  }

  const primaryColumn = parsePrimaryColumn(obj.primaryColumn);
  if (!primaryColumn) {
    throw new Error("Invalid table plaintext");
  }

  const columns: ColumnDef[] = [];
  for (const item of obj.columns) {
    const parsed = parseColumnDef(item);
    if (parsed) columns.push(parsed);
  }

  const relationships: RelationshipDef[] = [];
  for (const item of obj.relationships) {
    const parsed = parseRelationship(item);
    if (parsed) relationships.push(parsed);
  }

  const sampleRows: SampleRow[] = [];
  for (const item of obj.sampleRows) {
    if (sampleRows.length >= MAX_SAMPLE_ROWS) break;
    const parsed = parseSampleRow(item);
    if (parsed) sampleRows.push(parsed);
  }

  const result: TablePlaintext = {
    version: 1,
    schemaName: obj.schemaName,
    displayName: obj.displayName,
    displayNamePlural: obj.displayNamePlural,
    ownershipType: obj.ownershipType,
    auditingEnabled: obj.auditingEnabled,
    primaryColumn,
    columns,
    relationships,
    sampleRows,
  };

  if (obj.description === null) {
    result.description = null;
  } else if (typeof obj.description === "string") {
    result.description = obj.description;
  }

  return result;
}

export function toTablePlaintext(input: {
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
}): TablePlaintext {
  const result: TablePlaintext = {
    version: 1,
    schemaName: input.schemaName.trim(),
    displayName: input.displayName.trim(),
    displayNamePlural: input.displayNamePlural.trim(),
    ownershipType: input.ownershipType,
    auditingEnabled: input.auditingEnabled,
    primaryColumn: {
      schemaName: input.primaryColumn.schemaName.trim(),
      displayName: input.primaryColumn.displayName.trim(),
      ...(isFiniteNumber(input.primaryColumn.maxLength)
        ? { maxLength: input.primaryColumn.maxLength }
        : {}),
    },
    columns: input.columns.map((c) => ({ ...c })),
    relationships: input.relationships.map((r) => ({ ...r })),
    sampleRows: input.sampleRows.slice(0, MAX_SAMPLE_ROWS).map((row) => ({
      id: row.id,
      values: { ...row.values },
    })),
  };
  if (input.description === null) {
    result.description = null;
  } else if (typeof input.description === "string") {
    result.description = input.description;
  }
  return result;
}

export function emptyTablePlaintext(
  schemaName: string,
  displayName: string,
  displayNamePlural: string,
  publisherPrefix?: string,
): TablePlaintext {
  const prefix = publisherPrefix?.trim();
  const primarySchemaName = prefix ? `${prefix}_name` : "name";
  return {
    version: 1,
    schemaName: schemaName.trim(),
    displayName: displayName.trim(),
    displayNamePlural: displayNamePlural.trim(),
    ownershipType: "userOwned",
    auditingEnabled: false,
    primaryColumn: {
      schemaName: primarySchemaName,
      displayName: "Name",
    },
    columns: [],
    relationships: [],
    sampleRows: [],
  };
}
