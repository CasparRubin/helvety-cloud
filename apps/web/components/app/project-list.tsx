"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SettingsIcon } from "lucide-react";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { PageActions } from "@/components/app/page-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createProject,
  loadDecryptedProjects,
  reorderProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";
import { textToTaskBody } from "@/lib/vault/task-plaintext";

type ProjectListProps = {
  workspaceId: string;
};

export function ProjectList({ workspaceId }: ProjectListProps) {
  const { vault, workspaces, getWorkspaceKey } = useVaultSession();
  const workspace = workspaces.find((w) => w.id === workspaceId);

  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  const loadProjects = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    return loadDecryptedProjects(workspaceId, key);
  }, [getWorkspaceKey, workspaceId]);

  const refresh = useCallback(async () => {
    const page = await loadProjects();
    setProjects(page.projects);
    setError(null);
  }, [loadProjects]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await loadProjects();
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
  }, [vault, loadProjects]);

  async function onCreate(name: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        projects.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
      const description = newDescription.trim();
      await createProject(workspaceId, key, name, nextOrder, {
        description: description ? textToTaskBody(description) : undefined,
      });
      await refresh();
      window.dispatchEvent(new Event("helvety:projects-changed"));
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

  if (!vault) return null;

  return (
    <>
      <PageActions>
        <CreateEntityDialog
          triggerLabel="Create project"
          dialogTitle="Create project"
          fieldLabel="Name"
          fieldPlaceholder="New project name"
          fieldMaxLength={120}
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) setNewDescription("");
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-project-description">Description</Label>
            <Textarea
              id="new-project-description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Add a project description…"
              disabled={busy}
              rows={3}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>
      <EntityListShell
        title={workspace?.name ?? "Workspace"}
        error={error}
        loading={loading}
        loadingLabel="Loading projects…"
        empty={!loading && projects.length === 0}
        emptyLabel="No projects yet."
      >
        {projects.map((project, index) => (
          <EntityListRow
            key={project.id}
            className="flex items-center gap-2"
          >
            <Link
              href={`/app/w/${workspaceId}/p/${project.id}`}
              className="min-w-0 flex-1 truncate font-medium hover:underline"
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
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Project settings for ${project.name}`}
                render={
                  <Link
                    href={`/app/w/${workspaceId}/p/${project.id}/settings/general`}
                  />
                }
                nativeButton={false}
              >
                <SettingsIcon className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </EntityListRow>
        ))}
      </EntityListShell>
    </>
  );
}
