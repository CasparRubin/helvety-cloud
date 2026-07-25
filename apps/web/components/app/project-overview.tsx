"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

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
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";
import { cn } from "@/lib/utils";

type ProjectOverviewProps = {
  workspaceId: string;
  project: DecryptedProject;
  milestones: DecryptedMilestone[];
  onProjectChange: (project: DecryptedProject) => void;
  onMilestonesChange: (milestones: DecryptedMilestone[]) => void;
};

function isEmptyDoc(doc: TaskBodyDoc): boolean {
  const content = doc.content ?? [];
  if (content.length === 0) return true;
  if (content.length === 1) {
    const node = content[0]!;
    if (
      node.type === "paragraph" &&
      (!node.content || node.content.length === 0)
    ) {
      return true;
    }
  }
  return false;
}

export function ProjectOverview({
  workspaceId,
  project,
  milestones,
  onProjectChange,
  onMilestonesChange,
}: ProjectOverviewProps) {
  const { getWorkspaceKey } = useVaultSession();
  const [open, setOpen] = useState(
    () => !isEmptyDoc(project.description) || milestones.length > 0,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onCreateMilestone(e: React.FormEvent) {
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
        project.id,
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
        project.id,
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
      await deleteMilestone(workspaceId, project.id, milestone);
      onMilestonesChange(milestones.filter((m) => m.id !== milestone.id));
      if (editingId === milestone.id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/80 bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0" aria-hidden />
        )}
        Overview
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {milestones.length === 0
            ? "No milestones"
            : `${milestones.length} milestone${milestones.length === 1 ? "" : "s"}`}
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-border/60 px-3 py-3">
          <ProjectDescriptionEditor
            key={`${project.id}:${project.updatedAt}`}
            workspaceId={workspaceId}
            project={project}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            onProjectChange={onProjectChange}
          />

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Milestones
            </h3>
            <form
              onSubmit={(e) => void onCreateMilestone(e)}
              className="flex flex-wrap gap-2"
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New milestone title"
                disabled={busy}
                maxLength={200}
                aria-label="Milestone title"
                className="min-w-[12rem] flex-1"
              />
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                disabled={busy}
                aria-label="Target date"
                className="w-40"
              />
              <Button type="submit" disabled={busy || !newTitle.trim()}>
                Add
              </Button>
            </form>

            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No milestones yet. Add a timeboxed goal for this project.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
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
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-baseline justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-left hover:bg-muted/40",
                        )}
                        onClick={() => setEditingId(m.id)}
                      >
                        <span className="truncate text-sm font-medium">
                          {m.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {m.targetDate ?? "No date"}
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProjectDescriptionEditor({
  workspaceId,
  project,
  busy,
  setBusy,
  setError,
  onProjectChange,
}: {
  workspaceId: string;
  project: DecryptedProject;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  onProjectChange: (project: DecryptedProject) => void;
}) {
  const { getWorkspaceKey } = useVaultSession();
  const [description, setDescription] = useState(project.description);
  const [dirty, setDirty] = useState(false);

  async function saveDescription() {
    if (busy) return;
    setBusy(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "Failed to save description");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">
          Description
        </h3>
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
      <div className="flex flex-wrap gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          maxLength={200}
          aria-label="Milestone title"
          className="min-w-[12rem] flex-1"
        />
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          disabled={busy}
          aria-label="Target date"
          className="w-40"
        />
      </div>
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
