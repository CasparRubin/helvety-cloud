"use client";

import {
  ENTITY_COLOR_TOKENS,
  ENTITY_COLOR_CLASSES,
  type EntityColor,
} from "@/lib/client-crypto/entity-colors";
import { cn } from "@/lib/utils";

type ColorPickerProps = {
  value?: EntityColor;
  onChange: (color: EntityColor | undefined) => void;
  disabled?: boolean;
  /** Hide the “Accent color” label (e.g. stage rows). */
  compact?: boolean;
};

export function EntityColorPicker({
  value,
  onChange,
  disabled,
  compact = false,
}: ColorPickerProps) {
  return (
    <div className={cn("flex flex-col gap-1", compact && "gap-1")}>
      {compact ? null : (
        <span className="text-xs text-muted-foreground">Accent color</span>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          title="Automatic color"
          aria-label="Automatic color"
          className={cn(
            "h-7 rounded border px-2 text-[10px]",
            !value
              ? "border-foreground bg-muted"
              : "border-input text-muted-foreground",
          )}
          onClick={() => onChange(undefined)}
        >
          Auto
        </button>
        {ENTITY_COLOR_TOKENS.map((token) => {
          const c = ENTITY_COLOR_CLASSES[token];
          return (
            <button
              key={token}
              type="button"
              disabled={disabled}
              title={token}
              aria-label={token}
              aria-pressed={value === token}
              className={cn(
                "size-7 rounded-full ring-2 ring-offset-1 ring-offset-background",
                c.dot,
                value === token ? "ring-foreground" : "ring-transparent",
              )}
              onClick={() => onChange(token)}
            />
          );
        })}
      </div>
    </div>
  );
}
