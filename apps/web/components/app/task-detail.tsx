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
import { CommentsSection } from "@/components/app/comments-section";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import {
  EntityDetailLayout,
  EntityDetailShell,
} from "@/components/app/entity-detail-shell";
import { EntityTimestampsCard } from "@/components/app/entity-timestamps-card";
import { InlineTitle } from "@/components/app/inline-title";
import { PageDangerActions } from "@/components/app/page-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { CATEGORIZATION_ICON_COMPONENTS } from "@/lib/client-crypto/categorization-icons";
import {
  defaultPriority,
  defaultStage,
  resolveStageColor,
  type CategorizationOption,
  type ProjectCategorizations,
} from "@/lib/client-crypto/categorizations";
import { ENTITY_COLOR_CLASSES } from "@/lib/client-crypto/entity-colors";
import { cn } from "@/lib/utils";
import { createContact } from "@/lib/client-crypto/contacts";
import { formatContactName } from "@/lib/client-crypto/contact-plaintext";
import { loadAllDecryptedMilestones } from "@/lib/client-crypto/milestones";
import {
  EMPTY_TASK_BODY,
  toTaskPlaintext,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";
import {
  createTask,
  deleteTask,
  loadDecryptedTask,
  saveTask,
  type DecryptedTask,
} from "@/lib/client-crypto/tasks";

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
  const { userKeys, workspaces, getWorkspaceKey } = useCryptoSession();
  const cache = useEntityCache();
  const { upsertTask } = cache;
  const workspaceCategorizations =
    workspaces.find((workspace) => workspace.id === workspaceId)?.categorizations ??
    null;

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
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const [loaded, milestones] = await Promise.all([
          loadDecryptedTask(workspaceId, projectId, taskId, key),
          loadAllDecryptedMilestones(workspaceId, projectId, key),
        ]);
        if (cancelled) return;
        const cats = workspaceCategorizations;
        if (!cats) {
          throw new Error("Workspace categorizations not available");
        }
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
  }, [
    userKeys,
    workspaceId,
    projectId,
    taskId,
    getWorkspaceKey,
    upsertTask,
    workspaceCategorizations,
  ]);

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
        const created = await createTask(
          workspaceId,
          projectId,
          key,
          { title: action.title },
          0,
          workspaceCategorizations ?? categorizations ?? undefined,
        );
        cache.upsertTask(created);
        return { kind: "task", id: created.id };
      }
      case "create-contact": {
        const contact = await createContact(workspaceId, key, {
          firstName: action.firstName,
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
      items.push({
        kind: "contact",
        id: c.id,
        label: formatContactName(c) || "Untitled",
      });
    }
    return items;
  }, [cache.notes, cache.contacts]);

  if (!userKeys) return null;

  return (
    <EntityDetailShell loading={loading} error={error}>
      <PageDangerActions>
        <DeleteButton
          disabled={deleting}
          busy={deleting}
          dialogTitle="Delete this task?"
          dialogDescription="This permanently deletes the task, its comments, attached files, and its links to other items. This cannot be undone."
          onConfirm={onDelete}
        />
      </PageDangerActions>
      <EntityDetailLayout
        main={
          <>
            <InlineTitle
              value={title}
              onChange={setTitle}
              onBlur={flush}
              placeholder="Untitled task"
              disabled={deleting}
              maxLength={500}
              className="min-w-0"
            />

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
              <Alert>
                <AlertTitle>Storage limit</AlertTitle>
                <AlertDescription>{storageLimitMessage}</AlertDescription>
              </Alert>
            ) : null}
            <CommentsSection
              workspaceId={workspaceId}
              parentKind="task"
              parentId={taskId}
            />
          </>
        }
        aside={
          <>
            {task ? (
              <EntityTimestampsCard
                createdAt={task.createdAt}
                updatedAt={task.updatedAt}
                status={status}
                savedAt={savedAt}
                onRetry={flush}
              />
            ) : null}

            <Card size="sm">
              <CardContent className="flex flex-col gap-1.5">
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
              </CardContent>
            </Card>

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
            <BacklinksPanel
              workspaceId={workspaceId}
              kind="task"
              id={taskId}
            />
          </>
        }
      />
    </EntityDetailShell>
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
    <Card size="sm">
      <CardContent className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {legend}
          {required ? (
            <>
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(required)</span>
            </>
          ) : null}
        </p>
        {children}
      </CardContent>
    </Card>
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
