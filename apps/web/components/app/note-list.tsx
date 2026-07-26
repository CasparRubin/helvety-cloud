"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import type { EntityColor } from "@/lib/vault/entity-colors";
import {
  createNote,
  loadDecryptedNotes,
  type DecryptedNote,
} from "@/lib/vault/notes";
import { textToTaskBody } from "@/lib/vault/task-plaintext";

type NoteListProps = {
  workspaceId: string;
};

export function NoteList({ workspaceId }: NoteListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newColor, setNewColor] = useState<EntityColor | undefined>();

  useEffect(() => {
    if (!vault) return;
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
  }, [vault, workspaceId, getWorkspaceKey]);

  function resetCreateFields() {
    setNewBody("");
    setNewTags("");
    setNewColor(undefined);
  }

  async function onCreate(title: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        notes.reduce((max, n) => Math.max(max, n.sortOrder), -1) + 1;
      const body = newBody.trim();
      const tags = newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const created = await createNote(
        workspaceId,
        key,
        {
          title,
          body: body ? textToTaskBody(body) : undefined,
          tags,
          color: newColor,
        },
        nextOrder,
      );
      window.dispatchEvent(new Event("helvety:notes-changed"));
      router.push(`/app/w/${workspaceId}/notes/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <EntityListShell
      title="Notes"
      createForm={
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-note-tags">Tags</Label>
            <Input
              id="new-note-tags"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="comma-separated"
              disabled={busy}
            />
          </div>
          <EntityColorPicker
            value={newColor}
            disabled={busy}
            onChange={setNewColor}
          />
        </CreateEntityDialog>
      }
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
            {note.tags.length > 0 ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {note.tags.join(", ")}
              </span>
            ) : null}
          </Link>
        </EntityListRow>
      ))}
    </EntityListShell>
  );
}
