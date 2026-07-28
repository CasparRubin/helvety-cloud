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
      <p className="text-sm text-muted-foreground">Project not found.</p>
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
      <CategorizationIconPicker
        value={project.icon}
        disabled={busy}
        onChange={(next) => {
          void onSetIcon(next);
        }}
      />
      <EntityColorPicker
        value={project.color}
        disabled={busy}
        onChange={(next: EntityColor | undefined) => {
          void onSetColor(next);
        }}
      />
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
    <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-destructive/30 p-4">
      <p className="text-xs text-muted-foreground">
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
    </div>
  );
}
