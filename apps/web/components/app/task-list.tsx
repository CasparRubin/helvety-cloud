"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CategorizationPicker } from "@/components/app/categorization-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createTask,
  loadDecryptedTasks,
  saveTaskCategorizationIds,
  type DecryptedTask,
} from "@/lib/vault/tasks";
import {
  deleteProject,
  loadDecryptedProject,
  type DecryptedProject,
} from "@/lib/vault/projects";

type TaskListProps = {
  workspaceId: string;
  projectId: string;
};

export function TaskList({ workspaceId, projectId }: TaskListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [project, setProject] = useState<DecryptedProject | null>(null);
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const [loadedProject, tasksPage] = await Promise.all([
      loadDecryptedProject(workspaceId, projectId, key),
      loadDecryptedTasks(workspaceId, projectId, key, {
        stageId: stageFilter || undefined,
      }),
    ]);
    setProject(loadedProject);
    setTasks(tasksPage.tasks);
  }, [getWorkspaceKey, workspaceId, projectId, stageFilter]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, reload]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy || !project) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        tasks.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
      const created = await createTask(
        workspaceId,
        projectId,
        key,
        { title: trimmed },
        nextOrder,
        project.categorizations,
      );
      setTitle("");
      window.dispatchEvent(new Event("helvety:tasks-changed"));
      router.push(`/app/w/${workspaceId}/p/${projectId}/t/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  async function onDeleteProject() {
    if (busy || !project) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(workspaceId, project);
      window.dispatchEvent(new Event("helvety:projects-changed"));
      router.push(`/app/w/${workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  async function updateTaskIds(
    task: DecryptedTask,
    next: {
      labelId: string | null;
      stageId: string;
      priorityId: string;
    },
  ) {
    if (savingTaskId || busy) return;
    if (
      next.labelId === task.labelId &&
      next.stageId === task.stageId &&
      next.priorityId === task.priorityId
    ) {
      return;
    }
    setSavingTaskId(task.id);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveTaskCategorizationIds(
        workspaceId,
        projectId,
        key,
        task,
        {
          labelId: next.labelId,
          stageId: next.stageId,
          priorityId: next.priorityId,
        },
      );
      if (stageFilter && next.stageId !== stageFilter) {
        setLoading(true);
        await reload();
        setLoading(false);
      } else {
        setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      }
      window.dispatchEvent(new Event("helvety:tasks-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingTaskId(null);
    }
  }

  if (!vault) return null;

  const stages = project
    ? [...project.categorizations.stages].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
      )
    : [];

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {project?.name ?? "Project"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Task titles and bodies are encrypted end-to-end.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/app/w/${workspaceId}/p/${projectId}/settings`}
            className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            Settings
          </Link>
          <DeleteButton
            disabled={busy || loading}
            busy={busy}
            dialogTitle={`Delete project “${project?.name ?? "Project"}”?`}
            dialogDescription="This permanently deletes the project and all of its tasks. This cannot be undone."
            onConfirm={onDeleteProject}
          />
        </div>
      </div>

      <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
          disabled={busy}
          maxLength={500}
          aria-label="Task title"
        />
        <Button type="submit" disabled={busy || !title.trim()} size="sm">
          Create
        </Button>
      </form>

      {stages.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Stage</span>
          <CategorizationPicker
            options={stages}
            value={stageFilter}
            allowNone
            noneLabel="All"
            useStageColor
            disabled={busy}
            aria-label="Filter by stage"
            onChange={(id) => {
              setLoading(true);
              setStageFilter(id);
            }}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No tasks yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((task) => {
            const cats = project?.categorizations;
            const rowBusy = busy || savingTaskId === task.id;
            const stageId = task.stageId ?? "";
            const priorityId = task.priorityId ?? "";
            return (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <Link
                  href={`/app/w/${workspaceId}/p/${projectId}/t/${task.id}`}
                  className="min-w-0 flex-1 font-medium hover:underline"
                >
                  {task.title || "Untitled"}
                </Link>
                {cats ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <CategorizationPicker
                      options={cats.labels}
                      value={task.labelId}
                      allowNone
                      disabled={rowBusy}
                      aria-label={`Label for ${task.title || "task"}`}
                      onChange={(id) =>
                        void updateTaskIds(task, {
                          labelId: id,
                          stageId,
                          priorityId,
                        })
                      }
                    />
                    <CategorizationPicker
                      options={cats.stages}
                      value={stageId || null}
                      useStageColor
                      disabled={rowBusy || !stageId}
                      aria-label={`Stage for ${task.title || "task"}`}
                      onChange={(id) => {
                        if (!id) return;
                        void updateTaskIds(task, {
                          labelId: task.labelId,
                          stageId: id,
                          priorityId,
                        });
                      }}
                    />
                    <CategorizationPicker
                      options={cats.priorities}
                      value={priorityId || null}
                      disabled={rowBusy || !priorityId}
                      aria-label={`Priority for ${task.title || "task"}`}
                      onChange={(id) => {
                        if (!id) return;
                        void updateTaskIds(task, {
                          labelId: task.labelId,
                          stageId,
                          priorityId: id,
                        });
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
