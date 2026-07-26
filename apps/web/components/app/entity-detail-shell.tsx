"use client";

import type { ReactNode } from "react";

import { EntityErrorAlert } from "@/components/app/entity-list-shell";
import { Spinner } from "@/components/ui/spinner";

type EntityDetailShellProps = {
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
};

/** Shared padding / loading / error chrome for task, note, and contact detail. */
export function EntityDetailShell({
  loading = false,
  error,
  children,
}: EntityDetailShellProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      {error ? <EntityErrorAlert message={error} /> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          Loading…
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function EntityDetailLayout({
  main,
  aside,
}: {
  main: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">{main}</div>
      <aside className="flex min-w-0 flex-col gap-3">{aside}</aside>
    </div>
  );
}
