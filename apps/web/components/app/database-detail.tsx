"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import {
  EntityDetailLayout,
  EntityDetailShell,
} from "@/components/app/entity-detail-shell";
import { EntityTimestampsCard } from "@/components/app/entity-timestamps-card";
import { InlineTitle } from "@/components/app/inline-title";
import { PageDangerActions } from "@/components/app/page-actions";
import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  deleteDatabase,
  loadDecryptedDatabase,
  saveDatabase,
  type DecryptedDatabase,
} from "@/lib/client-crypto/databases";
import {
  createTable,
  loadDecryptedTables,
  type DecryptedTable,
} from "@/lib/client-crypto/tables";
import {
  EMPTY_TASK_BODY,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

type DatabaseDetailProps = {
  workspaceId: string;
  databaseId: string;
};

type DatabaseDraft = {
  name: string;
  description: TaskBodyDoc;
  publisherPrefix: string;
  displayName: string;
};

function slugifySchemaName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function DatabaseDetail({
  workspaceId,
  databaseId,
}: DatabaseDetailProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const cache = useEntityCache();
  const { upsertDatabase, upsertTable } = cache;

  const [database, setDatabase] = useState<DecryptedDatabase | null>(null);
  const [tables, setTables] = useState<DecryptedTable[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState<TaskBodyDoc>(EMPTY_TASK_BODY);
  const [publisherPrefix, setPublisherPrefix] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newSchemaName, setNewSchemaName] = useState("");
  const [newPlural, setNewPlural] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const databaseRef = useRef(database);
  useEffect(() => {
    databaseRef.current = database;
  });

  const draft = useMemo<DatabaseDraft>(
    () => ({ name, description, publisherPrefix, displayName }),
    [name, description, publisherPrefix, displayName],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(database) && !loading && !deleting,
    save: async (next) => {
      const current = databaseRef.current;
      if (!current) throw new Error("Database not loaded");
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveDatabase(workspaceId, key, current, {
        name: next.name,
        description: next.description,
        publisherPrefix: next.publisherPrefix,
        displayName: next.displayName,
      });
      setDatabase(saved);
      upsertDatabase(saved);
      window.dispatchEvent(new Event("helvety:databases-changed"));
      return {
        name: saved.name,
        description: saved.description ?? EMPTY_TASK_BODY,
        publisherPrefix: saved.publisherPrefix ?? "",
        displayName: saved.displayName ?? "",
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setName(canonical.name);
      setDescription(canonical.description);
      setPublisherPrefix(canonical.publisherPrefix);
      setDisplayName(canonical.displayName);
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
        const [loaded, tablesPage] = await Promise.all([
          loadDecryptedDatabase(workspaceId, databaseId, key),
          loadDecryptedTables(workspaceId, databaseId, key),
        ]);
        if (cancelled) return;
        setDatabase(loaded);
        setName(loaded.name);
        setDescription(loaded.description ?? EMPTY_TASK_BODY);
        setPublisherPrefix(loaded.publisherPrefix ?? "");
        setDisplayName(loaded.displayName ?? "");
        setTables(tablesPage.tables);
        setError(null);
        upsertDatabase(loaded);
        for (const table of tablesPage.tables) {
          upsertTable(table);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load database");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, databaseId, getWorkspaceKey, upsertDatabase, upsertTable]);

  async function onDelete() {
    if (!database || deleting || status === "saving") return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDatabase(workspaceId, databaseId);
      window.dispatchEvent(new Event("helvety:databases-changed"));
      router.push(`/app/w/${workspaceId}/databases`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function onCreateTable(display: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const schema =
        newSchemaName.trim() ||
        slugifySchemaName(display) ||
        "table";
      const plural = newPlural.trim() || `${display}s`;
      const nextOrder =
        tables.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
      const created = await createTable(
        workspaceId,
        databaseId,
        key,
        {
          schemaName: schema,
          displayName: display,
          displayNamePlural: plural,
          publisherPrefix: publisherPrefix.trim() || undefined,
        },
        nextOrder,
      );
      setTables((prev) => [...prev, created]);
      upsertTable(created);
      window.dispatchEvent(new Event("helvety:databases-changed"));
      router.push(
        `/app/w/${workspaceId}/databases/${databaseId}/tables/${created.id}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  const sortedTables = [...tables].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return (
    <EntityDetailShell loading={loading} error={error}>
      <PageDangerActions>
        <DeleteButton
          disabled={deleting}
          busy={deleting}
          dialogTitle="Delete this database?"
          dialogDescription="This permanently deletes the database and all of its tables. Linked items elsewhere are not deleted. This cannot be undone."
          onConfirm={onDelete}
        />
      </PageDangerActions>
      <EntityDetailLayout
        main={
          <>
            <InlineTitle
              value={name}
              onChange={setName}
              onBlur={flush}
              placeholder="Untitled database"
              disabled={deleting}
              maxLength={200}
              className="min-w-0"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="db-display-name"
                  className="text-xs text-muted-foreground"
                >
                  Display name
                </Label>
                <Input
                  id="db-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={flush}
                  disabled={deleting}
                  maxLength={200}
                  placeholder="Optional label"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="db-publisher-prefix"
                  className="text-xs text-muted-foreground"
                >
                  Publisher prefix
                </Label>
                <Input
                  id="db-publisher-prefix"
                  value={publisherPrefix}
                  onChange={(e) => setPublisherPrefix(e.target.value)}
                  onBlur={flush}
                  disabled={deleting}
                  maxLength={40}
                  placeholder="e.g. cr"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Description
              </p>
              <TaskBodyEditor
                content={description}
                onChange={setDescription}
                disabled={deleting}
              />
            </div>

            <Card size="sm">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">Tables</h2>
                  <CreateEntityDialog
                    workspaceId={workspaceId}
                    triggerLabel="New table"
                    dialogTitle="New table"
                    fieldLabel="Display name"
                    fieldPlaceholder="Account"
                    disabled={busy || deleting}
                    onCreate={onCreateTable}
                    onOpenChange={(open) => {
                      if (open) {
                        setNewSchemaName("");
                        setNewPlural("");
                      }
                    }}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="new-table-schema">Schema name</Label>
                        <Input
                          id="new-table-schema"
                          value={newSchemaName}
                          onChange={(e) => setNewSchemaName(e.target.value)}
                          placeholder="account"
                          disabled={busy}
                          maxLength={80}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="new-table-plural">Plural</Label>
                        <Input
                          id="new-table-plural"
                          value={newPlural}
                          onChange={(e) => setNewPlural(e.target.value)}
                          placeholder="Accounts"
                          disabled={busy}
                          maxLength={200}
                        />
                      </div>
                    </div>
                  </CreateEntityDialog>
                </div>
                {sortedTables.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No tables yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {sortedTables.map((table) => (
                      <li key={table.id}>
                        <Link
                          href={`/app/w/${workspaceId}/databases/${databaseId}/tables/${table.id}`}
                          className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <span className="font-medium truncate">
                            {table.displayName || "Untitled"}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-muted-foreground">
                            {table.schemaName}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        }
        aside={
          <>
            {database ? (
              <EntityTimestampsCard
                createdAt={database.createdAt}
                updatedAt={database.updatedAt}
                status={status}
                savedAt={savedAt}
                onRetry={flush}
              />
            ) : null}
            <BacklinksPanel
              workspaceId={workspaceId}
              kind="database"
              id={databaseId}
            />
          </>
        }
      />
    </EntityDetailShell>
  );
}
