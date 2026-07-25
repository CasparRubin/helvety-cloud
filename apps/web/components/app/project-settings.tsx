"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  addCategorizationOption,
  copyProjectCategorizations,
  deleteCategorizationOption,
  renameCategorizationOption,
  reorderCategorizationOption,
  setCategorizationDefault,
  setCategorizationOptionColor,
} from "@/lib/vault/categorization-ops";
import type {
  CategorizationKind,
  CategorizationOption,
} from "@/lib/vault/categorizations";
import type { EntityColor } from "@/lib/vault/entity-colors";
import {
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

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-8 p-6">
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
        <Link
          href={`/app/w/${workspaceId}/p/${projectId}`}
          className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          Back
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : project ? (
        <>
          <section className="flex max-w-lg flex-col gap-3">
            <h2 className="text-sm font-medium">Name</h2>
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
                size="sm"
                disabled={
                  busy ||
                  !nameDraft.trim() ||
                  nameDraft.trim() === project.name
                }
              >
                Save
              </Button>
            </form>
          </section>

          <section className="flex max-w-lg flex-col gap-3">
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
          </section>

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
          />

          <OptionList
            title="Stages"
            description="Required on tasks. Default is used for new tasks and when deleting an in-use stage."
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
          />

          <section className="flex max-w-lg flex-col gap-3">
            <h2 className="text-sm font-medium">Copy categorizations</h2>
            <p className="text-sm text-muted-foreground">
              Replace this project’s labels, stages, and priorities with a clone
              from another project. Tasks are remapped by matching option names.
            </p>
            <form onSubmit={(e) => void onCopy(e)} className="flex gap-2">
              <select
                className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
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
              <Button
                type="submit"
                size="sm"
                disabled={busy || !copyFromId}
              >
                Copy
              </Button>
            </form>
          </section>
        </>
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
}) {
  const [newName, setNewName] = useState("");
  const sorted = [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const canDelete =
    kind === "labels" || sorted.length > 1;

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {sorted.map((opt, index) => (
          <li
            key={opt.id}
            className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
          >
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
            {onSetColor ? (
              <EntityColorPicker
                compact
                value={opt.color}
                disabled={busy}
                onChange={(color) => void onSetColor(opt.id, color)}
              />
            ) : null}
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
        <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
          Add
        </Button>
      </form>
    </section>
  );
}
