"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
} from "lucide-react";

import { CategorizationPicker } from "@/components/app/categorization-picker";
import {
  EntityListEmpty,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import {
  ProjectDescriptionEditor,
  ProjectMilestonesPanel,
  ProjectTitleEditor,
  type MilestoneFilter,
} from "@/components/app/project-overview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { CATEGORIZATION_ICON_COMPONENTS } from "@/lib/vault/categorization-icons";
import {
  resolveMaxVisibleTasks,
  resolveStageColor,
  type CategorizationOption,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import { ENTITY_COLOR_CLASSES } from "@/lib/vault/entity-colors";
import {
  loadAllDecryptedMilestones,
  type DecryptedMilestone,
} from "@/lib/vault/milestones";
import { groupTasksByStage } from "@/lib/vault/task-board";
import {
  createTask,
  loadAllDecryptedTasks,
  saveTaskCategorizationIds,
  type DecryptedTask,
} from "@/lib/vault/tasks";
import {
  loadDecryptedProject,
  type DecryptedProject,
} from "@/lib/vault/projects";
import { cn } from "@/lib/utils";

type TaskListProps = {
  workspaceId: string;
  projectId: string;
};

export function TaskList({ workspaceId, projectId }: TaskListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [project, setProject] = useState<DecryptedProject | null>(null);
  const [tasks, setTasks] = useState<DecryptedTask[]>([]);
  const [milestones, setMilestones] = useState<DecryptedMilestone[]>([]);
  const [milestoneFilter, setMilestoneFilter] =
    useState<MilestoneFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const reload = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const [loadedProject, allTasks, allMilestones] = await Promise.all([
      loadDecryptedProject(workspaceId, projectId, key),
      loadAllDecryptedTasks(workspaceId, projectId, key),
      loadAllDecryptedMilestones(workspaceId, projectId, key),
    ]);
    setProject(loadedProject);
    setTasks(allTasks);
    setMilestones(allMilestones);
  }, [getWorkspaceKey, workspaceId, projectId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, reload]);

  const filteredTasks = useMemo(() => {
    if (milestoneFilter === "all") return tasks;
    if (milestoneFilter === "none") {
      return tasks.filter((t) => t.milestoneId == null);
    }
    return tasks.filter((t) => t.milestoneId === milestoneFilter);
  }, [tasks, milestoneFilter]);

  const columns = useMemo(() => {
    if (!project) return [];
    return groupTasksByStage(filteredTasks, project.categorizations);
  }, [project, filteredTasks]);

  const milestoneById = useMemo(() => {
    const map = new Map<string, DecryptedMilestone>();
    for (const m of milestones) map.set(m.id, m);
    return map;
  }, [milestones]);

  const activeTask = activeTaskId
    ? (tasks.find((t) => t.id === activeTaskId) ?? null)
    : null;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy || !project) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        tasks.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
      const created = await createTask(
        workspaceId,
        projectId,
        key,
        { title: trimmed },
        nextOrder,
        project.categorizations,
      );
      setTitle("");
      window.dispatchEvent(new Event("helvety:tasks-changed"));
      router.push(`/app/w/${workspaceId}/p/${projectId}/t/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  async function updateTaskIds(
    task: DecryptedTask,
    next: {
      labelId: string | null;
      stageId: string;
      priorityId: string;
    },
  ) {
    if (savingTaskId || busy) return;
    if (
      next.labelId === task.labelId &&
      next.stageId === task.stageId &&
      next.priorityId === task.priorityId
    ) {
      return;
    }
    const previous = tasks;
    setSavingTaskId(task.id);
    setError(null);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              labelId: next.labelId,
              stageId: next.stageId,
              priorityId: next.priorityId,
            }
          : t,
      ),
    );
    try {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveTaskCategorizationIds(
        workspaceId,
        projectId,
        key,
        task,
        {
          labelId: next.labelId,
          stageId: next.stageId,
          priorityId: next.priorityId,
        },
      );
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      window.dispatchEvent(new Event("helvety:tasks-changed"));
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingTaskId(null);
    }
  }

  function resolveDropStageId(
    overData: Record<string, unknown> | undefined,
  ): string | null {
    if (overData?.type === "stage" && typeof overData.stageId === "string") {
      return overData.stageId;
    }
    if (overData?.type === "task" && typeof overData.stageId === "string") {
      return overData.stageId;
    }
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over || !project) return;
    const task = tasks.find((t) => t.id === String(active.id));
    if (!task) return;
    const nextStageId = resolveDropStageId(
      over.data.current as Record<string, unknown> | undefined,
    );
    if (!nextStageId || nextStageId === task.stageId) return;
    const priorityId = task.priorityId ?? "";
    if (!priorityId) return;
    void updateTaskIds(task, {
      labelId: task.labelId,
      stageId: nextStageId,
      priorityId,
    });
  }

  if (!vault) return null;

  return (
    <EntityListShell
      title={
        !loading && project ? (
          <ProjectTitleEditor
            key={project.id}
            workspaceId={workspaceId}
            project={project}
            onProjectChange={setProject}
            onError={setError}
          />
        ) : (
          (project?.name ?? "Project")
        )
      }
      subtitle="Task titles and bodies are encrypted end-to-end."
      belowTitle={
        !loading && project ? (
          <ProjectDescriptionEditor
            key={project.id}
            workspaceId={workspaceId}
            project={project}
            onProjectChange={setProject}
            onError={setError}
          />
        ) : null
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/app/w/${workspaceId}/p/${projectId}/settings/general`}
              />
            }
            nativeButton={false}
          >
            Project settings
          </Button>
        </>
      }
      error={error}
      loading={loading}
      loadingLabel="Loading tasks…"
      bareChildren
    >
      {!loading && project ? (
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-[3] flex-col gap-3 overflow-y-auto pb-2">
            <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New task title"
                disabled={busy}
                maxLength={500}
                aria-label="Task title"
              />
              <Button type="submit" disabled={busy || !title.trim()}>
                Create
              </Button>
            </form>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveTaskId(null)}
            >
              <div className="flex flex-col gap-3">
                {columns.map((col, index) => (
                  <StageRow
                    key={`${col.stage.id}:${resolveMaxVisibleTasks(col.stage)}`}
                    stage={col.stage}
                    prevStage={columns[index - 1]?.stage ?? null}
                    nextStage={columns[index + 1]?.stage ?? null}
                    tasks={col.tasks}
                    cats={project.categorizations}
                    milestoneById={milestoneById}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    busy={busy}
                    savingTaskId={savingTaskId}
                    onUpdateIds={updateTaskIds}
                  />
                ))}
              </div>
              <DragOverlay dropAnimation={null}>
                {activeTask && project ? (
                  <TaskCardContent
                    task={activeTask}
                    cats={project.categorizations}
                    milestone={
                      activeTask.milestoneId
                        ? (milestoneById.get(activeTask.milestoneId) ?? null)
                        : null
                    }
                    workspaceId={workspaceId}
                    projectId={projectId}
                    overlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          <aside className="flex min-h-0 min-w-0 flex-[1] flex-col overflow-y-auto border-l border-border/60 pl-4">
            <ProjectMilestonesPanel
              workspaceId={workspaceId}
              projectId={projectId}
              milestones={milestones}
              selectedFilter={milestoneFilter}
              onSelectFilter={setMilestoneFilter}
              onMilestonesChange={(next) => {
                setMilestones(next);
                const ids = new Set(next.map((m) => m.id));
                if (
                  milestoneFilter !== "all" &&
                  milestoneFilter !== "none" &&
                  !ids.has(milestoneFilter)
                ) {
                  setMilestoneFilter("all");
                }
              }}
            />
          </aside>
        </div>
      ) : null}
    </EntityListShell>
  );
}

function StageRow({
  stage,
  prevStage,
  nextStage,
  tasks,
  cats,
  milestoneById,
  workspaceId,
  projectId,
  busy,
  savingTaskId,
  onUpdateIds,
}: {
  stage: CategorizationOption;
  prevStage: CategorizationOption | null;
  nextStage: CategorizationOption | null;
  tasks: DecryptedTask[];
  cats: ProjectCategorizations;
  milestoneById: Map<string, DecryptedMilestone>;
  workspaceId: string;
  projectId: string;
  busy: boolean;
  savingTaskId: string | null;
  onUpdateIds: (
    task: DecryptedTask,
    next: {
      labelId: string | null;
      stageId: string;
      priorityId: string;
    },
  ) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id },
  });
  const limit = resolveMaxVisibleTasks(stage);
  const [visibleCount, setVisibleCount] = useState(limit);
  const tintColor = resolveStageColor(stage);
  const tint = tintColor ? ENTITY_COLOR_CLASSES[tintColor] : null;
  const Icon = stage.icon
    ? CATEGORIZATION_ICON_COMPONENTS[stage.icon]
    : null;
  const shownTasks = tasks.slice(0, visibleCount);
  const remaining = tasks.length - shownTasks.length;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.name} stage`}
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background",
        // Inset ring: an outward ring gets clipped by the scrolling board.
        isOver && "ring-2 ring-ring ring-inset",
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 border-b border-border px-3 py-2",
          tint ? cn(tint.bg, tint.text) : "bg-muted/40",
        )}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
          {stage.name}
        </h2>
        <span className="text-xs tabular-nums opacity-70">{tasks.length}</span>
      </div>
      <div className="flex flex-col">
        {tasks.length === 0 ? (
          <EntityListEmpty className="m-2 px-3 py-4 text-center text-xs">
            No tasks in this stage
          </EntityListEmpty>
        ) : (
          <>
            {shownTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                stageId={stage.id}
                prevStage={prevStage}
                nextStage={nextStage}
                cats={cats}
                milestone={
                  task.milestoneId
                    ? (milestoneById.get(task.milestoneId) ?? null)
                    : null
                }
                workspaceId={workspaceId}
                projectId={projectId}
                disabled={busy || savingTaskId === task.id}
                onUpdateIds={onUpdateIds}
              />
            ))}
            {remaining > 0 ? (
              <div className="border-t border-border px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() =>
                    setVisibleCount((prev) => prev + limit)
                  }
                >
                  Show more ({remaining} remaining)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  stageId,
  prevStage,
  nextStage,
  cats,
  milestone,
  workspaceId,
  projectId,
  disabled,
  onUpdateIds,
}: {
  task: DecryptedTask;
  stageId: string;
  prevStage: CategorizationOption | null;
  nextStage: CategorizationOption | null;
  cats: ProjectCategorizations;
  milestone: DecryptedMilestone | null;
  workspaceId: string;
  projectId: string;
  disabled: boolean;
  onUpdateIds: (
    task: DecryptedTask,
    next: {
      labelId: string | null;
      stageId: string;
      priorityId: string;
    },
  ) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled,
    data: { type: "task", stageId, taskId: task.id },
  });
  const canMove = !disabled && Boolean(task.priorityId);

  function moveToStage(target: CategorizationOption | null) {
    if (!target || !task.priorityId) return;
    onUpdateIds(task, {
      labelId: task.labelId,
      stageId: target.id,
      priorityId: task.priorityId,
    });
  }

  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <TaskCardContent
        task={task}
        cats={cats}
        milestone={milestone}
        workspaceId={workspaceId}
        projectId={projectId}
        disabled={disabled}
        onUpdateIds={onUpdateIds}
        dragHandle={
          <button
            type="button"
            className="inline-flex size-7 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label={`Drag ${task.title || "task"}`}
            disabled={disabled}
            {...listeners}
            {...attributes}
          >
            <GripVerticalIcon className="size-4" aria-hidden />
          </button>
        }
        moveActions={
          <div className="flex shrink-0 flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={!canMove || !prevStage}
              aria-label={
                prevStage
                  ? `Move to ${prevStage.name}`
                  : "No previous stage"
              }
              title={prevStage ? `Move to ${prevStage.name}` : undefined}
              onClick={() => moveToStage(prevStage)}
            >
              <ChevronUpIcon aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={!canMove || !nextStage}
              aria-label={
                nextStage ? `Move to ${nextStage.name}` : "No next stage"
              }
              title={nextStage ? `Move to ${nextStage.name}` : undefined}
              onClick={() => moveToStage(nextStage)}
            >
              <ChevronDownIcon aria-hidden />
            </Button>
          </div>
        }
      />
    </div>
  );
}

function TaskCardContent({
  task,
  cats,
  milestone,
  workspaceId,
  projectId,
  disabled,
  onUpdateIds,
  dragHandle,
  moveActions,
  overlay = false,
}: {
  task: DecryptedTask;
  cats: ProjectCategorizations;
  milestone?: DecryptedMilestone | null;
  workspaceId: string;
  projectId: string;
  disabled?: boolean;
  onUpdateIds?: (
    task: DecryptedTask,
    next: {
      labelId: string | null;
      stageId: string;
      priorityId: string;
    },
  ) => void;
  dragHandle?: ReactNode;
  moveActions?: ReactNode;
  overlay?: boolean;
}) {
  const stageId = task.stageId ?? "";
  const priorityId = task.priorityId ?? "";

  return (
    <article
      className={cn(
        "flex flex-wrap items-center gap-1 border-b border-border bg-background px-1 py-0.5 last:border-b-0 hover:bg-muted/40",
        overlay && "rounded-md border border-border shadow-lg ring-1 ring-ring",
      )}
    >
      {dragHandle}
      <Link
        href={`/app/w/${workspaceId}/p/${projectId}/t/${task.id}`}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
        tabIndex={overlay ? -1 : undefined}
        onClick={(e) => {
          if (overlay) e.preventDefault();
        }}
      >
        {task.title || "Untitled"}
      </Link>
      {milestone ? (
        <span
          className="max-w-[7rem] truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
          title={
            milestone.targetDate
              ? `${milestone.title} · ${milestone.targetDate}`
              : milestone.title
          }
        >
          {milestone.title}
        </span>
      ) : null}
      {onUpdateIds ? (
        <>
          <CategorizationPicker
            options={cats.labels}
            value={task.labelId}
            allowNone
            disabled={disabled}
            variant="ghost"
            className="max-w-[8rem]"
            aria-label={`Label for ${task.title || "task"}`}
            onChange={(id) =>
              onUpdateIds(task, {
                labelId: id,
                stageId,
                priorityId,
              })
            }
          />
          <CategorizationPicker
            options={cats.priorities}
            value={priorityId || null}
            disabled={disabled || !priorityId}
            variant="ghost"
            className="max-w-[8rem]"
            aria-label={`Priority for ${task.title || "task"}`}
            onChange={(id) => {
              if (!id) return;
              onUpdateIds(task, {
                labelId: task.labelId,
                stageId,
                priorityId: id,
              });
            }}
          />
        </>
      ) : null}
      {moveActions}
    </article>
  );
}
