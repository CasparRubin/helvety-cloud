"use client";

import { useDateTimePrefs } from "@/components/app/datetime-prefs";
import { SaveStatus } from "@/components/app/save-status";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format-datetime";
import type { AutosaveStatus } from "@/lib/hooks/use-autosave";

type EntityTimestampsCardProps = {
  createdAt: string;
  updatedAt: string;
  status: AutosaveStatus;
  savedAt: string | null;
  onRetry?: () => void;
};

export function EntityTimestampsCard({
  createdAt,
  updatedAt,
  status,
  savedAt,
  onRetry,
}: EntityTimestampsCardProps) {
  const { prefs } = useDateTimePrefs();

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Created</span>{" "}
          {formatDateTime(createdAt, prefs)}
        </p>
        <p>
          <span className="font-medium text-foreground">Modified</span>{" "}
          {formatDateTime(updatedAt, prefs)}
        </p>
        <SaveStatus status={status} savedAt={savedAt} onRetry={onRetry} />
      </CardContent>
    </Card>
  );
}
