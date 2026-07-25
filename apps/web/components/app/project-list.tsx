"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createProject,
  deleteProject,
  loadDecryptedProjects,
  reorderProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";

type ProjectListProps = {
  workspaceId: string;
};

export function ProjectList({ workspaceId }: ProjectListProps) {
  const { vault, workspaces, getWorkspaceKey } = useVaultSession();
  const workspace = workspaces.find((w) => w.id === workspaceId);

  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const page = await loadDecryptedProjects(workspaceId, key);
    setProjects(page.projects);
    setError(null);
  }, [getWorkspaceKey, workspaceId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedProjects(workspaceId, key);
        if (cancelled) return;
        setProjects(page.projects);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load projects");
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
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        projects.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
      await createProject(workspaceId, key, trimmed, nextOrder);
      setName("");
      await refresh();
      window.dispatchEvent(new Event("helvety:projects-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReorder(index: number, direction: "up" | "down") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const next = await reorderProjects(
        workspaceId,
        key,
        projects,
        index,
        direction,
      );
      setProjects(next);
      window.dispatchEvent(new Event("helvety:projects-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      try {
        await refresh();
      } catch {
        /* keep prior error */
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(project: DecryptedProject) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(workspaceId, project);
      await refresh();
      window.dispatchEvent(new Event("helvety:projects-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {workspace?.name ?? "Workspace"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Projects are encrypted on your device. Helvety only stores ciphertext.
        </p>
      </div>

      <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name"
          disabled={busy}
          maxLength={120}
          aria-label="Project name"
        />
        <Button type="submit" disabled={busy || !name.trim()} size="sm">
          Create
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No projects yet. Create one to add encrypted issues.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {projects.map((project, index) => (
            <li
              key={project.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <Link
                href={`/app/w/${workspaceId}/p/${project.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
              >
                {project.name}
              </Link>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || index === 0}
                  onClick={() => void onReorder(index, "up")}
                  aria-label="Move up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || index === projects.length - 1}
                  onClick={() => void onReorder(index, "down")}
                  aria-label="Move down"
                >
                  ↓
                </Button>
                <DeleteButton
                  disabled={busy}
                  busy={busy}
                  dialogTitle={`Delete project “${project.name}”?`}
                  dialogDescription="This permanently deletes the project and all of its issues. This cannot be undone."
                  onConfirm={() => onDelete(project)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
