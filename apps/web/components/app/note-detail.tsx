"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
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
import {
  loadDecryptedProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";
import {
  loadDecryptedTasks,
  type DecryptedTask,
} from "@/lib/vault/tasks";

const AUTOSAVE_MS = 600;

type NoteDetailProps = {
  workspaceId: string;
  noteId: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function NoteDetail({ workspaceId, noteId }: NoteDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [note, setNote] = useState<DecryptedNote | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<TaskBodyDoc>(EMPTY_NOTE_BODY);
  const [tagsText, setTagsText] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const tagsTextRef = useRef(tagsText);
  const projectIdRef = useRef(projectId);
  const taskIdRef = useRef(taskId);
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
    taskIdRef.current = taskId;
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
        const [loaded, projectsPage] = await Promise.all([
          loadDecryptedNote(workspaceId, noteId, key),
          loadDecryptedProjects(workspaceId, key, { limit: 100 }),
        ]);
        if (cancelled) return;
        setNote(loaded);
        setTitle(loaded.title);
        setBody(loaded.body);
        setTagsText(loaded.tags.join(", "));
        setProjectId(loaded.projectId ?? "");
        setTaskId(loaded.taskId ?? "");
        setProjects(projectsPage.projects);
        loadedSnapshotRef.current = snapshot(
          loaded.title,
          loaded.body,
          loaded.tags.join(", "),
          loaded.projectId ?? "",
          loaded.taskId ?? "",
        );
        setSaveStatus("idle");
        setError(null);
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
  }, [vault, workspaceId, noteId, getWorkspaceKey]);

  useEffect(() => {
    if (!vault || !projectId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedTasks(workspaceId, projectId, key, {
          limit: 100,
        });
        if (cancelled) return;
        setTasks(page.tasks);
      } catch {
        if (!cancelled) setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, getWorkspaceKey]);

  async function persist() {
    const current = noteRef.current;
    if (!current || deletingRef.current) return;

    const nextTitle = titleRef.current;
    const nextBody = bodyRef.current;
    const nextTagsText = tagsTextRef.current;
    const nextProjectId = projectIdRef.current;
    const nextTaskId = taskIdRef.current;
    const snap = snapshot(
      nextTitle,
      nextBody,
      nextTagsText,
      nextProjectId,
      nextTaskId,
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
        toNotePlaintext(nextTitle, nextBody, tags),
        {
          projectId: nextProjectId || null,
          taskId: nextTaskId || null,
        },
      );
      loadedSnapshotRef.current = snapshot(
        saved.title,
        saved.body,
        saved.tags.join(", "),
        saved.projectId ?? "",
        saved.taskId ?? "",
      );
      if (!mountedRef.current) return;
      setNote(saved);
      if (
        snapshot(
          titleRef.current,
          bodyRef.current,
          tagsTextRef.current,
          projectIdRef.current,
          taskIdRef.current,
        ) === snap
      ) {
        setTitle(saved.title);
        setBody(saved.body);
        setTagsText(saved.tags.join(", "));
        setProjectId(saved.projectId ?? "");
        setTaskId(saved.taskId ?? "");
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
    const snap = snapshot(title, body, tagsText, projectId, taskId);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [title, body, tagsText, projectId, taskId, note, loading, workspaceId]);

  useEffect(() => {
    function flushIfDirty() {
      const current = noteRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(
        titleRef.current,
        bodyRef.current,
        tagsTextRef.current,
        projectIdRef.current,
        taskIdRef.current,
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

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Note</h1>
        <p className="text-sm text-muted-foreground">
          Edits are encrypted on your device before upload.
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
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Project link
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={projectId}
                disabled={deleting}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId("");
                }}
                aria-label="Linked project"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Task link
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={taskId}
                disabled={deleting || !projectId}
                onChange={(e) => setTaskId(e.target.value)}
                aria-label="Linked task"
              >
                <option value="">None</option>
                {(!projectId ? [] : tasks).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <TaskBodyEditor
            content={body}
            onChange={setBody}
            disabled={deleting}
          />
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
  taskId: string,
): string {
  return JSON.stringify({ title, body, tagsText, projectId, taskId });
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
