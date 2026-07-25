"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { InlineTitle } from "@/components/app/inline-title";
import { SaveStatus } from "@/components/app/save-status";
import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  createMilestone,
  deleteMilestone,
  saveMilestone,
  sortMilestones,
  type DecryptedMilestone,
} from "@/lib/vault/milestones";
import {
  projectPlaintextFrom,
  renameProject,
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

export function ProjectTitleEditor({
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
  const [name, setName] = useState(project.name);
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  });

  const { flush } = useAutosave({
    draft: name,
    enabled: true,
    save: async (next) => {
      const trimmed = next.trim();
      if (!trimmed) {
        throw new Error("Project name cannot be empty");
      }
      const key = await getWorkspaceKey(workspaceId);
      const saved = await renameProject(
        workspaceId,
        key,
        projectRef.current,
        trimmed,
      );
      onProjectChange(saved);
      window.dispatchEvent(new Event("helvety:projects-changed"));
      return saved.name;
    },
    onError: (message) => onError?.(message),
    onSaved: (canonical) => {
      setName(canonical);
      onError?.(null);
    },
  });

  return (
    <InlineTitle
      value={name}
      onChange={setName}
      onBlur={flush}
      placeholder="Untitled project"
      maxLength={200}
      aria-label="Project name"
      className="text-lg"
    />
  );
}

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
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  });

  const { status, savedAt, flush } = useAutosave({
    draft: description,
    enabled: true,
    save: async (next) => {
      const key = await getWorkspaceKey(workspaceId);
      const current = projectRef.current;
      const saved = await saveProjectContent(
        workspaceId,
        key,
        current,
        projectPlaintextFrom(current, { description: next }),
      );
      onProjectChange(saved);
      return saved.description;
    },
    onError: (message) => onError?.(message),
    onSaved: (canonical) => {
      setDescription(canonical);
      onError?.(null);
    },
  });

  return (
    <div className="flex flex-col gap-1">
      <TaskBodyEditor
        content={description}
        compact
        placeholder="Add a project description…"
        onChange={setDescription}
      />
      <SaveStatus status={status} savedAt={savedAt} onRetry={flush} />
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
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
          {milestones.map((m) => (
            <li key={m.id}>
              {editingId === m.id ? (
                <MilestoneEditor
                  workspaceId={workspaceId}
                  projectId={projectId}
                  milestone={m}
                  onUpdated={(saved) => {
                    onMilestonesChange(
                      sortMilestones(
                        milestones.map((item) =>
                          item.id === saved.id ? saved : item,
                        ),
                      ),
                    );
                  }}
                  onDone={() => setEditingId(null)}
                  onDelete={() => void onDeleteMilestone(m)}
                  onError={setError}
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

type MilestoneDraft = {
  title: string;
  description: TaskBodyDoc;
  targetDate: string;
};

function MilestoneEditor({
  workspaceId,
  projectId,
  milestone,
  onUpdated,
  onDone,
  onDelete,
  onError,
}: {
  workspaceId: string;
  projectId: string;
  milestone: DecryptedMilestone;
  onUpdated: (milestone: DecryptedMilestone) => void;
  onDone: () => void;
  onDelete: () => void;
  onError?: (error: string | null) => void;
}) {
  const { getWorkspaceKey } = useVaultSession();
  const [title, setTitle] = useState(milestone.title);
  const [targetDate, setTargetDate] = useState(milestone.targetDate ?? "");
  const [description, setDescription] = useState(
    milestone.description ?? EMPTY_TASK_BODY,
  );
  const milestoneRef = useRef(milestone);
  useEffect(() => {
    milestoneRef.current = milestone;
  });

  const draft = useMemo<MilestoneDraft>(
    () => ({ title, description, targetDate }),
    [title, description, targetDate],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: true,
    save: async (next) => {
      const trimmed = next.title.trim();
      if (!trimmed) {
        throw new Error("Milestone title cannot be empty");
      }
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveMilestone(
        workspaceId,
        projectId,
        key,
        milestoneRef.current,
        {
          title: trimmed,
          description: next.description,
          targetDate: next.targetDate.trim() || null,
        },
      );
      onUpdated(saved);
      return {
        title: saved.title,
        description: saved.description ?? EMPTY_TASK_BODY,
        targetDate: saved.targetDate ?? "",
      };
    },
    onError: (message) => onError?.(message),
    onSaved: (canonical) => {
      setTitle(canonical.title);
      setDescription(canonical.description);
      setTargetDate(canonical.targetDate);
      onError?.(null);
    },
  });

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background p-3">
      <Input
        variant="seamless"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={flush}
        maxLength={200}
        aria-label="Milestone title"
        placeholder="Milestone title"
      />
      <Input
        variant="seamless"
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        onBlur={flush}
        aria-label="Target date"
      />
      <TaskBodyEditor
        content={description}
        compact
        placeholder="Add a description…"
        onChange={setDescription}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Done
        </Button>
        <DeleteButton
          dialogTitle="Delete this milestone?"
          dialogDescription="Tasks assigned to it will become unassigned. This cannot be undone."
          onConfirm={onDelete}
        />
        <SaveStatus status={status} savedAt={savedAt} onRetry={flush} />
      </div>
    </div>
  );
}
