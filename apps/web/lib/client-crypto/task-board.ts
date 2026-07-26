import {
  defaultStage,
  type CategorizationOption,
  type ProjectCategorizations,
} from "@/lib/client-crypto/categorizations";

type BoardTaskIds = {
  id: string;
  stageId: string | null;
  priorityId: string | null;
  sortOrder: number;
};

type StageColumn<T extends BoardTaskIds> = {
  stage: CategorizationOption;
  tasks: T[];
};

function resolveTaskStageId(
  task: Pick<BoardTaskIds, "stageId">,
  cats: ProjectCategorizations,
): string {
  if (task.stageId && cats.stages.some((s) => s.id === task.stageId)) {
    return task.stageId;
  }
  return defaultStage(cats).id;
}

function priorityRank(
  priorityId: string | null | undefined,
  priorities: CategorizationOption[],
): number {
  if (!priorityId) return Number.NEGATIVE_INFINITY;
  const opt = priorities.find((p) => p.id === priorityId);
  if (!opt) return Number.NEGATIVE_INFINITY;
  return opt.sortOrder;
}

function compareTasksByPriority<T extends BoardTaskIds>(
  a: T,
  b: T,
  priorities: CategorizationOption[],
): number {
  const rankDiff =
    priorityRank(b.priorityId, priorities) -
    priorityRank(a.priorityId, priorities);
  if (rankDiff !== 0) return rankDiff;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id.localeCompare(b.id);
}

/** One column per stage (including empty); tasks sorted highest priority first. */
export function groupTasksByStage<T extends BoardTaskIds>(
  tasks: T[],
  cats: ProjectCategorizations,
): StageColumn<T>[] {
  const stages = [...cats.stages].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const buckets = new Map<string, T[]>(stages.map((s) => [s.id, []]));

  for (const task of tasks) {
    const stageId = resolveTaskStageId(task, cats);
    buckets.get(stageId)!.push(task);
  }

  return stages.map((stage) => {
    const columnTasks = [...(buckets.get(stage.id) ?? [])].sort((a, b) =>
      compareTasksByPriority(a, b, cats.priorities),
    );
    return { stage, tasks: columnTasks };
  });
}
