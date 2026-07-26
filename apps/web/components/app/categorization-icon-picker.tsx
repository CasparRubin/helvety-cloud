"use client";

import {
  CATEGORIZATION_ICON_COMPONENTS,
  CATEGORIZATION_ICON_TOKENS,
  type CategorizationIcon,
} from "@/lib/client-crypto/categorization-icons";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  value?: CategorizationIcon;
  onChange: (icon: CategorizationIcon | undefined) => void;
  disabled?: boolean;
  /** Hide the label (e.g. option rows). */
  compact?: boolean;
};

export function CategorizationIconPicker({
  value,
  onChange,
  disabled,
  compact = false,
}: IconPickerProps) {
  return (
    <div className={cn("flex flex-col gap-1", compact && "gap-0")}>
      {compact ? null : (
        <span className="text-xs text-muted-foreground">Icon</span>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-6 rounded border px-2 text-[10px]",
            !value
              ? "border-foreground bg-muted"
              : "border-input text-muted-foreground",
          )}
          onClick={() => onChange(undefined)}
        >
          None
        </button>
        {CATEGORIZATION_ICON_TOKENS.map((token) => {
          const Icon = CATEGORIZATION_ICON_COMPONENTS[token];
          return (
            <button
              key={token}
              type="button"
              disabled={disabled}
              title={token}
              aria-label={token}
              aria-pressed={value === token}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md ring-2 ring-offset-1 ring-offset-background",
                value === token
                  ? "bg-muted ring-foreground"
                  : "ring-transparent hover:bg-muted/60",
              )}
              onClick={() => onChange(token)}
            >
              <Icon className="size-3.5" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
