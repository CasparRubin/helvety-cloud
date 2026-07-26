"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  if (loading) {
    return <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>;
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
      <p className="text-sm text-muted-foreground">{t("projectNotFound")}</p>
    );
  }
  return null;
}

export function ProjectGeneralSettings() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
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
          aria-label={t("projectNameAria")}
        />
        <Button
          type="submit"
          disabled={
            busy || !nameDraft.trim() || nameDraft.trim() === project.name
          }
        >
          {tCommon("save")}
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
  const t = useTranslations("settings");
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
      title={t("stagesTitle")}
      description={t("stagesDescription")}
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
  const t = useTranslations("settings");
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
      title={t("labelsTitle")}
      description={t("labelsDescription")}
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
  const t = useTranslations("settings");
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
      title={t("prioritiesTitle")}
      description={t("prioritiesDescription")}
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
  const t = useTranslations("settings");
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
      <p className="text-sm text-muted-foreground">{t("importDescription")}</p>
      <form onSubmit={(e) => void onCopy(e)} className="flex gap-2">
        <select
          className="flex h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={copyFromId}
          onChange={(e) => setCopyFromId(e.target.value)}
          disabled={busy || siblings.length === 0}
          aria-label={t("copyFromProjectAria")}
        >
          <option value="">
            {siblings.length === 0
              ? t("noOtherProjects")
              : t("selectProject")}
          </option>
          {siblings.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={busy || !copyFromId}>
          {t("copy")}
        </Button>
      </form>
    </div>
  );
}

export function ProjectDangerSettings() {
  const t = useTranslations("settings");
  const { project, loading, error, busy, onDeleteProject } =
    useProjectSettings();

  const status = (
    <SettingsStatus loading={loading} error={error} empty={!project} />
  );
  if (loading || error || !project) return status;

  return (
    <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-destructive/30 p-4">
      <p className="text-xs text-muted-foreground">
        {t("deleteProjectWarning")}
      </p>
      <DeleteButton
        label={t("deleteProject")}
        disabled={busy}
        busy={busy}
        dialogTitle={t("deleteProjectTitle", { name: project.name })}
        dialogDescription={t("deleteProjectDescription")}
        onConfirm={onDeleteProject}
      />
    </div>
  );
}
