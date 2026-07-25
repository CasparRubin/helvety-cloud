"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CategorizationIconPicker } from "@/components/app/categorization-icon-picker";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  addCategorizationOption,
  copyProjectCategorizations,
  deleteCategorizationOption,
  renameCategorizationOption,
  reorderCategorizationOption,
  setCategorizationDefault,
  setCategorizationOptionColor,
  setCategorizationOptionIcon,
  setCategorizationOptionMaxVisibleTasks,
} from "@/lib/vault/categorization-ops";
import {
  MAX_MAX_VISIBLE_TASKS,
  MIN_MAX_VISIBLE_TASKS,
  resolveMaxVisibleTasks,
  type CategorizationIcon,
  type CategorizationKind,
  type CategorizationOption,
} from "@/lib/vault/categorizations";
import type { EntityColor } from "@/lib/vault/entity-colors";
import {
  deleteProject,
  loadDecryptedProject,
  loadDecryptedProjects,
  renameProject,
  saveProjectContent,
  type DecryptedProject,
} from "@/lib/vault/projects";

type ProjectSettingsProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectSettings({
  workspaceId,
  projectId,
}: ProjectSettingsProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [project, setProject] = useState<DecryptedProject | null>(null);
  const [siblings, setSiblings] = useState<DecryptedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [copyFromId, setCopyFromId] = useState("");

  const reload = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const [loaded, page] = await Promise.all([
      loadDecryptedProject(workspaceId, projectId, key),
      loadDecryptedProjects(workspaceId, key),
    ]);
    setProject(loaded);
    setNameDraft(loaded.name);
    setSiblings(page.projects.filter((p) => p.id !== projectId));
  }, [getWorkspaceKey, workspaceId, projectId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load project");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, reload]);

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === project.name) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await renameProject(workspaceId, key, project, trimmed);
      setProject(saved);
      setNameDraft(saved.name);
      window.dispatchEvent(new Event("helvety:projects-changed"));
    });
  }

  async function onCopy(e: React.FormEvent) {
    e.preventDefault();
    if (!copyFromId) return;
    await withBusy(async () => {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await copyProjectCategorizations(
        workspaceId,
        key,
        copyFromId,
        projectId,
      );
      setProject(saved);
      setCopyFromId("");
    });
  }

  async function onDeleteProject() {
    if (busy || !project) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(workspaceId, project);
      window.dispatchEvent(new Event("helvety:projects-changed"));
      router.push(`/app/w/${workspaceId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-8 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Project settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Categorization names are encrypted. Option ids on tasks are
            plaintext metadata for filtering.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/app/w/${workspaceId}/p/${projectId}`} />}
          nativeButton={false}
        >
          Back
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : project ? (
        <FieldGroup className="max-w-2xl gap-8">
          <FieldSet>
            <FieldLegend>General</FieldLegend>
            <div className="flex flex-col gap-4 pt-2">
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
                    busy ||
                    !nameDraft.trim() ||
                    nameDraft.trim() === project.name
                  }
                >
                  Save
                </Button>
              </form>
              <EntityColorPicker
                value={project.color}
                disabled={busy}
                onChange={(next: EntityColor | undefined) => {
                  void withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    const saved = await saveProjectContent(
                      workspaceId,
                      key,
                      project,
                      {
                        name: project.name,
                        categorizations: project.categorizations,
                        ...(next ? { color: next } : {}),
                      },
                    );
                    setProject(saved);
                  });
                }}
              />
            </div>
          </FieldSet>

          <Separator />

          <FieldSet>
            <FieldLegend>Categorizations</FieldLegend>
            <FieldDescription>
              Labels, stages, and priorities for this project’s tasks.
            </FieldDescription>
            <div className="flex flex-col gap-8 pt-4">
              <OptionList
                title="Stages"
                description="Required on tasks. Default is used for new tasks and when deleting an in-use stage. Show limits how many tasks appear in a stage before “Show more”."
                kind="stages"
                options={project.categorizations.stages}
                showDefault
                busy={busy}
                onAdd={(name) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await addCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        name,
                      ),
                    );
                  })
                }
                onRename={(id, name) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await renameCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        id,
                        name,
                      ),
                    );
                  })
                }
                onDelete={(id) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await deleteCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        id,
                      ),
                    );
                  })
                }
                onReorder={(id, direction) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await reorderCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        id,
                        direction,
                      ),
                    );
                  })
                }
                onSetDefault={(id) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationDefault(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        id,
                      ),
                    );
                  })
                }
                onSetColor={(id, color) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationOptionColor(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        id,
                        color ?? null,
                      ),
                    );
                  })
                }
                onSetIcon={(id, icon) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationOptionIcon(
                        workspaceId,
                        key,
                        project,
                        "stages",
                        id,
                        icon ?? null,
                      ),
                    );
                  })
                }
                onSetMaxVisibleTasks={(id, maxVisibleTasks) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationOptionMaxVisibleTasks(
                        workspaceId,
                        key,
                        project,
                        id,
                        maxVisibleTasks,
                      ),
                    );
                  })
                }
              />

              <OptionList
                title="Labels"
                description="Optional on tasks. Delete clears the label on affected tasks."
                kind="labels"
                options={project.categorizations.labels}
                showDefault={false}
                busy={busy}
                onAdd={(name) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await addCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "labels",
                        name,
                      ),
                    );
                  })
                }
                onRename={(id, name) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await renameCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "labels",
                        id,
                        name,
                      ),
                    );
                  })
                }
                onDelete={(id) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await deleteCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "labels",
                        id,
                      ),
                    );
                  })
                }
                onReorder={(id, direction) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await reorderCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "labels",
                        id,
                        direction,
                      ),
                    );
                  })
                }
                onSetIcon={(id, icon) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationOptionIcon(
                        workspaceId,
                        key,
                        project,
                        "labels",
                        id,
                        icon ?? null,
                      ),
                    );
                  })
                }
              />

              <OptionList
                title="Priorities"
                description="Required on tasks. Default is used for new tasks and when deleting an in-use priority."
                kind="priorities"
                options={project.categorizations.priorities}
                showDefault
                busy={busy}
                onAdd={(name) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await addCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "priorities",
                        name,
                      ),
                    );
                  })
                }
                onRename={(id, name) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await renameCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "priorities",
                        id,
                        name,
                      ),
                    );
                  })
                }
                onDelete={(id) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await deleteCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "priorities",
                        id,
                      ),
                    );
                  })
                }
                onReorder={(id, direction) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await reorderCategorizationOption(
                        workspaceId,
                        key,
                        project,
                        "priorities",
                        id,
                        direction,
                      ),
                    );
                  })
                }
                onSetDefault={(id) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationDefault(
                        workspaceId,
                        key,
                        project,
                        "priorities",
                        id,
                      ),
                    );
                  })
                }
                onSetIcon={(id, icon) =>
                  withBusy(async () => {
                    const key = await getWorkspaceKey(workspaceId);
                    setProject(
                      await setCategorizationOptionIcon(
                        workspaceId,
                        key,
                        project,
                        "priorities",
                        id,
                        icon ?? null,
                      ),
                    );
                  })
                }
              />
            </div>
          </FieldSet>

          <Separator />

          <FieldSet>
            <FieldLegend>Import</FieldLegend>
            <FieldDescription>
              Replace this project’s labels, stages, and priorities with a clone
              from another project. Tasks are remapped by matching option names.
            </FieldDescription>
            <form
              onSubmit={(e) => void onCopy(e)}
              className="flex gap-2 pt-2"
            >
              <select
                className="flex h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={copyFromId}
                onChange={(e) => setCopyFromId(e.target.value)}
                disabled={busy || siblings.length === 0}
                aria-label="Copy categorizations from project"
              >
                <option value="">
                  {siblings.length === 0
                    ? "No other projects"
                    : "Select project…"}
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
          </FieldSet>

          <Separator />

          <FieldSet>
            <FieldLegend className="text-destructive">Danger zone</FieldLegend>
            <FieldDescription>
              Permanently delete this project and all of its tasks. This cannot
              be undone. Helvety cannot recover deleted vault data.
            </FieldDescription>
            <div className="pt-2">
              <DeleteButton
                label="Delete project"
                variant="destructive"
                disabled={busy}
                busy={busy}
                dialogTitle={`Delete project “${project.name}”?`}
                dialogDescription="This permanently deletes the project and all of its tasks. This cannot be undone."
                onConfirm={onDeleteProject}
              />
            </div>
          </FieldSet>
        </FieldGroup>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function OptionList({
  title,
  description,
  kind,
  options,
  showDefault,
  busy,
  onAdd,
  onRename,
  onDelete,
  onReorder,
  onSetDefault,
  onSetColor,
  onSetIcon,
  onSetMaxVisibleTasks,
}: {
  title: string;
  description: string;
  kind: CategorizationKind;
  options: CategorizationOption[];
  showDefault: boolean;
  busy: boolean;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (id: string, direction: "up" | "down") => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  onSetColor?: (id: string, color: EntityColor | undefined) => Promise<void>;
  onSetIcon?: (id: string, icon: CategorizationIcon | undefined) => Promise<void>;
  onSetMaxVisibleTasks?: (id: string, maxVisibleTasks: number) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const sorted = [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const canDelete = kind === "labels" || sorted.length > 1;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {sorted.map((opt, index) => (
          <li
            key={opt.id}
            className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                defaultValue={opt.name}
                disabled={busy}
                className="min-w-[10rem] flex-1"
                aria-label={`${title} name`}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== opt.name) {
                    void onRename(opt.id, next);
                  } else {
                    e.target.value = opt.name;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              {onSetIcon ? (
                <CategorizationIconPicker
                  compact
                  value={opt.icon}
                  disabled={busy}
                  onChange={(icon) => void onSetIcon(opt.id, icon)}
                />
              ) : null}
              {onSetColor ? (
                <EntityColorPicker
                  compact
                  value={opt.color}
                  disabled={busy}
                  onChange={(color) => void onSetColor(opt.id, color)}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showDefault ? (
                <Button
                  type="button"
                  size="sm"
                  variant={opt.isDefault ? "secondary" : "ghost"}
                  disabled={busy || !!opt.isDefault}
                  onClick={() => void onSetDefault?.(opt.id)}
                >
                  {opt.isDefault ? "Default" : "Set default"}
                </Button>
              ) : null}
              {onSetMaxVisibleTasks ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Show</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MIN_MAX_VISIBLE_TASKS}
                    max={MAX_MAX_VISIBLE_TASKS}
                    defaultValue={resolveMaxVisibleTasks(opt)}
                    disabled={busy}
                    className="h-8 w-16 tabular-nums"
                    aria-label={`Max visible tasks for ${opt.name}`}
                    onBlur={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      const current = resolveMaxVisibleTasks(opt);
                      if (
                        !Number.isInteger(parsed) ||
                        parsed < MIN_MAX_VISIBLE_TASKS ||
                        parsed > MAX_MAX_VISIBLE_TASKS
                      ) {
                        e.target.value = String(current);
                        return;
                      }
                      if (parsed !== current) {
                        void onSetMaxVisibleTasks(opt.id, parsed);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </label>
              ) : null}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === 0}
                  onClick={() => void onReorder(opt.id, "up")}
                  aria-label="Move up"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || index === sorted.length - 1}
                  onClick={() => void onReorder(opt.id, "down")}
                  aria-label="Move down"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || !canDelete}
                  onClick={() => void onDelete(opt.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = newName.trim();
          if (!trimmed) return;
          void onAdd(trimmed).then(() => setNewName(""));
        }}
      >
        <Label className="sr-only" htmlFor={`add-${kind}`}>
          Add {title.toLowerCase()}
        </Label>
        <Input
          id={`add-${kind}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`Add ${title.toLowerCase().replace(/s$/, "")}`}
          disabled={busy}
          maxLength={80}
        />
        <Button type="submit" disabled={busy || !newName.trim()}>
          Add
        </Button>
      </form>
    </section>
  );
}
