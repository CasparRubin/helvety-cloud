"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  defaultPriority,
  defaultStage,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import { loadDecryptedProject } from "@/lib/vault/projects";
import {
  EMPTY_TASK_BODY,
  toTaskPlaintext,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";
import {
  deleteTask,
  loadDecryptedTask,
  saveTask,
  type DecryptedTask,
} from "@/lib/vault/tasks";

const AUTOSAVE_MS = 600;

type TaskDetailProps = {
  workspaceId: string;
  projectId: string;
  taskId: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function TaskDetail({
  workspaceId,
  projectId,
  taskId,
}: TaskDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [task, setTask] = useState<DecryptedTask | null>(null);
  const [categorizations, setCategorizations] =
    useState<ProjectCategorizations | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<TaskBodyDoc>(EMPTY_TASK_BODY);
  const [labelId, setLabelId] = useState<string | null>(null);
  const [stageId, setStageId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const labelIdRef = useRef(labelId);
  const stageIdRef = useRef(stageId);
  const priorityIdRef = useRef(priorityId);
  const taskRef = useRef(task);
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
    labelIdRef.current = labelId;
    stageIdRef.current = stageId;
    priorityIdRef.current = priorityId;
    taskRef.current = task;
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
        const [loaded, project] = await Promise.all([
          loadDecryptedTask(workspaceId, projectId, taskId, key),
          loadDecryptedProject(workspaceId, projectId, key),
        ]);
        if (cancelled) return;
        const cats = project.categorizations;
        const nextStage =
          loaded.stageId &&
          cats.stages.some((s) => s.id === loaded.stageId)
            ? loaded.stageId
            : defaultStage(cats).id;
        const nextPriority =
          loaded.priorityId &&
          cats.priorities.some((p) => p.id === loaded.priorityId)
            ? loaded.priorityId
            : defaultPriority(cats).id;
        const nextLabel =
          loaded.labelId && cats.labels.some((l) => l.id === loaded.labelId)
            ? loaded.labelId
            : null;
        setTask(loaded);
        setCategorizations(cats);
        setTitle(loaded.title);
        setBody(loaded.body);
        setLabelId(nextLabel);
        setStageId(nextStage);
        setPriorityId(nextPriority);
        loadedSnapshotRef.current = snapshot(
          loaded.title,
          loaded.body,
          nextLabel,
          nextStage,
          nextPriority,
        );
        setSaveStatus("idle");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load task");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, taskId, getWorkspaceKey]);

  async function persist() {
    const current = taskRef.current;
    if (!current || deletingRef.current) return;

    const nextTitle = titleRef.current;
    const nextBody = bodyRef.current;
    const nextLabel = labelIdRef.current;
    const nextStage = stageIdRef.current;
    const nextPriority = priorityIdRef.current;
    const snap = snapshot(
      nextTitle,
      nextBody,
      nextLabel,
      nextStage,
      nextPriority,
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
      const saved = await saveTask(
        workspaceId,
        projectId,
        key,
        current,
        toTaskPlaintext(nextTitle, nextBody),
        {
          labelId: nextLabel,
          stageId: nextStage,
          priorityId: nextPriority,
        },
      );
      loadedSnapshotRef.current = snapshot(
        saved.title,
        saved.body,
        saved.labelId,
        saved.stageId ?? nextStage,
        saved.priorityId ?? nextPriority,
      );
      if (!mountedRef.current) return;
      setTask(saved);
      if (
        snapshot(
          titleRef.current,
          bodyRef.current,
          labelIdRef.current,
          stageIdRef.current,
          priorityIdRef.current,
        ) === snap
      ) {
        setTitle(saved.title);
        setBody(saved.body);
        setLabelId(saved.labelId);
        if (saved.stageId) setStageId(saved.stageId);
        if (saved.priorityId) setPriorityId(saved.priorityId);
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
    if (!task || loading) return;
    const snap = snapshot(title, body, labelId, stageId, priorityId);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [
    title,
    body,
    labelId,
    stageId,
    priorityId,
    task,
    loading,
    workspaceId,
    projectId,
  ]);

  useEffect(() => {
    function flushIfDirty() {
      const current = taskRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(
        titleRef.current,
        bodyRef.current,
        labelIdRef.current,
        stageIdRef.current,
        priorityIdRef.current,
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
  }, [workspaceId, projectId, taskId]);

  async function onDelete() {
    if (!task || deleting || savingRef.current) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTask(workspaceId, projectId, task);
      window.dispatchEvent(new Event("helvety:tasks-changed"));
      router.push(`/app/w/${workspaceId}/p/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (!vault) return null;

  const selectClass =
    "h-8 min-w-[8rem] rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Task</h1>
          <p className="text-sm text-muted-foreground">
            Edits are encrypted on your device before upload.
          </p>
        </div>
        <Link
          href={`/app/w/${workspaceId}/p/${projectId}`}
          className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          Back
        </Link>
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

          {categorizations ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Label
                <select
                  className={selectClass}
                  value={labelId ?? ""}
                  disabled={deleting}
                  onChange={(e) =>
                    setLabelId(e.target.value === "" ? null : e.target.value)
                  }
                >
                  <option value="">None</option>
                  {[...categorizations.labels]
                    .sort(
                      (a, b) =>
                        a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
                    )
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Stage
                <select
                  className={selectClass}
                  value={stageId}
                  disabled={deleting}
                  onChange={(e) => setStageId(e.target.value)}
                >
                  {[...categorizations.stages]
                    .sort(
                      (a, b) =>
                        a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
                    )
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Priority
                <select
                  className={selectClass}
                  value={priorityId}
                  disabled={deleting}
                  onChange={(e) => setPriorityId(e.target.value)}
                >
                  {[...categorizations.priorities]
                    .sort(
                      (a, b) =>
                        a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
                    )
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          ) : null}

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
              dialogTitle="Delete this task?"
              dialogDescription="This permanently deletes the task. This cannot be undone."
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
  labelId: string | null,
  stageId: string,
  priorityId: string,
): string {
  return JSON.stringify({ title, body, labelId, stageId, priorityId });
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
