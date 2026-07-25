"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import {
  TaskBodyEditor,
  type EntityLinkAction,
} from "@/components/app/task-body-editor";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { InlineTitle } from "@/components/app/inline-title";
import { SaveStatus } from "@/components/app/save-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultEntityCache } from "@/components/vault/vault-entity-cache";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import type { EntityColor } from "@/lib/vault/entity-colors";
import { createContact } from "@/lib/vault/contacts";
import {
  EMPTY_NOTE_BODY,
  toNotePlaintext,
  type TaskBodyDoc,
} from "@/lib/vault/note-plaintext";
import {
  deleteNote,
  loadDecryptedNote,
  saveNote,
  type DecryptedNote,
} from "@/lib/vault/notes";
import { createTask } from "@/lib/vault/tasks";

type NoteDetailProps = {
  workspaceId: string;
  noteId: string;
};

type NoteDraft = {
  title: string;
  body: TaskBodyDoc;
  tagsText: string;
  projectId: string;
  color: EntityColor | undefined;
};

export function NoteDetail({ workspaceId, noteId }: NoteDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();
  const cache = useVaultEntityCache();

  const [note, setNote] = useState<DecryptedNote | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<TaskBodyDoc>(EMPTY_NOTE_BODY);
  const [tagsText, setTagsText] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [color, setColor] = useState<EntityColor | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingProjectPick, setPendingProjectPick] = useState<{
    title: string;
    resolve: (projectId: string | null) => void;
  } | null>(null);
  const [storageLimitMessage, setStorageLimitMessage] = useState<string | null>(
    null,
  );

  const noteRef = useRef(note);
  const projectIdRef = useRef(projectId);
  useEffect(() => {
    noteRef.current = note;
    projectIdRef.current = projectId;
  });

  const draft = useMemo<NoteDraft>(
    () => ({ title, body, tagsText, projectId, color }),
    [title, body, tagsText, projectId, color],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(note) && !loading && !deleting,
    save: async (next) => {
      const current = noteRef.current;
      if (!current) throw new Error("Note not loaded");
      const key = await getWorkspaceKey(workspaceId);
      const tags = next.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const saved = await saveNote(
        workspaceId,
        key,
        current,
        toNotePlaintext(next.title, next.body, tags, next.color),
        {
          projectId: next.projectId || null,
        },
      );
      setNote(saved);
      cache.upsertNote(saved);
      return {
        title: saved.title,
        body: saved.body,
        tagsText: saved.tags.join(", "),
        projectId: saved.projectId ?? "",
        color: saved.color,
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setTitle(canonical.title);
      setBody(canonical.body);
      setTagsText(canonical.tagsText);
      setProjectId(canonical.projectId);
      setColor(canonical.color);
      setError(null);
    },
  });

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const loaded = await loadDecryptedNote(workspaceId, noteId, key);
        if (cancelled) return;
        setNote(loaded);
        setTitle(loaded.title);
        setBody(loaded.body);
        setTagsText(loaded.tags.join(", "));
        setProjectId(loaded.projectId ?? "");
        setColor(loaded.color);
        setError(null);
        cache.upsertNote(loaded);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load note");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, noteId, getWorkspaceKey, cache]);

  async function onDelete() {
    if (!note || deleting || status === "saving") return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNote(workspaceId, note);
      router.push(`/app/w/${workspaceId}/notes`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function pickProjectForNewTask(): Promise<string | null> {
    if (projectIdRef.current) return projectIdRef.current;
    if (cache.projects.length === 1) return cache.projects[0]!.id;
    return new Promise((resolve) => {
      setPendingProjectPick({
        title: "Choose a project for the new task",
        resolve: (id) => {
          setPendingProjectPick(null);
          resolve(id);
        },
      });
    });
  }

  async function onEntityLinkAction(
    action: EntityLinkAction,
  ): Promise<EntityLinkTarget | void> {
    const key = await getWorkspaceKey(workspaceId);
    switch (action.type) {
      case "create-task": {
        const projectForTask = await pickProjectForNewTask();
        if (!projectForTask) return;
        const project = cache.projects.find((p) => p.id === projectForTask);
        const task = await createTask(
          workspaceId,
          projectForTask,
          key,
          { title: action.title },
          0,
          project?.categorizations,
        );
        cache.upsertTask(task);
        if (!projectIdRef.current) {
          setProjectId(projectForTask);
        }
        return { kind: "task", id: task.id };
      }
      case "create-contact": {
        const contact = await createContact(workspaceId, key, {
          displayName: action.displayName,
        });
        cache.upsertContact(contact);
        return { kind: "contact", id: contact.id };
      }
      case "link-existing":
        return action.target;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  const linkCandidates = useMemo(() => {
    const items: { kind: EntityLinkTarget["kind"]; id: string; label: string }[] =
      [];
    for (const t of cache.tasks) {
      items.push({ kind: "task", id: t.id, label: t.title });
    }
    for (const c of cache.contacts) {
      items.push({ kind: "contact", id: c.id, label: c.displayName });
    }
    for (const n of cache.notes) {
      if (n.id === noteId) continue;
      items.push({ kind: "note", id: n.id, label: n.title });
    }
    for (const p of cache.projects) {
      items.push({ kind: "project", id: p.id, label: p.name });
    }
    return items;
  }, [cache.tasks, cache.contacts, cache.notes, cache.projects, noteId]);

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <InlineTitle
              value={title}
              onChange={setTitle}
              onBlur={flush}
              placeholder="Untitled note"
              disabled={deleting}
              maxLength={500}
              aria-label="Title"
              className="min-w-0 flex-1"
            />
            <DeleteButton
              disabled={deleting}
              busy={deleting}
              dialogTitle="Delete this note?"
              dialogDescription="This permanently deletes the note. This cannot be undone."
              onConfirm={onDelete}
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Tags
            </span>
            <Input
              variant="seamless"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              onBlur={flush}
              placeholder="comma-separated"
              disabled={deleting}
              aria-label="Tags"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Filed under project
              <select
                className="h-8 rounded-lg border border-transparent bg-transparent px-2.5 text-sm text-foreground hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
                value={projectId}
                disabled={deleting}
                onChange={(e) => setProjectId(e.target.value)}
                onBlur={flush}
                aria-label="Filed under project"
              >
                <option value="">None</option>
                {cache.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <EntityColorPicker
              value={color}
              disabled={deleting}
              onChange={setColor}
            />
          </div>

          <TaskBodyEditor
            content={body}
            onChange={setBody}
            disabled={deleting}
            enableEntityLinks
            linkCandidates={linkCandidates}
            onEntityLinkAction={onEntityLinkAction}
            fileAttachments={{
              workspaceId,
              getWorkspaceKey: () => getWorkspaceKey(workspaceId),
              onStorageLimit: (message) => setStorageLimitMessage(message),
            }}
          />
          {storageLimitMessage ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {storageLimitMessage}
            </p>
          ) : null}
          <BacklinksPanel workspaceId={workspaceId} kind="note" id={noteId} />

          <SaveStatus
            status={status}
            savedAt={savedAt}
            onRetry={flush}
          />
        </div>
      )}

      {pendingProjectPick ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose project"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg">
            <p className="text-sm font-medium">{pendingProjectPick.title}</p>
            <ul className="mt-3 max-h-60 space-y-1 overflow-auto">
              {cache.projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => pendingProjectPick.resolve(p.id)}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => pendingProjectPick.resolve(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
