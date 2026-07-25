"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EntityListShellProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  createForm?: ReactNode;
  error?: string | null;
  loading?: boolean;
  loadingLabel?: string;
  empty?: boolean;
  emptyLabel?: ReactNode;
  /** When true, skip the default vertical list wrapper (e.g. custom board layout). */
  bareChildren?: boolean;
  children?: ReactNode;
};

export function EntityListShell({
  title,
  subtitle,
  actions,
  createForm,
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {createForm}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{loadingLabel}</p>
      ) : empty ? (
        <EntityListEmpty>{emptyLabel}</EntityListEmpty>
      ) : bareChildren ? (
        children
      ) : (
        <ul className="flex flex-col gap-1">{children}</ul>
      )}
    </div>
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
        "rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground",
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
        "rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40",
        className,
      )}
    >
      {children}
    </li>
  );
}
