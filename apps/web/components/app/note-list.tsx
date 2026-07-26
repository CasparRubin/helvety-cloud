"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { PageActions } from "@/components/app/page-actions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createNote,
  loadDecryptedNotes,
  type DecryptedNote,
} from "@/lib/client-crypto/notes";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";

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

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedNotes(workspaceId, key);
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
  }, [userKeys, workspaceId, getWorkspaceKey]);

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

  return (
    <>
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
      <EntityListShell
        title="Notes"
        error={error}
        loading={loading}
        loadingLabel="Loading notes…"
        empty={!loading && notes.length === 0}
        emptyLabel="No notes yet."
      >
        {notes.map((note) => (
          <EntityListRow key={note.id}>
            <Link
              href={`/app/w/${workspaceId}/notes/${note.id}`}
              className="font-medium"
            >
              {note.title || "Untitled"}
            </Link>
          </EntityListRow>
        ))}
      </EntityListShell>
    </>
  );
}
