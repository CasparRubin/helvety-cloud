"use client";

import { SaveStatus } from "@/components/app/save-status";
import { Card, CardContent } from "@/components/ui/card";
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
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Created</span>{" "}
          {formatDateTime(createdAt)}
        </p>
        <p>
          <span className="font-medium text-foreground">Modified</span>{" "}
          {formatDateTime(updatedAt)}
        </p>
        <SaveStatus status={status} savedAt={savedAt} onRetry={onRetry} />
      </CardContent>
    </Card>
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
