"use client";

import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/v1-client";

export function isLimitExceededError(err: unknown): boolean {
  return err instanceof ApiClientError && err.code === "limit_exceeded";
}

function billingHref(workspaceId: string): string {
  return `/app/w/${workspaceId}/settings/billing`;
}

function BillingAction({ href }: { href: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="self-start"
      render={<Link href={href} />}
      nativeButton={false}
    >
      Open Billing
    </Button>
  );
}

/** Compact notice for dialogs and inline forms. */
export function LimitExceededInline({
  message,
  workspaceId,
  href,
}: {
  message: string;
  workspaceId?: string;
  /** Override destination (e.g. /pricing). Defaults to workspace Billing. */
  href?: string;
}) {
  const actionHref = href ?? (workspaceId ? billingHref(workspaceId) : "/pricing");
  return (
    <div className="flex flex-col gap-2" role="alert">
      <p className="text-xs text-destructive">{message}</p>
      <BillingAction href={actionHref} />
    </div>
  );
}

/** Alert used on list/detail pages when a create or upload hits a plan limit. */
export function LimitExceededAlert({
  message,
  workspaceId,
  href,
  title = "Limit reached",
}: {
  message: string;
  workspaceId?: string;
  href?: string;
  title?: string;
}) {
  const actionHref = href ?? (workspaceId ? billingHref(workspaceId) : "/pricing");
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{message}</span>
        <BillingAction href={actionHref} />
      </AlertDescription>
    </Alert>
  );
}
