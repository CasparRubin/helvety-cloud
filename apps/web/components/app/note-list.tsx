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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createNote,
  loadDecryptedNotes,
  reorderPinnedNotes,
  setNotePinned,
  sortNotesForDisplay,
  type DecryptedNote,
} from "@/lib/client-crypto/notes";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";
import { matchesQuery } from "@/lib/list-search";

type NoteSort = "created" | "modified";

const NOTE_SORT_OPTIONS = [
  { id: "created" as const, label: "Created" },
  { id: "modified" as const, label: "Modified" },
];

function compareNotes(a: DecryptedNote, b: DecryptedNote, sort: NoteSort) {
  const field = sort === "created" ? "createdAt" : "updatedAt";
  const byDate = b[field].localeCompare(a[field]);
  if (byDate !== 0) return byDate;
  return a.id.localeCompare(b.id);
}

type NoteListProps = {
  workspaceId: string;
};

export function NoteList({ workspaceId }: NoteListProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<NoteSort>("created");
  const deferredQuery = useDeferredValue(query);

  const loadNotes = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    return loadDecryptedNotes(workspaceId, key);
  }, [getWorkspaceKey, workspaceId]);

  const refresh = useCallback(async () => {
    const page = await loadNotes();
    setNotes(page.notes);
    setError(null);
  }, [loadNotes]);

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [refresh]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await loadNotes();
        if (cancelled) return;
        setNotes(page.notes);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load notes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadNotes]);

  function resetCreateFields() {
    setNewBody("");
  }

  async function onCreate(title: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        notes.reduce((max, n) => Math.max(max, n.sortOrder), -1) + 1;
      const body = newBody.trim();
      const created = await createNote(
        workspaceId,
        key,
        {
          title,
          body: body ? textToTaskBody(body) : undefined,
        },
        nextOrder,
      );
      window.dispatchEvent(new Event("helvety:notes-changed"));
      router.push(`/app/w/${workspaceId}/notes/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTogglePinned(note: DecryptedNote) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const updated = await setNotePinned(
        workspaceId,
        key,
        notes,
        note,
        !note.isPinned,
      );
      setNotes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      window.dispatchEvent(new Event("helvety:notes-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pin update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReorderPinned(noteId: string, direction: "up" | "down") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const next = await reorderPinnedNotes(
        workspaceId,
        key,
        notes,
        noteId,
        direction,
      );
      setNotes(next);
      window.dispatchEvent(new Event("helvety:notes-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pinned reorder failed");
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  const filtering = deferredQuery.trim().length > 0;
  const filteredNotes = sortNotesForDisplay(
    notes.filter((n) => matchesQuery([n.title], deferredQuery)),
    (a, b) => compareNotes(a, b, sort),
  );
  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const pinnedIndexById = new Map(
    pinnedNotes.map((note, index) => [note.id, index]),
  );

  return (
    <>
      <ListRefreshButton disabled={busy} onRefresh={handleRefresh} />
      <PageActions>
        <CreateEntityDialog
          workspaceId={workspaceId}
          triggerLabel="Create note"
          dialogTitle="Create note"
          fieldLabel="Title"
          fieldPlaceholder="New note title"
          fieldMaxLength={500}
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) resetCreateFields();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-note-body">Note</Label>
            <Textarea
              id="new-note-body"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write a note…"
              disabled={busy}
              rows={3}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title="Notes"
        belowTitle={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ListSearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Filter notes…"
              disabled={loading || notes.length === 0}
            />
            <ListSortToggle
              value={sort}
              onValueChange={setSort}
              options={NOTE_SORT_OPTIONS}
              disabled={loading || notes.length === 0}
            />
          </div>
        }
        error={error}
        loading={loading}
        loadingLabel="Loading notes…"
        empty={
          !loading &&
          (notes.length === 0 || (filtering && filteredNotes.length === 0))
        }
        emptyLabel={notes.length === 0 ? "No notes yet." : "No matching notes."}
      >
        {filteredNotes.map((note) => {
          const dateIso = sort === "created" ? note.createdAt : note.updatedAt;
          const dateLabel = sort === "created" ? "Created" : "Modified";
          return (
            <EntityListRow key={note.id} className="flex items-start gap-2">
              <Link
                href={`/app/w/${workspaceId}/notes/${note.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1"
              >
                <span className="font-medium">{note.title || "Untitled"}</span>
                <span className="text-xs text-muted-foreground">
                  {dateLabel} <DateTimeText value={dateIso} />
                </span>
              </Link>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onTogglePinned(note)}
                  aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                >
                  <PinIcon
                    className="size-4"
                    aria-hidden="true"
                    fill={note.isPinned ? "currentColor" : "none"}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    busy ||
                    filtering ||
                    !note.isPinned ||
                    (pinnedIndexById.get(note.id) ?? 0) === 0
                  }
                  onClick={() => void onReorderPinned(note.id, "up")}
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
                    !note.isPinned ||
                    (pinnedIndexById.get(note.id) ?? -1) ===
                      pinnedNotes.length - 1
                  }
                  onClick={() => void onReorderPinned(note.id, "down")}
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
