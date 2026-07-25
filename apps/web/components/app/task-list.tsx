"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  defaultStage,
  findOption,
} from "@/lib/vault/categorizations";
import {
  createTask,
  loadDecryptedTasks,
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
  const [stageFilter, setStageFilter] = useState("");

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const [loadedProject, tasksPage] = await Promise.all([
          loadDecryptedProject(workspaceId, projectId, key),
          loadDecryptedTasks(workspaceId, projectId, key, {
            stageId: stageFilter || undefined,
          }),
        ]);
        if (cancelled) return;
        setProject(loadedProject);
        setTasks(tasksPage.tasks);
        setError(null);
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
  }, [vault, workspaceId, projectId, getWorkspaceKey, stageFilter]);

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
          <label htmlFor="stage-filter" className="text-sm text-muted-foreground">
            Stage
          </label>
          <select
            id="stage-filter"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            value={stageFilter}
            onChange={(e) => {
              setLoading(true);
              setStageFilter(e.target.value);
            }}
            disabled={busy}
          >
            <option value="">All</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
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
            const stage =
              findOption(project?.categorizations.stages ?? [], task.stageId) ??
              (project ? defaultStage(project.categorizations) : null);
            const priority = findOption(
              project?.categorizations.priorities ?? [],
              task.priorityId,
            );
            const label = findOption(
              project?.categorizations.labels ?? [],
              task.labelId,
            );
            return (
              <li key={task.id}>
                <Link
                  href={`/app/w/${workspaceId}/p/${projectId}/t/${task.id}`}
                  className="flex items-baseline justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">
                    {task.title || "Untitled"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {[
                      label?.name,
                      stage?.name,
                      priority?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
