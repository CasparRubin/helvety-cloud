"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createMilestone,
  deleteMilestone,
  saveMilestone,
  sortMilestones,
  type DecryptedMilestone,
} from "@/lib/vault/milestones";
import {
  projectPlaintextFrom,
  saveProjectContent,
  type DecryptedProject,
} from "@/lib/vault/projects";
import {
  EMPTY_TASK_BODY,
  taskBodyPlainText,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";
import { cn } from "@/lib/utils";

export type MilestoneFilter = "all" | "none" | string;

export function ProjectDescriptionEditor({
  workspaceId,
  project,
  onProjectChange,
  onError,
}: {
  workspaceId: string;
  project: DecryptedProject;
  onProjectChange: (project: DecryptedProject) => void;
  onError?: (error: string | null) => void;
}) {
  const { getWorkspaceKey } = useVaultSession();
  const [description, setDescription] = useState(project.description);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveDescription() {
    if (busy) return;
    setBusy(true);
    onError?.(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveProjectContent(
        workspaceId,
        key,
        project,
        projectPlaintextFrom(project, { description }),
      );
      onProjectChange(saved);
      setDirty(false);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save description");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">
          Description
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !dirty}
          onClick={() => void saveDescription()}
        >
          Save description
        </Button>
      </div>
      <div className="rounded-md border border-border/60 bg-background">
        <TaskBodyEditor
          content={description}
          compact
          disabled={busy}
          onChange={(doc) => {
            setDescription(doc);
            setDirty(true);
          }}
        />
      </div>
    </div>
  );
}

type ProjectMilestonesPanelProps = {
  workspaceId: string;
  projectId: string;
  milestones: DecryptedMilestone[];
  selectedFilter: MilestoneFilter;
  onSelectFilter: (filter: MilestoneFilter) => void;
  onMilestonesChange: (milestones: DecryptedMilestone[]) => void;
};

export function ProjectMilestonesPanel({
  workspaceId,
  projectId,
  milestones,
  selectedFilter,
  onSelectFilter,
  onMilestonesChange,
}: ProjectMilestonesPanelProps) {
  const { getWorkspaceKey } = useVaultSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onCreateMilestone(e: FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        milestones.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1;
      const created = await createMilestone(
        workspaceId,
        projectId,
        key,
        {
          title: trimmed,
          targetDate: newDate.trim() || null,
        },
        nextOrder,
      );
      onMilestonesChange(sortMilestones([...milestones, created]));
      setNewTitle("");
      setNewDate("");
      setEditingId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveMilestone(
    milestone: DecryptedMilestone,
    next: {
      title: string;
      description: TaskBodyDoc;
      targetDate: string | null;
    },
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveMilestone(
        workspaceId,
        projectId,
        key,
        milestone,
        next,
      );
      onMilestonesChange(
        sortMilestones(milestones.map((m) => (m.id === saved.id ? saved : m))),
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteMilestone(milestone: DecryptedMilestone) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMilestone(workspaceId, projectId, milestone);
      onMilestonesChange(milestones.filter((m) => m.id !== milestone.id));
      if (editingId === milestone.id) setEditingId(null);
      if (selectedFilter === milestone.id) onSelectFilter("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function selectMilestone(id: string) {
    onSelectFilter(selectedFilter === id ? "all" : id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">
          Milestones
        </h2>
        <div className="flex flex-wrap gap-1">
          <FilterChip
            active={selectedFilter === "all"}
            onClick={() => onSelectFilter("all")}
          >
            All
          </FilterChip>
          <FilterChip
            active={selectedFilter === "none"}
            onClick={() =>
              onSelectFilter(selectedFilter === "none" ? "all" : "none")
            }
          >
            Unassigned
          </FilterChip>
        </div>
        <form
          onSubmit={(e) => void onCreateMilestone(e)}
          className="flex flex-col gap-2"
        >
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New milestone"
            disabled={busy}
            maxLength={200}
            aria-label="Milestone title"
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={busy}
              aria-label="Target date"
              className="min-w-0 flex-1"
            />
            <Button type="submit" disabled={busy || !newTitle.trim()}>
              Add
            </Button>
          </div>
        </form>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No milestones yet. Add a timeboxed goal for this project.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
          {milestones.map((m) => (
            <li key={m.id}>
              {editingId === m.id ? (
                <MilestoneEditor
                  milestone={m}
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSave={(next) => void onSaveMilestone(m, next)}
                  onDelete={() => void onDeleteMilestone(m)}
                />
              ) : (
                <MilestoneListItem
                  milestone={m}
                  selected={selectedFilter === m.id}
                  onSelect={() => selectMilestone(m.id)}
                  onEdit={() => setEditingId(m.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1 text-xs transition-colors",
        active
          ? "border-foreground/30 bg-muted font-medium"
          : "border-border/60 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {children}
    </button>
  );
}

function MilestoneListItem({
  milestone,
  selected,
  onSelect,
  onEdit,
}: {
  milestone: DecryptedMilestone;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const preview = taskBodyPlainText(milestone.description ?? EMPTY_TASK_BODY);

  return (
    <div
      className={cn(
        "rounded-md border bg-background",
        selected
          ? "border-foreground/40 ring-1 ring-foreground/15"
          : "border-border/60",
      )}
    >
      <button
        type="button"
        className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-muted/40"
        onClick={onSelect}
        aria-pressed={selected}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{milestone.title}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {milestone.targetDate ?? "No date"}
          </span>
        </div>
        <p
          className={cn(
            "line-clamp-3 text-xs",
            preview
              ? "text-muted-foreground"
              : "italic text-muted-foreground/70",
          )}
        >
          {preview || "No description"}
        </p>
      </button>
      <div className="border-t border-border/40 px-2 py-1">
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function MilestoneEditor({
  milestone,
  busy,
  onCancel,
  onSave,
  onDelete,
}: {
  milestone: DecryptedMilestone;
  busy: boolean;
  onCancel: () => void;
  onSave: (next: {
    title: string;
    description: TaskBodyDoc;
    targetDate: string | null;
  }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [targetDate, setTargetDate] = useState(milestone.targetDate ?? "");
  const [description, setDescription] = useState(
    milestone.description ?? EMPTY_TASK_BODY,
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={busy}
        maxLength={200}
        aria-label="Milestone title"
      />
      <Input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        disabled={busy}
        aria-label="Target date"
      />
      <div className="rounded-md border border-border/60">
        <TaskBodyEditor
          content={description}
          compact
          disabled={busy}
          onChange={setDescription}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || !title.trim()}
          onClick={() =>
            onSave({
              title: title.trim(),
              description,
              targetDate: targetDate.trim() || null,
            })
          }
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <DeleteButton
          disabled={busy}
          busy={busy}
          dialogTitle="Delete this milestone?"
          dialogDescription="Tasks assigned to it will become unassigned. This cannot be undone."
          onConfirm={onDelete}
        />
      </div>
    </div>
  );
}
