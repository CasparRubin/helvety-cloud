"use client";

import { useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CATEGORIZATION_ICON_COMPONENTS } from "@/lib/client-crypto/categorization-icons";
import {
  resolveStageColor,
  type CategorizationOption,
} from "@/lib/client-crypto/categorizations";
import { ENTITY_COLOR_CLASSES } from "@/lib/client-crypto/entity-colors";
import { cn } from "@/lib/utils";

type CategorizationPickerProps = {
  options: CategorizationOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  useStageColor?: boolean;
  disabled?: boolean;
  variant?: "outline" | "ghost";
  className?: string;
  "aria-label"?: string;
};

export function CategorizationPicker({
  options,
  value,
  onChange,
  allowNone = false,
  noneLabel = "None",
  useStageColor = false,
  disabled,
  variant = "outline",
  className,
  "aria-label": ariaLabel,
}: CategorizationPickerProps) {
  const [open, setOpen] = useState(false);
  const sorted = [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  const selected =
    value == null || value === ""
      ? null
      : (sorted.find((o) => o.id === value) ?? null);
  const resolveOptionColor = (option: CategorizationOption | null | undefined) => {
    if (!option) return undefined;
    return useStageColor ? resolveStageColor(option) : option.color;
  };
  const tintColor = resolveOptionColor(selected);
  const tint = tintColor ? ENTITY_COLOR_CLASSES[tintColor] : null;
  const SelectedIcon = selected?.icon
    ? CATEGORIZATION_ICON_COMPONENTS[selected.icon]
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant={variant}
            size="sm"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "h-8 max-w-[12rem] justify-between gap-1.5 px-2 font-normal",
              tint &&
                cn(
                  tint.bg,
                  tint.text,
                  variant === "outline" &&
                    cn("border-transparent ring-1", tint.ring),
                ),
              className,
            )}
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {SelectedIcon ? (
            <SelectedIcon className="size-3.5 shrink-0" aria-hidden />
          ) : null}
          <span className="truncate text-xs">
            {selected?.name ?? (allowNone ? noneLabel : "Select…")}
          </span>
        </span>
        <ChevronsUpDownIcon className="size-3 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {allowNone ? (
            <li>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                  selected === null && "bg-muted",
                )}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">{noneLabel}</span>
              </button>
            </li>
          ) : null}
          {sorted.map((opt) => {
            const rowColor = resolveOptionColor(opt);
            const rowTint = rowColor
              ? ENTITY_COLOR_CLASSES[rowColor]
              : null;
            const Icon = opt.icon
              ? CATEGORIZATION_ICON_COMPONENTS[opt.icon]
              : null;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                    selected?.id === opt.id && "bg-muted",
                    rowTint && cn(rowTint.bg, rowTint.text),
                  )}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  {Icon ? (
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  <span className="truncate">{opt.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
