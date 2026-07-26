"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { TaskBodyEditor, type EntityLinkAction } from "@/components/app/task-body-editor";
import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityTimestampsCard } from "@/components/app/entity-timestamps-card";
import { InlineTitle } from "@/components/app/inline-title";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVaultEntityCache } from "@/components/vault/vault-entity-cache";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { CATEGORIZATION_ICON_COMPONENTS } from "@/lib/vault/categorization-icons";
import {
  defaultPriority,
  defaultStage,
  resolveStageColor,
  type CategorizationOption,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import { ENTITY_COLOR_CLASSES } from "@/lib/vault/entity-colors";
import { cn } from "@/lib/utils";
import { createContact } from "@/lib/vault/contacts";
import { loadAllDecryptedMilestones } from "@/lib/vault/milestones";
import { loadDecryptedProject } from "@/lib/vault/projects";
import {
  EMPTY_TASK_BODY,
  toTaskPlaintext,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";
import {
  createTask,
  deleteTask,
  loadDecryptedTask,
  saveTask,
  type DecryptedTask,
} from "@/lib/vault/tasks";

type TaskDetailProps = {
  workspaceId: string;
  projectId: string;
  taskId: string;
};

type TaskDraft = {
  title: string;
  body: TaskBodyDoc;
  dueDate: string | null;
  labelId: string | null;
  stageId: string;
  priorityId: string;
  milestoneId: string | null;
};

export function TaskDetail({
  workspaceId,
  projectId,
  taskId,
}: TaskDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();
  const cache = useVaultEntityCache();
  const { upsertTask } = cache;

  const [task, setTask] = useState<DecryptedTask | null>(null);
  const [categorizations, setCategorizations] =
    useState<ProjectCategorizations | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<TaskBodyDoc>(EMPTY_TASK_BODY);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [labelId, setLabelId] = useState<string | null>(null);
  const [stageId, setStageId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const [milestoneOptions, setMilestoneOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageLimitMessage, setStorageLimitMessage] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  });

  const draft = useMemo<TaskDraft>(
    () => ({ title, body, dueDate, labelId, stageId, priorityId, milestoneId }),
    [title, body, dueDate, labelId, stageId, priorityId, milestoneId],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(task) && !loading && !deleting,
    save: async (next) => {
      const current = taskRef.current;
      if (!current) throw new Error("Task not loaded");
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveTask(
        workspaceId,
        projectId,
        key,
        current,
        toTaskPlaintext(next.title, next.body, next.dueDate),
        {
          labelId: next.labelId,
          stageId: next.stageId,
          priorityId: next.priorityId,
          milestoneId: next.milestoneId,
        },
      );
      setTask(saved);
      cache.upsertTask(saved);
      return {
        title: saved.title,
        body: saved.body,
        dueDate: saved.dueDate,
        labelId: saved.labelId,
        stageId: saved.stageId ?? next.stageId,
        priorityId: saved.priorityId ?? next.priorityId,
        milestoneId: saved.milestoneId,
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setTitle(canonical.title);
      setBody(canonical.body);
      setDueDate(canonical.dueDate);
      setLabelId(canonical.labelId);
      setStageId(canonical.stageId);
      setPriorityId(canonical.priorityId);
      setMilestoneId(canonical.milestoneId);
      setError(null);
    },
  });

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const [loaded, project, milestones] = await Promise.all([
          loadDecryptedTask(workspaceId, projectId, taskId, key),
          loadDecryptedProject(workspaceId, projectId, key),
          loadAllDecryptedMilestones(workspaceId, projectId, key),
        ]);
        if (cancelled) return;
        const cats = project.categorizations;
        const nextStage =
          loaded.stageId &&
          cats.stages.some((s) => s.id === loaded.stageId)
            ? loaded.stageId
            : defaultStage(cats).id;
        const nextPriority =
          loaded.priorityId &&
          cats.priorities.some((p) => p.id === loaded.priorityId)
            ? loaded.priorityId
            : defaultPriority(cats).id;
        const nextLabel =
          loaded.labelId && cats.labels.some((l) => l.id === loaded.labelId)
            ? loaded.labelId
            : null;
        const nextMilestone =
          loaded.milestoneId &&
          milestones.some((m) => m.id === loaded.milestoneId)
            ? loaded.milestoneId
            : null;
        setTask(loaded);
        setCategorizations(cats);
        setMilestoneOptions(
          milestones.map((m) => ({
            id: m.id,
            title: m.title,
          })),
        );
        setTitle(loaded.title);
        setBody(loaded.body);
        setDueDate(loaded.dueDate);
        setLabelId(nextLabel);
        setStageId(nextStage);
        setPriorityId(nextPriority);
        setMilestoneId(nextMilestone);
        setError(null);
        upsertTask(loaded);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load task");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, taskId, getWorkspaceKey, upsertTask]);

  async function onDelete() {
    if (!task || deleting || status === "saving") return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTask(workspaceId, projectId, task);
      window.dispatchEvent(new Event("helvety:tasks-changed"));
      router.push(`/app/w/${workspaceId}/p/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function onEntityLinkAction(
    action: EntityLinkAction,
  ): Promise<EntityLinkTarget | void> {
    const key = await getWorkspaceKey(workspaceId);
    switch (action.type) {
      case "create-task": {
        const project = cache.projects.find((p) => p.id === projectId);
        const created = await createTask(
          workspaceId,
          projectId,
          key,
          { title: action.title },
          0,
          project?.categorizations ?? categorizations ?? undefined,
        );
        cache.upsertTask(created);
        return { kind: "task", id: created.id };
      }
      case "create-contact": {
        const contact = await createContact(workspaceId, key, {
          displayName: action.displayName,
        });
        cache.upsertContact(contact);
        return { kind: "contact", id: contact.id };
      }
      case "link-existing":
        return action.target;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  const linkCandidates = useMemo(() => {
    const items: { kind: EntityLinkTarget["kind"]; id: string; label: string }[] =
      [];
    for (const n of cache.notes) {
      items.push({ kind: "note", id: n.id, label: n.title });
    }
    for (const c of cache.contacts) {
      items.push({ kind: "contact", id: c.id, label: c.displayName });
    }
    return items;
  }, [cache.notes, cache.contacts]);

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <InlineTitle
                value={title}
                onChange={setTitle}
                onBlur={flush}
                placeholder="Untitled task"
                disabled={deleting}
                maxLength={500}
                className="min-w-0 flex-1"
              />
              <DeleteButton
                disabled={deleting}
                busy={deleting}
                dialogTitle="Delete this task?"
                dialogDescription="This permanently deletes the task. This cannot be undone."
                onConfirm={onDelete}
              />
            </div>

            <TaskBodyEditor
              content={body}
              onChange={setBody}
              disabled={deleting}
              enableEntityLinks
              entityLinkSourceKind="task"
              linkCandidates={linkCandidates}
              onEntityLinkAction={onEntityLinkAction}
              fileAttachments={{
                workspaceId,
                getWorkspaceKey: () => getWorkspaceKey(workspaceId),
                onStorageLimit: (message) => setStorageLimitMessage(message),
              }}
            />
            {storageLimitMessage ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {storageLimitMessage}
              </p>
            ) : null}
            <BacklinksPanel
              workspaceId={workspaceId}
              kind="task"
              id={taskId}
            />
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            {task ? (
              <EntityTimestampsCard
                createdAt={task.createdAt}
                updatedAt={task.updatedAt}
                status={status}
                savedAt={savedAt}
                onRetry={flush}
              />
            ) : null}

            <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
              <Label
                htmlFor="task-detail-due-date"
                className="text-xs text-muted-foreground"
              >
                Due date
              </Label>
              <Input
                id="task-detail-due-date"
                type="date"
                value={dueDate ?? ""}
                disabled={deleting}
                onChange={(e) => setDueDate(e.target.value || null)}
              />
            </div>

            {categorizations ? (
              <>
                <RadioSection legend="Stage" required>
                  <CategorizationRadioList
                    name="task-stage"
                    options={categorizations.stages}
                    value={stageId}
                    useStageColor
                    disabled={deleting}
                    onChange={(id) => {
                      if (id) setStageId(id);
                    }}
                  />
                </RadioSection>
                <RadioSection legend="Priority" required>
                  <CategorizationRadioList
                    name="task-priority"
                    options={categorizations.priorities}
                    value={priorityId}
                    disabled={deleting}
                    onChange={(id) => {
                      if (id) setPriorityId(id);
                    }}
                  />
                </RadioSection>
                <RadioSection legend="Label">
                  <CategorizationRadioList
                    name="task-label"
                    options={categorizations.labels}
                    value={labelId}
                    allowNone
                    disabled={deleting}
                    onChange={setLabelId}
                  />
                </RadioSection>
                <RadioSection legend="Milestone">
                  <CategorizationRadioList
                    name="task-milestone"
                    options={milestoneOptions.map((m) => ({
                      id: m.id,
                      name: m.title,
                      sortOrder: 0,
                    }))}
                    value={milestoneId}
                    allowNone
                    disabled={deleting}
                    onChange={setMilestoneId}
                  />
                </RadioSection>
              </>
            ) : null}
          </aside>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RadioSection({
  legend,
  required,
  children,
}: {
  legend: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border p-3">
      <h2 className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {legend}
        {required ? (
          <>
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function CategorizationRadioList({
  name,
  options,
  value,
  onChange,
  allowNone = false,
  useStageColor = false,
  disabled = false,
}: {
  name: string;
  options: CategorizationOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  useStageColor?: boolean;
  disabled?: boolean;
}) {
  const sorted = [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  return (
    <div
      className="flex flex-col gap-1.5"
      role="radiogroup"
      aria-label={name}
    >
      {allowNone ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            className="size-3.5 accent-primary"
            checked={value == null}
            disabled={disabled}
            onChange={() => onChange(null)}
          />
          <span className="text-muted-foreground">None</span>
        </label>
      ) : null}
      {sorted.map((opt) => {
        const Icon = opt.icon
          ? CATEGORIZATION_ICON_COMPONENTS[opt.icon]
          : null;
        const color = useStageColor ? resolveStageColor(opt) : opt.color;
        const tint = color ? ENTITY_COLOR_CLASSES[color] : null;
        return (
          <label
            key={opt.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm",
              tint?.bg,
              tint?.text,
            )}
          >
            <input
              type="radio"
              name={name}
              className="size-3.5 accent-primary"
              checked={value === opt.id}
              disabled={disabled}
              onChange={() => onChange(opt.id)}
            />
            {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
            <span className="truncate">{opt.name}</span>
          </label>
        );
      })}
    </div>
  );
}
