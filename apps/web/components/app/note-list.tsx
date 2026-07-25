"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createNote,
  loadDecryptedNotes,
  type DecryptedNote,
} from "@/lib/vault/notes";

type NoteListProps = {
  workspaceId: string;
};

export function NoteList({ workspaceId }: NoteListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        notes.reduce((max, n) => Math.max(max, n.sortOrder), -1) + 1;
      const created = await createNote(
        workspaceId,
        key,
        { title: trimmed },
        nextOrder,
      );
      setTitle("");
      window.dispatchEvent(new Event("helvety:notes-changed"));
      router.push(`/app/w/${workspaceId}/notes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <EntityListShell
      title="Notes"
      subtitle="Note titles and bodies are encrypted end-to-end in this workspace."
      createForm={
        <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New note title"
            disabled={busy}
            maxLength={500}
            aria-label="Note title"
          />
          <Button type="submit" disabled={busy || !title.trim()}>
            Create
          </Button>
        </form>
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
