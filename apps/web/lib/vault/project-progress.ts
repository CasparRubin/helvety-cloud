import {
  defaultStage,
  type ProjectCategorizations,
} from "@/lib/vault/categorizations";
import type { DecryptedMilestone } from "@/lib/vault/milestones";

export type ProjectProgressStats = {
  scope: number;
  started: number;
  completed: number;
  remaining: number;
  startedPct: number;
  completedPct: number;
};

function isCancelledStage(name: string): boolean {
  return name === "Cancelled";
}

/** Prefer the seeded Completed stage; else the last non-cancelled stage. */
function resolveCompletedStageId(
  stages: ProjectCategorizations["stages"],
): string | null {
  const byName = stages.find((s) => s.name === "Completed");
  if (byName) return byName.id;
  const sorted = [...stages]
    .filter((s) => !isCancelledStage(s.name))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.at(-1)?.id ?? null;
}

export function computeProjectProgress(
  tasks: ReadonlyArray<{ stageId: string | null }>,
  categorizations: ProjectCategorizations,
): ProjectProgressStats {
  const defaultId = defaultStage(categorizations).id;
  const completedId = resolveCompletedStageId(categorizations.stages);
  const cancelledIds = new Set(
    categorizations.stages
      .filter((s) => isCancelledStage(s.name))
      .map((s) => s.id),
  );

  let scope = 0;
  let started = 0;
  let completed = 0;

  for (const task of tasks) {
    const stageId = task.stageId ?? defaultId;
    if (cancelledIds.has(stageId)) continue;
    scope += 1;
    if (completedId && stageId === completedId) {
      completed += 1;
    } else if (stageId !== defaultId) {
      started += 1;
    }
  }

  const startedPct = scope > 0 ? Math.round((started / scope) * 100) : 0;
  const completedPct = scope > 0 ? Math.round((completed / scope) * 100) : 0;

  return {
    scope,
    started,
    completed,
    remaining: scope - started - completed,
    startedPct,
    completedPct,
  };
}

/** Next upcoming target date; if none, the most recent past target. */
export function nearestMilestoneTarget(
  milestones: ReadonlyArray<DecryptedMilestone>,
  todayIso: string,
): DecryptedMilestone | null {
  const dated = milestones
    .filter((m) => m.targetDate)
    .sort((a, b) => (a.targetDate! < b.targetDate! ? -1 : 1));
  if (dated.length === 0) return null;

  const upcoming = dated.find((m) => m.targetDate! >= todayIso);
  if (upcoming) return upcoming;
  return dated[dated.length - 1]!;
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTargetDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
