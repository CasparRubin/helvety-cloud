"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import {
  EntityDetailLayout,
  EntityDetailShell,
} from "@/components/app/entity-detail-shell";
import { EntityTimestampsCard } from "@/components/app/entity-timestamps-card";
import { PageDangerActions } from "@/components/app/page-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { cn } from "@/lib/utils";
import {
  deleteTable,
  loadDecryptedTable,
  loadDecryptedTables,
  saveTable,
  type DecryptedTable,
} from "@/lib/client-crypto/tables";
import {
  MAX_SAMPLE_ROWS,
  type CascadeDelete,
  type ColumnDef,
  type ColumnType,
  type ManyToManyRelationship,
  type OwnershipType,
  type PrimaryColumnDef,
  type RequiredLevel,
  type SampleRow,
} from "@/lib/client-crypto/table-plaintext";

type TableDetailProps = {
  workspaceId: string;
  databaseId: string;
  tableId: string;
};

type TableDraft = {
  schemaName: string;
  displayName: string;
  displayNamePlural: string;
  description: string;
  ownershipType: OwnershipType;
  auditingEnabled: boolean;
  primaryColumn: PrimaryColumnDef;
  columns: ColumnDef[];
  manyToMany: ManyToManyRelationship[];
  sampleRows: SampleRow[];
};

const COLUMN_TYPES: ColumnType[] = [
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
];

const REQUIRED_LEVELS: RequiredLevel[] = ["none", "recommended", "required"];

const CASCADE_OPTIONS: CascadeDelete[] = [
  "parental",
  "referential",
  "restrict",
  "removeLink",
];

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function manyToManyOnly(
  relationships: DecryptedTable["relationships"],
): ManyToManyRelationship[] {
  return relationships.filter(
    (r): r is ManyToManyRelationship => r.type === "manyToMany",
  );
}

function buildRelationships(
  tableId: string,
  columns: ColumnDef[],
  manyToMany: ManyToManyRelationship[],
): DecryptedTable["relationships"] {
  const derived = columns
    .filter((c) => c.type === "lookup" && c.targetTableId)
    .map((c) => ({
      id: `otm-${c.id}`,
      type: "oneToMany" as const,
      referencingTableId: tableId,
      referencedTableId: c.targetTableId!,
      lookupColumnId: c.id,
      cascade: "restrict" as const,
      schemaName: c.schemaName,
    }));
  return [...derived, ...manyToMany];
}

export function TableDetail({
  workspaceId,
  databaseId,
  tableId,
}: TableDetailProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const cache = useEntityCache();
  const { upsertTable } = cache;

  const [table, setTable] = useState<DecryptedTable | null>(null);
  const [siblingTables, setSiblingTables] = useState<DecryptedTable[]>([]);
  const [schemaName, setSchemaName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayNamePlural, setDisplayNamePlural] = useState("");
  const [description, setDescription] = useState("");
  const [ownershipType, setOwnershipType] =
    useState<OwnershipType>("userOwned");
  const [auditingEnabled, setAuditingEnabled] = useState(false);
  const [primaryColumn, setPrimaryColumn] = useState<PrimaryColumnDef>({
    schemaName: "name",
    displayName: "Name",
  });
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [manyToMany, setManyToMany] = useState<ManyToManyRelationship[]>([]);
  const [sampleRows, setSampleRows] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [m2mOtherTableId, setM2mOtherTableId] = useState("");
  const [m2mSchemaName, setM2mSchemaName] = useState("");
  const [m2mCascade, setM2mCascade] = useState<CascadeDelete>("removeLink");

  const tableRef = useRef(table);
  useEffect(() => {
    tableRef.current = table;
  });

  const draft = useMemo<TableDraft>(
    () => ({
      schemaName,
      displayName,
      displayNamePlural,
      description,
      ownershipType,
      auditingEnabled,
      primaryColumn,
      columns,
      manyToMany,
      sampleRows,
    }),
    [
      schemaName,
      displayName,
      displayNamePlural,
      description,
      ownershipType,
      auditingEnabled,
      primaryColumn,
      columns,
      manyToMany,
      sampleRows,
    ],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(table) && !loading && !deleting,
    delayMs: 800,
    save: async (next) => {
      const current = tableRef.current;
      if (!current) throw new Error("Table not loaded");
      const key = await getWorkspaceKey(workspaceId);
      const relationships = buildRelationships(
        current.id,
        next.columns,
        next.manyToMany,
      );
      const saved = await saveTable(workspaceId, key, current, {
        schemaName: next.schemaName,
        displayName: next.displayName,
        displayNamePlural: next.displayNamePlural,
        description: next.description || null,
        ownershipType: next.ownershipType,
        auditingEnabled: next.auditingEnabled,
        primaryColumn: next.primaryColumn,
        columns: next.columns,
        relationships,
        sampleRows: next.sampleRows.slice(0, MAX_SAMPLE_ROWS),
      });
      setTable(saved);
      upsertTable(saved);
      window.dispatchEvent(new Event("helvety:databases-changed"));
      return {
        schemaName: saved.schemaName,
        displayName: saved.displayName,
        displayNamePlural: saved.displayNamePlural,
        description: saved.description ?? "",
        ownershipType: saved.ownershipType,
        auditingEnabled: saved.auditingEnabled,
        primaryColumn: saved.primaryColumn,
        columns: saved.columns,
        manyToMany: manyToManyOnly(saved.relationships),
        sampleRows: saved.sampleRows,
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setSchemaName(canonical.schemaName);
      setDisplayName(canonical.displayName);
      setDisplayNamePlural(canonical.displayNamePlural);
      setDescription(canonical.description);
      setOwnershipType(canonical.ownershipType);
      setAuditingEnabled(canonical.auditingEnabled);
      setPrimaryColumn(canonical.primaryColumn);
      setColumns(canonical.columns);
      setManyToMany(canonical.manyToMany);
      setSampleRows(canonical.sampleRows);
      setError(null);
    },
  });

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const [loaded, siblingsPage] = await Promise.all([
          loadDecryptedTable(workspaceId, databaseId, tableId, key),
          loadDecryptedTables(workspaceId, databaseId, key),
        ]);
        if (cancelled) return;
        setTable(loaded);
        setSchemaName(loaded.schemaName);
        setDisplayName(loaded.displayName);
        setDisplayNamePlural(loaded.displayNamePlural);
        setDescription(loaded.description ?? "");
        setOwnershipType(loaded.ownershipType);
        setAuditingEnabled(loaded.auditingEnabled);
        setPrimaryColumn(loaded.primaryColumn);
        setColumns(loaded.columns);
        setManyToMany(manyToManyOnly(loaded.relationships));
        setSampleRows(loaded.sampleRows);
        setSiblingTables(siblingsPage.tables.filter((t) => t.id !== tableId));
        setError(null);
        upsertTable(loaded);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load table");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, databaseId, tableId, getWorkspaceKey, upsertTable]);

  async function onDelete() {
    if (!table || deleting || status === "saving") return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTable(workspaceId, databaseId, tableId);
      window.dispatchEvent(new Event("helvety:databases-changed"));
      router.push(`/app/w/${workspaceId}/databases/${databaseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  function updateColumn(columnId: string, patch: Partial<ColumnDef>) {
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
    );
  }

  function addColumn() {
    const id = crypto.randomUUID();
    const nextIndex = columns.length + 1;
    setColumns((prev) => [
      ...prev,
      {
        id,
        schemaName: `column_${nextIndex}`,
        displayName: `Column ${nextIndex}`,
        type: "text",
        requiredLevel: "none",
        auditingEnabled: false,
        searchable: true,
      },
    ]);
  }

  function removeColumn(columnId: string) {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
  }

  function moveColumn(columnId: string, direction: "up" | "down") {
    setColumns((prev) => {
      const index = prev.findIndex((c) => c.id === columnId);
      if (index < 0) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return next;
    });
  }

  function addManyToMany() {
    const otherId = m2mOtherTableId.trim();
    const schema = m2mSchemaName.trim() || slugify(`rel_${displayName}`) || "rel";
    if (!otherId) return;
    setManyToMany((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "manyToMany",
        tableAId: tableId,
        tableBId: otherId,
        schemaName: schema,
        cascade: m2mCascade,
      },
    ]);
    setM2mOtherTableId("");
    setM2mSchemaName("");
  }

  function addSampleRow() {
    if (sampleRows.length >= MAX_SAMPLE_ROWS) return;
    setSampleRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), values: {} },
    ]);
  }

  function updateSampleValue(
    rowId: string,
    columnKey: string,
    value: unknown,
  ) {
    setSampleRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [columnKey]: value } }
          : row,
      ),
    );
  }

  if (!userKeys) return null;

  const derivedOneToMany = columns.filter(
    (c) => c.type === "lookup" && c.targetTableId,
  );
  const siblingById = new Map(siblingTables.map((t) => [t.id, t]));
  const sampleColumns = [
    {
      key: primaryColumn.schemaName,
      label: primaryColumn.displayName,
      type: "text" as ColumnType | "primary",
      options: undefined as ColumnDef["options"],
      targetTableId: undefined as string | undefined,
    },
    ...columns.map((c) => ({
      key: c.schemaName,
      label: c.displayName,
      type: c.type as ColumnType | "primary",
      options: c.options,
      targetTableId: c.targetTableId,
    })),
  ];

  return (
    <EntityDetailShell loading={loading} error={error}>
      <PageDangerActions>
        <DeleteButton
          disabled={deleting}
          busy={deleting}
          dialogTitle="Delete this table?"
          dialogDescription="This permanently deletes the table definition and sample data. Linked items elsewhere are not deleted. This cannot be undone."
          onConfirm={onDelete}
        />
      </PageDangerActions>
      <EntityDetailLayout
        main={
          <>
            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <h2 className="text-sm font-medium">Settings</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Schema name
                    </Label>
                    <Input
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                      onBlur={flush}
                      disabled={deleting}
                      maxLength={80}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Display name
                    </Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={flush}
                      disabled={deleting}
                      maxLength={200}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Plural
                    </Label>
                    <Input
                      value={displayNamePlural}
                      onChange={(e) => setDisplayNamePlural(e.target.value)}
                      onBlur={flush}
                      disabled={deleting}
                      maxLength={200}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Ownership
                    </Label>
                    <select
                      className={selectClassName}
                      value={ownershipType}
                      disabled={deleting}
                      onChange={(e) =>
                        setOwnershipType(e.target.value as OwnershipType)
                      }
                      onBlur={flush}
                    >
                      <option value="userOwned">User owned</option>
                      <option value="organizationOwned">
                        Organization owned
                      </option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Description
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={flush}
                    disabled={deleting}
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="table-auditing"
                    checked={auditingEnabled}
                    disabled={deleting}
                    onCheckedChange={(v) => setAuditingEnabled(v === true)}
                  />
                  <Label htmlFor="table-auditing" className="text-sm font-normal">
                    Auditing enabled
                  </Label>
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">
                      Primary schema
                    </Label>
                    <Input
                      value={primaryColumn.schemaName}
                      onChange={(e) =>
                        setPrimaryColumn((p) => ({
                          ...p,
                          schemaName: e.target.value,
                        }))
                      }
                      onBlur={flush}
                      disabled={deleting}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">
                      Primary display
                    </Label>
                    <Input
                      value={primaryColumn.displayName}
                      onChange={(e) =>
                        setPrimaryColumn((p) => ({
                          ...p,
                          displayName: e.target.value,
                        }))
                      }
                      onBlur={flush}
                      disabled={deleting}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">
                      Max length
                    </Label>
                    <Input
                      type="number"
                      value={primaryColumn.maxLength ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setPrimaryColumn((p) => {
                          const next = { ...p };
                          if (raw === "") {
                            delete next.maxLength;
                          } else {
                            const n = Number(raw);
                            if (Number.isFinite(n)) next.maxLength = n;
                          }
                          return next;
                        });
                      }}
                      onBlur={flush}
                      disabled={deleting}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">Columns</h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={deleting}
                    onClick={addColumn}
                  >
                    Add column
                  </Button>
                </div>
                {columns.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No columns yet (primary name column is separate).
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {columns.map((column, index) => (
                      <li
                        key={column.id}
                        className="flex flex-col gap-2 rounded-md border border-border p-2"
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Input
                            value={column.schemaName}
                            onChange={(e) =>
                              updateColumn(column.id, {
                                schemaName: e.target.value,
                              })
                            }
                            onBlur={flush}
                            disabled={deleting}
                            placeholder="schema_name"
                          />
                          <Input
                            value={column.displayName}
                            onChange={(e) =>
                              updateColumn(column.id, {
                                displayName: e.target.value,
                              })
                            }
                            onBlur={flush}
                            disabled={deleting}
                            placeholder="Display name"
                          />
                          <select
                            className={selectClassName}
                            value={column.type}
                            disabled={deleting}
                            onChange={(e) =>
                              updateColumn(column.id, {
                                type: e.target.value as ColumnType,
                              })
                            }
                            onBlur={flush}
                          >
                            {COLUMN_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <select
                            className={selectClassName}
                            value={column.requiredLevel}
                            disabled={deleting}
                            onChange={(e) =>
                              updateColumn(column.id, {
                                requiredLevel: e.target
                                  .value as RequiredLevel,
                              })
                            }
                            onBlur={flush}
                          >
                            {REQUIRED_LEVELS.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`col-audit-${column.id}`}
                              checked={column.auditingEnabled}
                              disabled={deleting}
                              onCheckedChange={(v) =>
                                updateColumn(column.id, {
                                  auditingEnabled: v === true,
                                })
                              }
                            />
                            <Label
                              htmlFor={`col-audit-${column.id}`}
                              className="text-xs font-normal"
                            >
                              Auditing
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`col-search-${column.id}`}
                              checked={column.searchable}
                              disabled={deleting}
                              onCheckedChange={(v) =>
                                updateColumn(column.id, {
                                  searchable: v === true,
                                })
                              }
                            />
                            <Label
                              htmlFor={`col-search-${column.id}`}
                              className="text-xs font-normal"
                            >
                              Searchable
                            </Label>
                          </div>
                        </div>
                        {column.type === "lookup" ? (
                          <select
                            className={selectClassName}
                            value={column.targetTableId ?? ""}
                            disabled={deleting}
                            onChange={(e) =>
                              updateColumn(column.id, {
                                targetTableId: e.target.value || undefined,
                              })
                            }
                            onBlur={flush}
                          >
                            <option value="">Lookup table…</option>
                            {siblingTables.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.displayName} ({t.schemaName})
                              </option>
                            ))}
                          </select>
                        ) : null}
                        {column.type === "choice" ||
                        column.type === "choices" ? (
                          <Input
                            value={(column.options ?? [])
                              .map((o) => o.label)
                              .join(", ")}
                            onChange={(e) => {
                              const labels = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              updateColumn(column.id, {
                                options: labels.map((label, i) => ({
                                  id:
                                    column.options?.[i]?.id ??
                                    crypto.randomUUID(),
                                  label,
                                  color: column.options?.[i]?.color,
                                })),
                              });
                            }}
                            onBlur={flush}
                            disabled={deleting}
                            placeholder="Choice labels, comma-separated"
                          />
                        ) : null}
                        {(column.type === "text" ||
                          column.type === "multiline" ||
                          column.type === "email" ||
                          column.type === "phone" ||
                          column.type === "url") && (
                          <Input
                            type="number"
                            value={column.maxLength ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateColumn(column.id, {
                                maxLength:
                                  raw === ""
                                    ? undefined
                                    : Number.isFinite(Number(raw))
                                      ? Number(raw)
                                      : column.maxLength,
                              });
                            }}
                            onBlur={flush}
                            disabled={deleting}
                            placeholder="Max length"
                          />
                        )}
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={deleting || index === 0}
                            onClick={() => moveColumn(column.id, "up")}
                          >
                            ⇡
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={
                              deleting || index >= columns.length - 1
                            }
                            onClick={() => moveColumn(column.id, "down")}
                          >
                            ⇣
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={deleting}
                            onClick={() => removeColumn(column.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <h2 className="text-sm font-medium">Relationships</h2>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    One-to-many (from lookup columns)
                  </p>
                  {derivedOneToMany.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None.</p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                      {derivedOneToMany.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-md bg-muted/50 px-2 py-1"
                        >
                          {c.displayName} →{" "}
                          {siblingById.get(c.targetTableId!)?.displayName ??
                            c.targetTableId}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Many-to-many</p>
                  {manyToMany.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {manyToMany.map((rel) => (
                        <li
                          key={rel.id}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1 text-sm"
                        >
                          <span>
                            {rel.schemaName} ↔{" "}
                            {siblingById.get(
                              rel.tableAId === tableId
                                ? rel.tableBId
                                : rel.tableAId,
                            )?.displayName ?? "table"}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={deleting}
                            onClick={() =>
                              setManyToMany((prev) =>
                                prev.filter((r) => r.id !== rel.id),
                              )
                            }
                          >
                            Delete
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <select
                      className={selectClassName}
                      value={m2mOtherTableId}
                      disabled={deleting || siblingTables.length === 0}
                      onChange={(e) => setM2mOtherTableId(e.target.value)}
                    >
                      <option value="">Other table…</option>
                      {siblingTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.displayName}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={m2mSchemaName}
                      onChange={(e) => setM2mSchemaName(e.target.value)}
                      disabled={deleting}
                      placeholder="Relationship schema"
                    />
                    <select
                      className={selectClassName}
                      value={m2mCascade}
                      disabled={deleting}
                      onChange={(e) =>
                        setM2mCascade(e.target.value as CascadeDelete)
                      }
                    >
                      {CASCADE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="self-start"
                    disabled={deleting || !m2mOtherTableId}
                    onClick={addManyToMany}
                  >
                    Add many-to-many
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">
                    Sample data{" "}
                    <span className="font-normal text-muted-foreground">
                      ({sampleRows.length}/{MAX_SAMPLE_ROWS})
                    </span>
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      deleting || sampleRows.length >= MAX_SAMPLE_ROWS
                    }
                    onClick={addSampleRow}
                  >
                    Add row
                  </Button>
                </div>
                {sampleRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No sample rows yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          {sampleColumns.map((col) => (
                            <th key={col.key} className="px-1 py-1 font-medium">
                              {col.label}
                            </th>
                          ))}
                          <th className="px-1 py-1" />
                        </tr>
                      </thead>
                      <tbody>
                        {sampleRows.map((row) => (
                          <tr key={row.id} className="border-b border-border">
                            {sampleColumns.map((col) => {
                              const raw = row.values[col.key];
                              if (col.type === "boolean") {
                                return (
                                  <td key={col.key} className="px-1 py-1">
                                    <Checkbox
                                      checked={raw === true}
                                      disabled={deleting}
                                      onCheckedChange={(v) =>
                                        updateSampleValue(
                                          row.id,
                                          col.key,
                                          v === true,
                                        )
                                      }
                                    />
                                  </td>
                                );
                              }
                              if (
                                col.type === "choice" &&
                                col.options &&
                                col.options.length > 0
                              ) {
                                return (
                                  <td key={col.key} className="px-1 py-1">
                                    <select
                                      className={selectClassName}
                                      value={
                                        typeof raw === "string" ? raw : ""
                                      }
                                      disabled={deleting}
                                      onChange={(e) =>
                                        updateSampleValue(
                                          row.id,
                                          col.key,
                                          e.target.value || undefined,
                                        )
                                      }
                                    >
                                      <option value="">(none)</option>
                                      {col.options.map((o) => (
                                        <option key={o.id} value={o.id}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }
                              if (col.type === "lookup" && col.targetTableId) {
                                const target = siblingById.get(
                                  col.targetTableId,
                                );
                                const options = target?.sampleRows ?? [];
                                return (
                                  <td key={col.key} className="px-1 py-1">
                                    <select
                                      className={selectClassName}
                                      value={
                                        typeof raw === "string" ? raw : ""
                                      }
                                      disabled={deleting}
                                      onChange={(e) =>
                                        updateSampleValue(
                                          row.id,
                                          col.key,
                                          e.target.value || undefined,
                                        )
                                      }
                                    >
                                      <option value="">(none)</option>
                                      {options.map((opt) => {
                                        const label =
                                          typeof opt.values[
                                            target?.primaryColumn.schemaName ??
                                              "name"
                                          ] === "string"
                                            ? String(
                                                opt.values[
                                                  target!.primaryColumn
                                                    .schemaName
                                                ],
                                              )
                                            : opt.id.slice(0, 8);
                                        return (
                                          <option key={opt.id} value={opt.id}>
                                            {label}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </td>
                                );
                              }
                              return (
                                <td key={col.key} className="px-1 py-1">
                                  <Input
                                    value={
                                      raw == null ? "" : String(raw)
                                    }
                                    disabled={deleting}
                                    onChange={(e) =>
                                      updateSampleValue(
                                        row.id,
                                        col.key,
                                        e.target.value,
                                      )
                                    }
                                    onBlur={flush}
                                  />
                                </td>
                              );
                            })}
                            <td className="px-1 py-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={deleting}
                                onClick={() =>
                                  setSampleRows((prev) =>
                                    prev.filter((r) => r.id !== row.id),
                                  )
                                }
                              >
                                ×
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        }
        aside={
          <>
            {table ? (
              <EntityTimestampsCard
                createdAt={table.createdAt}
                updatedAt={table.updatedAt}
                status={status}
                savedAt={savedAt}
                onRetry={flush}
              />
            ) : null}
            <BacklinksPanel
              workspaceId={workspaceId}
              kind="table"
              id={tableId}
            />
          </>
        }
      />
    </EntityDetailShell>
  );
}
