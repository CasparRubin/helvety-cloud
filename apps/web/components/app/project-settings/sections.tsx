"use client";

import { CategorizationIconPicker } from "@/components/app/categorization-icon-picker";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import { useProjectSettings } from "@/components/app/project-settings/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EntityColor } from "@/lib/client-crypto/entity-colors";

function SettingsStatus({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (empty) {
    return (
      <p className="text-sm text-muted-foreground">
        This project is unavailable or you no longer have access to it.
      </p>
    );
  }
  return null;
}

export function ProjectGeneralSettings() {
  const {
    project,
    loading,
    error,
    busy,
    nameDraft,
    setNameDraft,
    onRename,
    onSetColor,
    onSetIcon,
  } = useProjectSettings();

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Project identity</h2>
        <p className="text-sm text-muted-foreground">
          Update how this project appears in navigation and task views. Task
          stages, labels, and priorities are managed at the workspace level.
        </p>
      </div>
      <form onSubmit={(e) => void onRename(e)} className="flex gap-2">
        <Input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          disabled={busy}
          maxLength={200}
          aria-label="Project name"
        />
        <Button
          type="submit"
          disabled={
            busy || !nameDraft.trim() || nameDraft.trim() === project.name
          }
        >
          Save
        </Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">Icon</span>
          <CategorizationIconPicker
            value={project.icon}
            disabled={busy}
            onChange={(next) => {
              void onSetIcon(next);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Optional marker shown beside the project name.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">
            Accent color
          </span>
          <EntityColorPicker
            value={project.color}
            disabled={busy}
            onChange={(next: EntityColor | undefined) => {
              void onSetColor(next);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Helps the project stand out in lists and headers.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProjectDangerSettings() {
  const { project, loading, error, busy, onDeleteProject } =
    useProjectSettings();

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <section className="flex max-w-lg flex-col gap-3 rounded-xl border border-destructive/30 p-5">
      <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
      <p className="text-xs leading-5 text-muted-foreground">
        Permanently delete this project, all of its tasks and milestones, and
        files on those tasks. Notes and contacts stay in the workspace. This
        cannot be undone. Helvety cannot recover deleted data.
      </p>
      <DeleteButton
        label="Delete project"
        disabled={busy}
        busy={busy}
        dialogTitle={`Delete project “${project.name}”?`}
        dialogDescription="This permanently deletes the project, all of its tasks and milestones, and files on those tasks. Notes and contacts stay in the workspace. This cannot be undone."
        onConfirm={onDeleteProject}
      />
    </section>
  );
}
