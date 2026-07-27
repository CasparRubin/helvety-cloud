"use client";

import { useDateTimePrefs } from "@/components/app/datetime-prefs";
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatTime,
  type DateTimePrefs,
} from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type DateTimeTextBase = {
  className?: string;
  prefs?: DateTimePrefs;
};

type DateTimeTextProps = DateTimeTextBase &
  (
    | { mode?: "datetime"; value: string }
    | { mode: "date"; value: string }
    | { mode: "time"; value: string }
    | { mode: "range"; startDate: string | null; endDate: string | null }
  );

export function DateTimeText(props: DateTimeTextProps) {
  const ctx = useDateTimePrefs();
  const prefs = props.prefs ?? ctx.prefs;
  const { className } = props;

  let text: string;
  if (props.mode === "date") {
    text = formatDate(props.value, prefs);
  } else if (props.mode === "time") {
    text = formatTime(props.value, prefs);
  } else if (props.mode === "range") {
    text = formatDateRange(props.startDate, props.endDate, prefs);
  } else {
    text = formatDateTime(props.value, prefs);
  }

  return (
    <span className={cn("font-mono tabular-nums", className)}>{text}</span>
  );
}
