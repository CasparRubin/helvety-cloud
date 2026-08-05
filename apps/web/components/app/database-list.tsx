"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PinIcon } from "lucide-react";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DateTimeText } from "@/components/app/datetime-text";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { ListSearchInput } from "@/components/app/list-search-input";
import { ListSortToggle } from "@/components/app/list-sort-toggle";
import {
  ListRefreshButton,
  PageActions,
  WorkspaceSettingsAction,
} from "@/components/app/page-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createDatabase,
  loadDecryptedDatabases,
  reorderPinnedDatabases,
  setDatabasePinned,
  sortDatabasesForDisplay,
  type DecryptedDatabase,
} from "@/lib/client-crypto/databases";
import { matchesQuery } from "@/lib/list-search";

type DatabaseSort = "created" | "modified";

const DATABASE_SORT_OPTIONS = [
  { id: "created" as const, label: "Created" },
  { id: "modified" as const, label: "Modified" },
];

function compareDatabases(
  a: DecryptedDatabase,
  b: DecryptedDatabase,
  sort: DatabaseSort,
) {
  const field = sort === "created" ? "createdAt" : "updatedAt";
  const byDate = b[field].localeCompare(a[field]);
  if (byDate !== 0) return byDate;
  return a.id.localeCompare(b.id);
}

type DatabaseListProps = {
  workspaceId: string;
};

export function DatabaseList({ workspaceId }: DatabaseListProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [databases, setDatabases] = useState<DecryptedDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [publisherPrefix, setPublisherPrefix] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DatabaseSort>("created");
  const deferredQuery = useDeferredValue(query);

  const loadDatabases = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    return loadDecryptedDatabases(workspaceId, key);
  }, [getWorkspaceKey, workspaceId]);

  const handleRefresh = useCallback(async () => {
    try {
      const page = await loadDatabases();
      setDatabases(page.databases);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [loadDatabases]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await loadDatabases();
        if (cancelled) return;
        setDatabases(page.databases);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load databases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadDatabases]);

  async function onCreate(name: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        databases.reduce((max, d) => Math.max(max, d.sortOrder), -1) + 1;
      const prefix = publisherPrefix.trim();
      const created = await createDatabase(
        workspaceId,
        key,
        {
          name,
          publisherPrefix: prefix || undefined,
        },
        nextOrder,
      );
      window.dispatchEvent(new Event("helvety:databases-changed"));
      setDatabases((prev) => [created, ...prev]);
      router.push(`/app/w/${workspaceId}/databases/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTogglePinned(database: DecryptedDatabase) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const updated = await setDatabasePinned(
        workspaceId,
        key,
        database,
        !database.isPinned,
        databases,
      );
      setDatabases((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      window.dispatchEvent(new Event("helvety:databases-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update pin");
    } finally {
      setBusy(false);
    }
  }

  async function onReorderPinned(
    databaseId: string,
    direction: "up" | "down",
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const next = await reorderPinnedDatabases(
        workspaceId,
        key,
        databases,
        databaseId,
        direction,
      );
      setDatabases(next);
      window.dispatchEvent(new Event("helvety:databases-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  const filtering = deferredQuery.trim().length > 0;
  const filteredDatabases = sortDatabasesForDisplay(
    databases.filter((d) =>
      matchesQuery([d.name, d.displayName ?? "", d.publisherPrefix ?? ""], deferredQuery),
    ),
    (a, b) => compareDatabases(a, b, sort),
  );
  const pinnedDatabases = filteredDatabases.filter((d) => d.isPinned);
  const pinnedIndexById = new Map(
    pinnedDatabases.map((d, index) => [d.id, index]),
  );

  return (
    <>
      <ListRefreshButton disabled={busy} onRefresh={handleRefresh} />
      <PageActions>
        <CreateEntityDialog
          workspaceId={workspaceId}
          triggerLabel="New database"
          dialogTitle="New database"
          fieldLabel="Name"
          fieldPlaceholder="Database name"
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) setPublisherPrefix("");
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-db-publisher-prefix">
              Publisher prefix (optional)
            </Label>
            <Input
              id="new-db-publisher-prefix"
              value={publisherPrefix}
              onChange={(e) => setPublisherPrefix(e.target.value)}
              placeholder="e.g. cr"
              disabled={busy}
              maxLength={40}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title="Databases"
        belowTitle={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ListSearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Filter databases…"
              disabled={loading || databases.length === 0}
            />
            <ListSortToggle
              value={sort}
              onValueChange={setSort}
              options={DATABASE_SORT_OPTIONS}
              disabled={loading || databases.length === 0}
            />
          </div>
        }
        error={error}
        loading={loading}
        loadingLabel="Loading databases…"
        empty={
          !loading &&
          (databases.length === 0 ||
            (filtering && filteredDatabases.length === 0))
        }
        emptyLabel={
          databases.length === 0
            ? "No databases yet."
            : "No matching databases."
        }
      >
        {filteredDatabases.map((database) => {
          const dateIso =
            sort === "created" ? database.createdAt : database.updatedAt;
          const dateLabel = sort === "created" ? "Created" : "Modified";
          return (
            <EntityListRow key={database.id} className="flex items-start gap-2">
              <Link
                href={`/app/w/${workspaceId}/databases/${database.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1"
              >
                <span className="font-medium">
                  {database.name || "Untitled"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {database.publisherPrefix
                    ? `Prefix ${database.publisherPrefix} · `
                    : null}
                  {dateLabel} <DateTimeText value={dateIso} />
                </span>
              </Link>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onTogglePinned(database)}
                  aria-label={
                    database.isPinned ? "Unpin database" : "Pin database"
                  }
                >
                  <PinIcon
                    className="size-4"
                    aria-hidden="true"
                    fill={database.isPinned ? "currentColor" : "none"}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    busy ||
                    filtering ||
                    !database.isPinned ||
                    (pinnedIndexById.get(database.id) ?? 0) === 0
                  }
                  onClick={() => void onReorderPinned(database.id, "up")}
                  aria-label="Move pin up"
                >
                  ⇡
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    busy ||
                    filtering ||
                    !database.isPinned ||
                    (pinnedIndexById.get(database.id) ?? 0) >=
                      pinnedDatabases.length - 1
                  }
                  onClick={() => void onReorderPinned(database.id, "down")}
                  aria-label="Move pin down"
                >
                  ⇣
                </Button>
              </div>
            </EntityListRow>
          );
        })}
      </EntityListShell>
    </>
  );
}
