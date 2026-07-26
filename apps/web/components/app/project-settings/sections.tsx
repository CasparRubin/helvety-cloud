"use client";

import { useEffect } from "react";

import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import { CategorizationOptionList } from "@/components/app/project-settings/option-list";
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

export function ProjectStagesSettings() {
  const {
    project,
    loading,
    error,
    busy,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetDefault,
    onSetOptionColor,
    onSetOptionIcon,
    onSetMaxVisibleTasks,
    onSetCompletionPercent,
  } = useProjectSettings();

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <CategorizationOptionList
      title="Stages"
      description="Required on tasks. Default is used for new tasks and when deleting an in-use stage. Show limits how many tasks appear before “Show more”. % is the stage’s weight toward project completion (Cancelled is excluded)."
      kind="stages"
      options={project.categorizations.stages}
      showDefault
      busy={busy}
      onAdd={(name) => onAddOption("stages", name)}
      onRename={(id, name) => onRenameOption("stages", id, name)}
      onDelete={(id) => onDeleteOption("stages", id)}
      onReorder={(id, direction) => onReorderOption("stages", id, direction)}
      onSetDefault={(id) => onSetDefault("stages", id)}
      onSetColor={(id, color) => onSetOptionColor(id, color)}
      onSetIcon={(id, icon) => onSetOptionIcon("stages", id, icon)}
      onSetMaxVisibleTasks={onSetMaxVisibleTasks}
      onSetCompletionPercent={onSetCompletionPercent}
    />
  );
}

export function ProjectLabelsSettings() {
  const {
    project,
    loading,
    error,
    busy,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetOptionIcon,
  } = useProjectSettings();

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <CategorizationOptionList
      title="Labels"
      description="Optional on tasks. Delete clears the label on affected tasks."
      kind="labels"
      options={project.categorizations.labels}
      showDefault={false}
      busy={busy}
      onAdd={(name) => onAddOption("labels", name)}
      onRename={(id, name) => onRenameOption("labels", id, name)}
      onDelete={(id) => onDeleteOption("labels", id)}
      onReorder={(id, direction) => onReorderOption("labels", id, direction)}
      onSetIcon={(id, icon) => onSetOptionIcon("labels", id, icon)}
    />
  );
}

export function ProjectPrioritiesSettings() {
  const {
    project,
    loading,
    error,
    busy,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetDefault,
    onSetOptionIcon,
  } = useProjectSettings();

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <CategorizationOptionList
      title="Priorities"
      description="Required on tasks. Default is used for new tasks and when deleting an in-use priority."
      kind="priorities"
      options={project.categorizations.priorities}
      showDefault
      busy={busy}
      onAdd={(name) => onAddOption("priorities", name)}
      onRename={(id, name) => onRenameOption("priorities", id, name)}
      onDelete={(id) => onDeleteOption("priorities", id)}
      onReorder={(id, direction) =>
        onReorderOption("priorities", id, direction)
      }
      onSetDefault={(id) => onSetDefault("priorities", id)}
      onSetIcon={(id, icon) => onSetOptionIcon("priorities", id, icon)}
    />
  );
}

export function ProjectImportSettings() {
  const {
    project,
    siblings,
    loading,
    error,
    busy,
    copyFromId,
    setCopyFromId,
    onCopy,
    ensureSiblingsLoaded,
  } = useProjectSettings();

  useEffect(() => {
    void ensureSiblingsLoaded();
  }, [ensureSiblingsLoaded]);

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Replace this project’s labels, stages, and priorities with a clone from
        another project. Tasks are remapped by matching option names.
      </p>
      <form onSubmit={(e) => void onCopy(e)} className="flex gap-2">
        <select
          className="flex h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={copyFromId}
          onChange={(e) => setCopyFromId(e.target.value)}
          disabled={busy || siblings.length === 0}
          aria-label="Copy categorizations from project"
        >
          <option value="">
            {siblings.length === 0 ? "No other projects" : "Select project…"}
          </option>
          {siblings.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={busy || !copyFromId}>
          Copy
        </Button>
      </form>
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
