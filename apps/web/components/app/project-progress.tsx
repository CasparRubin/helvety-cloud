"use client";

import { useId, useMemo } from "react";

import { DateTimeText } from "@/components/app/datetime-text";
import type { ProjectCategorizations } from "@/lib/client-crypto/categorizations";
import type { DecryptedMilestone } from "@/lib/client-crypto/milestones";
import {
  computeProjectProgressView,
  scheduleProgressFraction,
} from "@/lib/client-crypto/project-progress";
import type { DecryptedTask } from "@/lib/client-crypto/tasks";
import { cn } from "@/lib/utils";

type ProjectProgressProps = {
  tasks: DecryptedTask[];
  categorizations: ProjectCategorizations;
  milestones: DecryptedMilestone[];
  milestoneFilter: string;
  className?: string;
};

export function ProjectProgress({
  tasks,
  categorizations,
  milestones,
  milestoneFilter,
  className,
}: ProjectProgressProps) {
  const view = useMemo(
    () =>
      computeProjectProgressView(
        tasks,
        categorizations,
        milestones,
        milestoneFilter,
      ),
    [tasks, categorizations, milestones, milestoneFilter],
  );

  return (
    <section
      className={cn(
        "mt-3 shrink-0 border-t border-border pt-3",
        className,
      )}
      aria-label="Project progress"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Progress</h3>
        {view.scopeCount > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {view.weightedPercent}% done
          </span>
        ) : null}
      </div>

      {!view.window ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {milestoneFilter === "all"
            ? "Add milestones with start and end dates to chart progress."
            : "This milestone needs both a start and end date."}
        </p>
      ) : (
        <>
          <ProgressScheduleChart
            windowStart={view.window.startDate}
            windowEnd={view.window.endDate}
            todayIso={view.todayIso}
            weightedPercent={view.weightedPercent}
            scopeCount={view.scopeCount}
          />
          <p className="mt-2 truncate text-[11px] text-muted-foreground">
            {view.window.label ? (
              <>
                {view.window.label}
                {" · "}
              </>
            ) : null}
            <DateTimeText
              mode="range"
              startDate={view.window.startDate}
              endDate={view.window.endDate}
              className="text-[11px]"
            />
            {view.scopeCount > 0
              ? ` · ${view.scopeCount} task${view.scopeCount === 1 ? "" : "s"}`
              : " · No tasks in scope"}
          </p>
        </>
      )}
    </section>
  );
}

function ProgressScheduleChart({
  windowStart,
  windowEnd,
  todayIso,
  weightedPercent,
  scopeCount,
}: {
  windowStart: string;
  windowEnd: string;
  todayIso: string;
  weightedPercent: number;
  scopeCount: number;
}) {
  const fillId = `${useId().replace(/:/g, "")}-actual`;

  const w = 200;
  const h = 64;
  const left = 4;
  const right = w - 4;
  const top = 8;
  const bottom = h - 6;
  const chartW = right - left;
  const chartH = bottom - top;

  const todayFrac = scheduleProgressFraction(todayIso, windowStart, windowEnd);
  const pct = Math.min(100, Math.max(0, weightedPercent)) / 100;
  const todayX = left + todayFrac * chartW;
  const actualY = bottom - pct * chartH;

  function risePath(endX: number, endY: number): string {
    if (endX <= left) return `M ${left} ${bottom}`;
    const c1x = left + (endX - left) * 0.45;
    const c2x = left + (endX - left) * 0.78;
    return `M ${left} ${bottom} C ${c1x} ${bottom}, ${c2x} ${endY}, ${endX} ${endY}`;
  }

  const showActual = scopeCount > 0;

  return (
    <svg
      className="mt-2 h-16 w-full text-muted-foreground"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={
        showActual
          ? `${weightedPercent}% complete`
          : "Schedule progress chart"
      }
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path
        d={`M ${left} ${top} L ${right} ${top}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d={`M ${left} ${bottom} L ${right} ${top}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.25"
        strokeDasharray="3.5 3"
        strokeLinecap="round"
      />

      {showActual ? (
        <>
          <path
            d={`${risePath(todayX, actualY)} L ${todayX} ${bottom} L ${left} ${bottom} Z`}
            fill={`url(#${fillId})`}
          />
          <path
            d={risePath(todayX, actualY)}
            fill="none"
            stroke="rgb(139 92 246)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx={todayX} cy={actualY} r="2.5" fill="rgb(139 92 246)" />
        </>
      ) : null}
    </svg>
  );
}
