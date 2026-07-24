"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      router.push(`/app/w/${workspaceId}/notes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Note titles and bodies are encrypted end-to-end in this workspace.
        </p>
      </div>

      <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New note title"
          disabled={busy}
          maxLength={500}
          aria-label="Note title"
        />
        <Button type="submit" disabled={busy || !title.trim()} size="sm">
          Create
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading notes…</p>
      ) : notes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No notes yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/app/w/${workspaceId}/notes/${note.id}`}
                className="block rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
              >
                {note.title || "Untitled"}
                {note.tags.length > 0 ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {note.tags.join(", ")}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
