"use client";

import { useEffect, useId, useRef, useState } from "react";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { InlineTitle } from "@/components/app/inline-title";
import { PageActions } from "@/components/app/page-actions";
import { SaveStatus } from "@/components/app/save-status";
import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  createMilestone,
  deleteMilestone,
  formatMilestoneDateRange,
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
  textToTaskBody,
} from "@/lib/vault/task-plaintext";
import { cn } from "@/lib/utils";

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
  /** `"all"` or a milestone id. */
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
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
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editing, setEditing] = useState<DecryptedMilestone | null>(null);

  async function onCreateMilestone(title: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        milestones.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1;
      const description = newDescription.trim();
      const created = await createMilestone(
        workspaceId,
        projectId,
        key,
        {
          title,
          description: description ? textToTaskBody(description) : undefined,
          startDate: newStartDate.trim() || null,
          endDate: newEndDate.trim() || null,
        },
        nextOrder,
      );
      onMilestonesChange(sortMilestones([...milestones, created]));
      setNewStartDate("");
      setNewEndDate("");
      setNewDescription("");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveMilestone(input: {
    title: string;
    startDate: string;
    endDate: string;
    description: string;
  }) {
    if (!editing) return;
    const key = await getWorkspaceKey(workspaceId);
    const description = input.description.trim();
    const saved = await saveMilestone(
      workspaceId,
      projectId,
      key,
      editing,
      {
        title: input.title.trim(),
        description: description
          ? textToTaskBody(description)
          : EMPTY_TASK_BODY,
        startDate: input.startDate.trim() || null,
        endDate: input.endDate.trim() || null,
      },
    );
    onMilestonesChange(
      sortMilestones(
        milestones.map((item) => (item.id === saved.id ? saved : item)),
      ),
    );
    setEditing(null);
  }

  async function onDeleteMilestone(milestone: DecryptedMilestone) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMilestone(workspaceId, projectId, milestone);
      onMilestonesChange(milestones.filter((m) => m.id !== milestone.id));
      if (editing?.id === milestone.id) setEditing(null);
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
    <div className="flex flex-col gap-3">
      <PageActions>
        <CreateEntityDialog
          triggerLabel="Create milestone"
          dialogTitle="Create milestone"
          fieldLabel="Title"
          fieldPlaceholder="New milestone"
          fieldMaxLength={200}
          confirmLabel="Add"
          disabled={busy}
          onCreate={onCreateMilestone}
          onOpenChange={(open) => {
            if (open) {
              setNewStartDate("");
              setNewEndDate("");
              setNewDescription("");
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="milestone-start-date">Start date</Label>
              <Input
                id="milestone-start-date"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                disabled={busy}
                aria-label="Start date"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="milestone-end-date">End date</Label>
              <Input
                id="milestone-end-date"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                disabled={busy}
                aria-label="End date"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Add a description…"
              disabled={busy}
              rows={3}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {milestones.map((m) => (
            <li key={m.id}>
              <MilestoneListItem
                milestone={m}
                selected={selectedFilter === m.id}
                onSelect={() => selectMilestone(m.id)}
                onEdit={() => setEditing(m)}
              />
            </li>
          ))}
        </ul>
      )}

      <MilestoneEditDialog
        milestone={editing}
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={onSaveMilestone}
        onDelete={() => (editing ? onDeleteMilestone(editing) : undefined)}
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
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
            {formatMilestoneDateRange(milestone.startDate, milestone.endDate)}
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

function MilestoneEditDialog({
  milestone,
  busy,
  onOpenChange,
  onSave,
  onDelete,
}: {
  milestone: DecryptedMilestone | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    title: string;
    startDate: string;
    endDate: string;
    description: string;
  }) => Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  return (
    <Dialog open={milestone !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit milestone</DialogTitle>
        </DialogHeader>
        {milestone ? (
          <MilestoneEditForm
            key={milestone.id}
            milestone={milestone}
            busy={busy}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MilestoneEditForm({
  milestone,
  busy,
  onOpenChange,
  onSave,
  onDelete,
}: {
  milestone: DecryptedMilestone;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    title: string;
    startDate: string;
    endDate: string;
    description: string;
  }) => Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const titleId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const descriptionId = useId();
  const [title, setTitle] = useState(milestone.title);
  const [startDate, setStartDate] = useState(milestone.startDate ?? "");
  const [endDate, setEndDate] = useState(milestone.endDate ?? "");
  const [description, setDescription] = useState(
    taskBodyPlainText(milestone.description ?? EMPTY_TASK_BODY),
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setFormError(null);
    try {
      await onSave({ title: trimmed, startDate, endDate, description });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={titleId} required>
            Title
          </Label>
          <Input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Milestone title"
            maxLength={200}
            disabled={pending || busy}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={startDateId}>Start date</Label>
            <Input
              id={startDateId}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={pending || busy}
              aria-label="Start date"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={endDateId}>End date</Label>
            <Input
              id={endDateId}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={pending || busy}
              aria-label="End date"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={descriptionId}>Description</Label>
          <Textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description…"
            disabled={pending || busy}
            rows={3}
          />
        </div>
        {formError ? (
          <p className="text-xs text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
      </div>
      <DialogFooter className="sm:justify-between">
        <DeleteButton
          dialogTitle="Delete this milestone?"
          dialogDescription="Tasks assigned to it will become unassigned. This cannot be undone."
          disabled={pending || busy}
          busy={busy}
          onConfirm={onDelete}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending || busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || busy || !title.trim()}
            onClick={() => void handleSave()}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
