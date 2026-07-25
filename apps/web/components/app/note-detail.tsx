"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { EntityChip } from "@/components/app/entity-chip";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import {
  TaskBodyEditor,
  type EntityLinkAction,
} from "@/components/app/task-body-editor";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultEntityCache } from "@/components/vault/vault-entity-cache";
import { useVaultSession } from "@/components/vault/vault-session-provider";
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

const AUTOSAVE_MS = 600;

type NoteDetailProps = {
  workspaceId: string;
  noteId: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pendingProjectPick, setPendingProjectPick] = useState<{
    title: string;
    resolve: (projectId: string | null) => void;
  } | null>(null);

  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const tagsTextRef = useRef(tagsText);
  const projectIdRef = useRef(projectId);
  const colorRef = useRef(color);
  const noteRef = useRef(note);
  const deletingRef = useRef(deleting);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const loadedSnapshotRef = useRef<string | null>(null);
  const getWorkspaceKeyRef = useRef(getWorkspaceKey);
  const mountedRef = useRef(true);
  const persistRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    titleRef.current = title;
    bodyRef.current = body;
    tagsTextRef.current = tagsText;
    projectIdRef.current = projectId;
    colorRef.current = color;
    noteRef.current = note;
    deletingRef.current = deleting;
    getWorkspaceKeyRef.current = getWorkspaceKey;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        loadedSnapshotRef.current = snapshot(
          loaded.title,
          loaded.body,
          loaded.tags.join(", "),
          loaded.projectId ?? "",
          loaded.color,
        );
        setSaveStatus("idle");
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

  async function persist() {
    const current = noteRef.current;
    if (!current || deletingRef.current) return;

    const nextTitle = titleRef.current;
    const nextBody = bodyRef.current;
    const nextTagsText = tagsTextRef.current;
    const nextProjectId = projectIdRef.current;
    const nextColor = colorRef.current;
    const snap = snapshot(
      nextTitle,
      nextBody,
      nextTagsText,
      nextProjectId,
      nextColor,
    );
    if (snap === loadedSnapshotRef.current) {
      if (mountedRef.current) {
        setSaveStatus((s) => (s === "dirty" ? "idle" : s));
      }
      return;
    }

    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    savingRef.current = true;
    if (mountedRef.current) {
      setSaveStatus("saving");
      setError(null);
    }
    try {
      const key = await getWorkspaceKeyRef.current(workspaceId);
      const tags = nextTagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const saved = await saveNote(
        workspaceId,
        key,
        current,
        toNotePlaintext(nextTitle, nextBody, tags, nextColor),
        {
          projectId: nextProjectId || null,
        },
      );
      loadedSnapshotRef.current = snapshot(
        saved.title,
        saved.body,
        saved.tags.join(", "),
        saved.projectId ?? "",
        saved.color,
      );
      if (!mountedRef.current) return;
      setNote(saved);
      cache.upsertNote(saved);
      if (
        snapshot(
          titleRef.current,
          bodyRef.current,
          tagsTextRef.current,
          projectIdRef.current,
          colorRef.current,
        ) === snap
      ) {
        setTitle(saved.title);
        setBody(saved.body);
        setTagsText(saved.tags.join(", "));
        setProjectId(saved.projectId ?? "");
        setColor(saved.color);
      }
      setSavedAt(new Date().toLocaleTimeString());
      setSaveStatus("saved");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        await persist();
      }
    }
  }

  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    if (!note || loading) return;
    const snap = snapshot(title, body, tagsText, projectId, color);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [title, body, tagsText, projectId, color, note, loading, workspaceId]);

  useEffect(() => {
    function flushIfDirty() {
      const current = noteRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(
        titleRef.current,
        bodyRef.current,
        tagsTextRef.current,
        projectIdRef.current,
        colorRef.current,
      );
      if (snap === loadedSnapshotRef.current) return;
      void persistRef.current();
    }

    const onPageHide = () => flushIfDirty();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushIfDirty();
    };
  }, [workspaceId, noteId]);

  async function onDelete() {
    if (!note || deleting || savingRef.current) return;
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
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Note</h1>
        <p className="text-sm text-muted-foreground">
          Select text to create linked tasks or contacts. Edits are encrypted on
          your device before upload.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={deleting}
            maxLength={500}
            aria-label="Title"
          />
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags (comma-separated)"
            disabled={deleting}
            aria-label="Tags"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Filed under project
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={projectId}
                disabled={deleting}
                onChange={(e) => setProjectId(e.target.value)}
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

          {note && note.links.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Linked entities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {note.links.map((link) => (
                  <EntityChip key={`${link.kind}:${link.id}`} {...link} />
                ))}
              </div>
            </div>
          ) : null}

          <TaskBodyEditor
            content={body}
            onChange={setBody}
            disabled={deleting}
            enableEntityLinks
            linkCandidates={linkCandidates}
            onEntityLinkAction={onEntityLinkAction}
          />

          <BacklinksPanel workspaceId={workspaceId} kind="note" id={noteId} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={deleting || saveStatus === "saving"}
              onClick={() => void persist()}
            >
              Save now
            </Button>
            <DeleteButton
              disabled={deleting}
              busy={deleting}
              dialogTitle="Delete this note?"
              dialogDescription="This permanently deletes the note. This cannot be undone."
              onConfirm={onDelete}
            />
            <SaveStatusLabel status={saveStatus} savedAt={savedAt} />
          </div>
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

function snapshot(
  title: string,
  body: TaskBodyDoc,
  tagsText: string,
  projectId: string,
  color: EntityColor | undefined,
): string {
  return JSON.stringify({ title, body, tagsText, projectId, color: color ?? null });
}

function SaveStatusLabel({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: string | null;
}) {
  switch (status) {
    case "idle":
      return null;
    case "dirty":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "saving":
      return <span className="text-xs text-muted-foreground">Saving…</span>;
    case "saved":
      return (
        <span className="text-xs text-muted-foreground">
          {savedAt ? `Saved ${savedAt}` : "Saved"}
        </span>
      );
    case "error":
      return <span className="text-xs text-destructive">Save failed</span>;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
