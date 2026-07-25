"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { EntityLinkKind } from "@helvety-cloud/api-contract";

import { useOptionalVaultEntityCache } from "@/components/vault/vault-entity-cache";
import {
  ENTITY_COLOR_CLASSES,
  KIND_FALLBACK_COLOR,
  type EntityColor,
} from "@/lib/vault/entity-colors";
import { cn } from "@/lib/utils";

type EntityChipProps = {
  kind: EntityLinkKind;
  id: string;
  navigate?: boolean;
  className?: string;
};

export function EntityChip({
  kind,
  id,
  navigate = true,
  className,
}: EntityChipProps) {
  const cache = useOptionalVaultEntityCache();
  const resolved = useMemo(() => {
    if (cache) return cache.resolve(kind, id);
    return {
      kind,
      id,
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
      color: KIND_FALLBACK_COLOR[kind] as EntityColor,
      href: null as string | null,
      deleted: false,
      done: false,
      badges: undefined as { key: string; label: string }[] | undefined,
    };
  }, [cache, kind, id]);

  const color: EntityColor =
    resolved.color ?? KIND_FALLBACK_COLOR[kind] ?? "slate";
  const classes = ENTITY_COLOR_CLASSES[color];
  const href = resolved.href;
  const muted = resolved.deleted || resolved.done;

  const inner = (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        classes.bg,
        classes.text,
        classes.ring,
        muted && "opacity-60 line-through",
        className,
      )}
      title={resolved.label}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", classes.dot)} />
      <span className="truncate">{resolved.label}</span>
      {resolved.badges?.map((b) => (
        <span
          key={b.key}
          className="truncate rounded bg-background/50 px-1 text-[10px] font-normal opacity-90"
        >
          {b.label}
        </span>
      ))}
    </span>
  );

  if (navigate && href) {
    return (
      <Link
        href={href}
        className="inline-flex align-baseline no-underline"
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
