"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PinIcon, SettingsIcon } from "lucide-react";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { ListSearchInput } from "@/components/app/list-search-input";
import {
  ListRefreshButton,
  PageActions,
  WorkspaceSettingsAction,
} from "@/components/app/page-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createProject,
  loadDecryptedProjects,
  reorderPinnedProjects,
  reorderProjects,
  setProjectPinned,
  sortProjectsForDisplay,
  type DecryptedProject,
} from "@/lib/client-crypto/projects";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";
import { matchesQuery } from "@/lib/list-search";

type ProjectListProps = {
  workspaceId: string;
};

export function ProjectList({ workspaceId }: ProjectListProps) {
  const router = useRouter();
  const { userKeys, workspaces, getWorkspaceKey } = useCryptoSession();
  const workspace = workspaces.find((w) => w.id === workspaceId);

  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const loadProjects = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    return loadDecryptedProjects(workspaceId, key);
  }, [getWorkspaceKey, workspaceId]);

  const refresh = useCallback(async () => {
    const page = await loadProjects();
    setProjects(page.projects);
    setError(null);
  }, [loadProjects]);

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [refresh]);

  useEffect(() => {
    if (!userKeys) return;
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
  }, [userKeys, loadProjects]);

  async function onCreate(name: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        projects.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;
      const description = newDescription.trim();
      const created = await createProject(workspaceId, key, name, nextOrder, {
        description: description ? textToTaskBody(description) : undefined,
      });
      window.dispatchEvent(new Event("helvety:projects-changed"));
      router.push(`/app/w/${workspaceId}/p/${created.id}`);
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

  async function onTogglePinned(project: DecryptedProject) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const updated = await setProjectPinned(
        workspaceId,
        key,
        projects,
        project,
        !project.isPinned,
      );
      setProjects((current) =>
        sortProjectsForDisplay(
          current.map((item) => (item.id === updated.id ? updated : item)),
        ),
      );
      window.dispatchEvent(new Event("helvety:projects-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pin update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReorderPinned(
    projectId: string,
    direction: "up" | "down",
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const next = await reorderPinnedProjects(
        workspaceId,
        key,
        projects,
        projectId,
        direction,
      );
      setProjects(next);
      window.dispatchEvent(new Event("helvety:projects-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pinned reorder failed");
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  const filtering = deferredQuery.trim().length > 0;
  const filteredProjects = sortProjectsForDisplay(
    projects.filter((p) => matchesQuery([p.name], deferredQuery)),
  );
  const pinnedProjects = filteredProjects.filter((project) => project.isPinned);
  const pinnedIndexById = new Map(
    pinnedProjects.map((project, index) => [project.id, index]),
  );

  return (
    <>
      <ListRefreshButton disabled={busy} onRefresh={handleRefresh} />
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
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title={workspace?.name ?? "Workspace"}
        belowTitle={
          <ListSearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Filter projects…"
            disabled={loading || projects.length === 0}
          />
        }
        error={error}
        loading={loading}
        loadingLabel="Loading projects…"
        empty={
          !loading &&
          (projects.length === 0 ||
            (filtering && filteredProjects.length === 0))
        }
        emptyLabel={
          projects.length === 0 ? "No projects yet." : "No matching projects."
        }
      >
        {filteredProjects.map((project, index) => (
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
                disabled={busy}
                onClick={() => void onTogglePinned(project)}
                aria-label={project.isPinned ? "Unpin project" : "Pin project"}
              >
                <PinIcon
                  className="size-4"
                  aria-hidden="true"
                  fill={project.isPinned ? "currentColor" : "none"}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  busy ||
                  filtering ||
                  !project.isPinned ||
                  (pinnedIndexById.get(project.id) ?? 0) === 0
                }
                onClick={() => void onReorderPinned(project.id, "up")}
                aria-label="Move pin up"
              >
                ⇡
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  busy ||
                  filtering ||
                  !project.isPinned ||
                  (pinnedIndexById.get(project.id) ?? -1) ===
                    pinnedProjects.length - 1
                }
                onClick={() => void onReorderPinned(project.id, "down")}
                aria-label="Move pin down"
              >
                ⇣
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || filtering || index === 0}
                onClick={() => void onReorder(index, "up")}
                aria-label="Move up"
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  busy || filtering || index === filteredProjects.length - 1
                }
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
