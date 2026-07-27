"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { ListSearchInput } from "@/components/app/list-search-input";
import {
  ListRefreshButton,
  PageActions,
  WorkspaceSettingsAction,
} from "@/components/app/page-actions";
import { useDateTimePrefs } from "@/components/app/datetime-prefs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createNote,
  loadDecryptedNotes,
  type DecryptedNote,
} from "@/lib/client-crypto/notes";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";
import { formatDateTime } from "@/lib/format-datetime";
import { matchesQuery } from "@/lib/list-search";

type NoteListProps = {
  workspaceId: string;
};

export function NoteList({ workspaceId }: NoteListProps) {
  const router = useRouter();
  const { prefs } = useDateTimePrefs();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [query, setQuery] = useState("");
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

  if (!userKeys) return null;

  const filtering = deferredQuery.trim().length > 0;
  const filteredNotes = notes.filter((n) =>
    matchesQuery([n.title], deferredQuery),
  );

  return (
    <>
      <ListRefreshButton disabled={busy} onRefresh={handleRefresh} />
      <PageActions>
        <CreateEntityDialog
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
          <ListSearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Filter notes…"
            disabled={loading || notes.length === 0}
          />
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
        {filteredNotes.map((note) => (
          <EntityListRow key={note.id}>
            <Link
              href={`/app/w/${workspaceId}/notes/${note.id}`}
              className="flex w-full flex-col gap-0.5"
            >
              <span className="font-medium">{note.title || "Untitled"}</span>
              <span className="text-xs text-muted-foreground">
                Created {formatDateTime(note.createdAt, prefs)}
                {" · "}
                Modified {formatDateTime(note.updatedAt, prefs)}
              </span>
            </Link>
          </EntityListRow>
        ))}
      </EntityListShell>
    </>
  );
}
