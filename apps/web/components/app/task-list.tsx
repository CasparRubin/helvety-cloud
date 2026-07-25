"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { getProject } from "@/lib/api/v1-client";
import {
  createTask,
  loadDecryptedTasks,
  type DecryptedTask,
} from "@/lib/vault/tasks";
import { decryptProjectName, deleteProject } from "@/lib/vault/projects";

type TaskListProps = {
  workspaceId: string;
  projectId: string;
};

export function TaskList({ workspaceId, projectId }: TaskListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [projectName, setProjectName] = useState<string>("Project");
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);
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
        const [projectRow, tasksPage] = await Promise.all([
          getProject(workspaceId, projectId),
          loadDecryptedTasks(workspaceId, projectId, key),
        ]);
        if (cancelled) return;
        let name = "Untitled project";
        try {
          name = await decryptProjectName(
            key,
            projectId,
            projectRow.encryptedBlob,
          );
        } catch {
          name = "Unable to decrypt";
        }
        setProjectName(name);
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
  }, [vault, workspaceId, projectId, getWorkspaceKey]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
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
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(workspaceId, {
        id: projectId,
        workspaceId,
        name: projectName,
        sortOrder: 0,
        updatedAt: "",
        deletedAt: null,
      });
      window.dispatchEvent(new Event("helvety:projects-changed"));
      router.push(`/app/w/${workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {projectName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Task titles and bodies are encrypted end-to-end.
          </p>
        </div>
        <DeleteButton
          disabled={busy || loading}
          busy={busy}
          dialogTitle={`Delete project “${projectName}”?`}
          dialogDescription="This permanently deletes the project and all of its tasks. This cannot be undone."
          onConfirm={onDeleteProject}
        />
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
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/app/w/${workspaceId}/p/${projectId}/t/${task.id}`}
                className="block rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
              >
                {task.title || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
