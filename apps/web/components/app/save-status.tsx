"use client";

import type { AutosaveStatus } from "@/lib/hooks/use-autosave";
import { cn } from "@/lib/utils";

type SaveStatusProps = {
  status: AutosaveStatus;
  savedAt: string | null;
  onRetry?: () => void;
  className?: string;
};

export function SaveStatus({
  status,
  savedAt,
  onRetry,
  className,
}: SaveStatusProps) {
  switch (status) {
    case "idle":
      return null;
    case "dirty":
      return (
        <span className={cn("text-xs text-muted-foreground", className)}>
          Unsaved changes
        </span>
      );
    case "saving":
      return (
        <span className={cn("text-xs text-muted-foreground", className)}>
          Saving…
        </span>
      );
    case "saved":
      return (
        <span className={cn("text-xs text-muted-foreground", className)}>
          {savedAt ? `Saved ${savedAt}` : "Saved"}
        </span>
      );
    case "error":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-2 text-xs text-destructive",
            className,
          )}
        >
          Save failed
          {onRetry ? (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-destructive/80"
              onClick={onRetry}
            >
              Retry
            </button>
          ) : null}
        </span>
      );
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
