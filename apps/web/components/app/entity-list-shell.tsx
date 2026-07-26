"use client";

import type { ReactNode } from "react";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type EntityListShellProps = {
  title: ReactNode;
  belowTitle?: ReactNode;
  error?: string | null;
  loading?: boolean;
  loadingLabel?: string;
  empty?: boolean;
  emptyLabel?: ReactNode;
  bareChildren?: boolean;
  children?: ReactNode;
};

export function EntityListShell({
  title,
  belowTitle,
  error,
  loading = false,
  loadingLabel = "Loading…",
  empty = false,
  emptyLabel = "Nothing here yet.",
  bareChildren = false,
  children,
}: EntityListShellProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="min-w-0">
          {typeof title === "string" || typeof title === "number" ? (
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          ) : (
            title
          )}
        </div>

        {belowTitle}
      </div>

      {error ? <EntityErrorAlert message={error} /> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {loadingLabel}
        </div>
      ) : empty ? (
        <EntityListEmpty>{emptyLabel}</EntityListEmpty>
      ) : bareChildren ? (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      ) : (
        <ul className="flex flex-col gap-1">{children}</ul>
      )}
    </div>
  );
}

export function EntityErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function EntityListEmpty({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EntityListRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40",
        className,
      )}
    >
      {children}
    </li>
  );
}
