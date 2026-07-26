"use client";

import { useId, useMemo } from "react";

import type { ProjectCategorizations } from "@/lib/vault/categorizations";
import type { DecryptedMilestone } from "@/lib/vault/milestones";
import {
  computeProjectProgress,
  formatTargetDate,
  nearestMilestoneTarget,
  todayIsoDate,
} from "@/lib/vault/project-progress";
import type { DecryptedTask } from "@/lib/vault/tasks";
import { cn } from "@/lib/utils";

type ProjectProgressProps = {
  tasks: DecryptedTask[];
  categorizations: ProjectCategorizations;
  milestones: DecryptedMilestone[];
  className?: string;
};

export function ProjectProgress({
  tasks,
  categorizations,
  milestones,
  className,
}: ProjectProgressProps) {
  const stats = useMemo(
    () => computeProjectProgress(tasks, categorizations),
    [tasks, categorizations],
  );

  const target = useMemo(
    () => nearestMilestoneTarget(milestones, todayIsoDate()),
    [milestones],
  );

  const completedWidth = stats.scope > 0 ? (stats.completed / stats.scope) * 100 : 0;
  const startedWidth = stats.scope > 0 ? (stats.started / stats.scope) * 100 : 0;

  return (
    <section
      className={cn(
        "shrink-0 border-t border-border/60 pt-3 pb-1",
        className,
      )}
      aria-label="Project progress"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
          Progress
        </h3>
        {stats.scope > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {stats.completedPct}% done
          </span>
        ) : null}
      </div>

      {stats.scope === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No tasks in scope.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric
              label="Scope"
              value={stats.scope}
              swatch="bg-muted-foreground/50"
            />
            <Metric
              label="Started"
              value={stats.started}
              hint={`${stats.startedPct}%`}
              swatch="bg-amber-500"
            />
            <Metric
              label="Completed"
              value={stats.completed}
              hint={`${stats.completedPct}%`}
              swatch="bg-violet-500"
            />
          </div>

          <div className="relative mt-3">
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${stats.completed} completed, ${stats.started} started, ${stats.remaining} remaining of ${stats.scope}`}
            >
              <div className="flex h-full w-full">
                <div
                  className="h-full bg-violet-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${completedWidth}%` }}
                />
                <div
                  className="h-full bg-amber-500/90 transition-[width] duration-300 ease-out"
                  style={{ width: `${startedWidth}%` }}
                />
              </div>
            </div>

            <ProgressSpark
              completedPct={completedWidth}
              startedPct={startedWidth}
            />
          </div>
        </>
      )}

      {target?.targetDate ? (
        <p className="mt-2.5 truncate text-[11px] text-muted-foreground">
          <span className="text-foreground/70">{target.title}</span>
          {" · "}
          {formatTargetDate(target.targetDate)}
        </p>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  swatch,
}: {
  label: string;
  value: number;
  hint?: string;
  swatch: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={cn("size-2 shrink-0 rounded-[3px]", swatch)} />
        <span className="truncate text-[11px] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1 pl-3.5">
        <span className="text-sm font-medium tabular-nums tracking-tight">
          {value}
        </span>
        {hint ? (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Soft area graphic mirroring current completion — not a historical burn-up. */
function ProgressSpark({
  completedPct,
  startedPct,
}: {
  completedPct: number;
  startedPct: number;
}) {
  const reactId = useId().replace(/:/g, "");
  const completedFillId = `${reactId}-completed`;
  const startedFillId = `${reactId}-started`;

  const w = 200;
  const h = 48;
  const pad = 2;
  const top = pad;
  const bottom = h - pad;
  const midY = top + (bottom - top) * 0.42;
  const lowY = top + (bottom - top) * 0.68;

  const endX = w - pad;
  const startBand = Math.min(100, completedPct + startedPct);
  const completedX = pad + ((w - pad * 2) * completedPct) / 100;
  const startedX = pad + ((w - pad * 2) * startBand) / 100;

  const scopePath = `M ${pad} ${bottom} L ${pad} ${lowY} C ${w * 0.35} ${lowY - 2}, ${w * 0.65} ${lowY + 1}, ${endX} ${lowY} L ${endX} ${bottom} Z`;
  const startedPath = `M ${pad} ${bottom} L ${pad} ${midY} C ${startedX * 0.45} ${midY - 4}, ${startedX * 0.75} ${midY + 2}, ${startedX} ${midY} L ${startedX} ${bottom} Z`;
  const completedPath = `M ${pad} ${bottom} L ${pad} ${top + 6} C ${completedX * 0.4} ${top}, ${completedX * 0.7} ${top + 8}, ${completedX} ${top + 4} L ${completedX} ${bottom} Z`;

  return (
    <svg
      className="mt-2 h-12 w-full text-muted-foreground"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={completedFillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id={startedFillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <path d={scopePath} fill="currentColor" opacity="0.08" />
      {startBand > 0 ? (
        <path d={startedPath} fill={`url(#${startedFillId})`} />
      ) : null}
      {completedPct > 0 ? (
        <path d={completedPath} fill={`url(#${completedFillId})`} />
      ) : null}

      <path
        d={`M ${pad} ${lowY} C ${w * 0.35} ${lowY - 2}, ${w * 0.65} ${lowY + 1}, ${endX} ${lowY}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      {startBand > 0 ? (
        <path
          d={`M ${pad} ${midY} C ${startedX * 0.45} ${midY - 4}, ${startedX * 0.75} ${midY + 2}, ${startedX} ${midY}`}
          fill="none"
          stroke="rgb(245 158 11)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : null}
      {completedPct > 0 ? (
        <path
          d={`M ${pad} ${top + 6} C ${completedX * 0.4} ${top}, ${completedX * 0.7} ${top + 8}, ${completedX} ${top + 4}`}
          fill="none"
          stroke="rgb(139 92 246)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : null}

      {startBand > 0 ? (
        <circle cx={startedX} cy={midY} r="2.25" fill="rgb(245 158 11)" />
      ) : null}
      {completedPct > 0 ? (
        <circle cx={completedX} cy={top + 4} r="2.5" fill="rgb(139 92 246)" />
      ) : null}
    </svg>
  );
}
