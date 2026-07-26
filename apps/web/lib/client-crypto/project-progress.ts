import {
  defaultStage,
  findOption,
  isCancelledStageName,
  resolveCompletionPercent,
  type ProjectCategorizations,
} from "@/lib/client-crypto/categorizations";
import {
  formatMilestoneDateRange,
  type DecryptedMilestone,
} from "@/lib/client-crypto/milestones";

export type ProjectProgressView = {
  scopeCount: number;
  weightedPercent: number;
  window: { startDate: string; endDate: string; label: string | null } | null;
  todayIso: string;
};

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasBothDates(
  m: DecryptedMilestone,
): m is DecryptedMilestone & { startDate: string; endDate: string } {
  return Boolean(m.startDate && m.endDate);
}

function resolveProgressWindow(
  milestones: ReadonlyArray<DecryptedMilestone>,
  milestoneFilter: string,
): ProjectProgressView["window"] {
  if (milestoneFilter !== "all") {
    const m = milestones.find((x) => x.id === milestoneFilter);
    if (!m || !hasBothDates(m)) return null;
    return {
      startDate: m.startDate,
      endDate: m.endDate,
      label: m.title,
    };
  }

  const dated = milestones.filter(hasBothDates);
  if (dated.length === 0) return null;
  let startDate = dated[0]!.startDate;
  let endDate = dated[0]!.endDate;
  for (const m of dated) {
    if (m.startDate < startDate) startDate = m.startDate;
    if (m.endDate > endDate) endDate = m.endDate;
  }
  return { startDate, endDate, label: null };
}

function computeWeightedCompletionPercent(
  tasks: ReadonlyArray<{ stageId: string | null; milestoneId: string | null }>,
  categorizations: ProjectCategorizations,
  milestoneFilter: string,
): { scopeCount: number; weightedPercent: number } {
  const defaultId = defaultStage(categorizations).id;
  const stages = categorizations.stages;
  const cancelledIds = new Set(
    stages.filter((s) => isCancelledStageName(s.name)).map((s) => s.id),
  );

  let sum = 0;
  let scopeCount = 0;

  for (const task of tasks) {
    if (milestoneFilter !== "all" && task.milestoneId !== milestoneFilter) {
      continue;
    }
    const stageId = task.stageId ?? defaultId;
    if (cancelledIds.has(stageId)) continue;
    sum += resolveCompletionPercent(findOption(stages, stageId), stages);
    scopeCount += 1;
  }

  return {
    scopeCount,
    weightedPercent: scopeCount > 0 ? Math.round(sum / scopeCount) : 0,
  };
}

export function computeProjectProgressView(
  tasks: ReadonlyArray<{ stageId: string | null; milestoneId: string | null }>,
  categorizations: ProjectCategorizations,
  milestones: ReadonlyArray<DecryptedMilestone>,
  milestoneFilter: string,
  todayIso: string = todayIsoDate(),
): ProjectProgressView {
  const { scopeCount, weightedPercent } = computeWeightedCompletionPercent(
    tasks,
    categorizations,
    milestoneFilter,
  );
  return {
    scopeCount,
    weightedPercent,
    window: resolveProgressWindow(milestones, milestoneFilter),
    todayIso,
  };
}

/** Fraction 0–1 of today along [start, end], clamped into the window. */
export function scheduleProgressFraction(
  todayIso: string,
  start: string,
  end: string,
): number {
  const iso = todayIso < start ? start : todayIso > end ? end : todayIso;
  const startMs = Date.parse(`${start}T00:00:00`);
  const endMs = Date.parse(`${end}T00:00:00`);
  const isoMs = Date.parse(`${iso}T00:00:00`);
  if (endMs <= startMs) return iso >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (isoMs - startMs) / (endMs - startMs)));
}

export function progressWindowCaption(window: {
  startDate: string;
  endDate: string;
  label: string | null;
}): string {
  const range = formatMilestoneDateRange(window.startDate, window.endDate);
  return window.label ? `${window.label} · ${range}` : range;
}
