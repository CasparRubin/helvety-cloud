"use client";

import { DateTimeText } from "@/components/app/datetime-text";
import type { AutosaveStatus } from "@/lib/hooks/use-autosave";

type SaveStatusProps = {
  status: AutosaveStatus;
  savedAt: string | null;
  onRetry?: () => void;
};

export function SaveStatus({ status, savedAt, onRetry }: SaveStatusProps) {
  switch (status) {
    case "idle":
      return null;
    case "dirty":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "saving":
      return <span className="text-xs text-muted-foreground">Saving…</span>;
    case "saved":
      return (
        <span className="text-xs text-muted-foreground">
          {savedAt ? (
            <>
              Saved <DateTimeText mode="time" value={savedAt} />
            </>
          ) : (
            "Saved"
          )}
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-2 text-xs text-destructive">
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
