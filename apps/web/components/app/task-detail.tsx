"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { TaskBodyEditor, type EntityLinkAction } from "@/components/app/task-body-editor";
import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { CategorizationPicker } from "@/components/app/categorization-picker";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultEntityCache } from "@/components/vault/vault-entity-cache";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  defaultPriority,
  defaultStage,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import { createContact } from "@/lib/vault/contacts";
import { loadDecryptedProject } from "@/lib/vault/projects";
import {
  EMPTY_TASK_BODY,
  toTaskPlaintext,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";
import {
  createTask,
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
  const cache = useVaultEntityCache();

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
  const upsertTaskRef = useRef(cache.upsertTask);
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
    upsertTaskRef.current = cache.upsertTask;
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
        upsertTaskRef.current(loaded);
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
      upsertTaskRef.current(saved);
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

  async function onEntityLinkAction(
    action: EntityLinkAction,
  ): Promise<EntityLinkTarget | void> {
    const key = await getWorkspaceKey(workspaceId);
    switch (action.type) {
      case "create-task": {
        const project = cache.projects.find((p) => p.id === projectId);
        const created = await createTask(
          workspaceId,
          projectId,
          key,
          { title: action.title },
          0,
          project?.categorizations ?? categorizations ?? undefined,
        );
        cache.upsertTask(created);
        return { kind: "task", id: created.id };
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
      if (t.id === taskId) continue;
      items.push({ kind: "task", id: t.id, label: t.title });
    }
    for (const c of cache.contacts) {
      items.push({ kind: "contact", id: c.id, label: c.displayName });
    }
    for (const n of cache.notes) {
      items.push({ kind: "note", id: n.id, label: n.title });
    }
    for (const p of cache.projects) {
      items.push({ kind: "project", id: p.id, label: p.name });
    }
    return items;
  }, [cache.tasks, cache.contacts, cache.notes, cache.projects, taskId]);

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Task</h1>
          <p className="text-sm text-muted-foreground">
            Select text to create linked tasks or contacts. Edits are encrypted
            on your device before upload.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/app/w/${workspaceId}/p/${projectId}`} />}
          nativeButton={false}
        >
          Back
        </Button>
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
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Label
                <CategorizationPicker
                  options={categorizations.labels}
                  value={labelId}
                  allowNone
                  disabled={deleting}
                  aria-label="Label"
                  onChange={setLabelId}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Stage
                <CategorizationPicker
                  options={categorizations.stages}
                  value={stageId}
                  useStageColor
                  disabled={deleting}
                  aria-label="Stage"
                  onChange={(id) => {
                    if (id) setStageId(id);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Priority
                <CategorizationPicker
                  options={categorizations.priorities}
                  value={priorityId}
                  disabled={deleting}
                  aria-label="Priority"
                  onChange={(id) => {
                    if (id) setPriorityId(id);
                  }}
                />
              </label>
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
          <BacklinksPanel
            workspaceId={workspaceId}
            kind="task"
            id={taskId}
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
