"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import {
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
  reorderProjects,
  type DecryptedProject,
} from "@/lib/client-crypto/projects";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";

type ProjectListProps = {
  workspaceId: string;
};

export function ProjectList({ workspaceId }: ProjectListProps) {
  const t = useTranslations("projects");
  const tShell = useTranslations("shell");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  const { userKeys, workspaces, getWorkspaceKey } = useCryptoSession();
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
        setError(e instanceof Error ? e.message : t("loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadProjects, t]);

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
      setError(err instanceof Error ? err.message : t("reorderFailed"));
      try {
        await refresh();
      } catch {
        /* keep prior error */
      }
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  return (
    <>
      <PageActions>
        <CreateEntityDialog
          triggerLabel={t("createTitle")}
          dialogTitle={t("createTitle")}
          fieldLabel={tSettings("name")}
          fieldPlaceholder={t("namePlaceholder")}
          fieldMaxLength={120}
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) setNewDescription("");
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-project-description">{t("description")}</Label>
            <Textarea
              id="new-project-description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              disabled={busy}
              rows={3}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title={workspace?.name ?? tShell("workspace")}
        error={error}
        loading={loading}
        loadingLabel={t("loading")}
        empty={!loading && projects.length === 0}
        emptyLabel={t("empty")}
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
                aria-label={t("moveUp")}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || index === projects.length - 1}
                onClick={() => void onReorder(index, "down")}
                aria-label={t("moveDown")}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("projectSettingsFor", { name: project.name })}
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
