"use client";

import { useState } from "react";
import { ChevronsUpDownIcon, FlagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateTimePrefs } from "@/components/app/datetime-prefs";
import { formatDateRange } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type MilestoneOption = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
};

type MilestonePickerProps = {
  options: MilestoneOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function MilestonePicker({
  options,
  value,
  onChange,
  allowNone = true,
  noneLabel = "No milestone",
  disabled,
  className,
  "aria-label": ariaLabel,
}: MilestonePickerProps) {
  const { prefs } = useDateTimePrefs();
  const [open, setOpen] = useState(false);
  const selected =
    value == null || value === ""
      ? null
      : (options.find((o) => o.id === value) ?? null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "h-8 max-w-[14rem] justify-between gap-1.5 px-2 font-normal",
              className,
            )}
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FlagIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="truncate text-xs">
            {selected?.title ?? (allowNone ? noneLabel : "Select…")}
          </span>
        </span>
        <ChevronsUpDownIcon className="size-3 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {allowNone ? (
            <li>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  selected == null && "bg-muted",
                )}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                {noneLabel}
              </button>
            </li>
          ) : null}
          {options.map((option) => {
            const range = formatDateRange(
              option.startDate,
              option.endDate,
              prefs,
            );
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                    selected?.id === option.id && "bg-muted",
                  )}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate font-medium">{option.title}</span>
                  {range !== "No dates" ? (
                    <span className="text-xs text-muted-foreground">
                      {range}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
