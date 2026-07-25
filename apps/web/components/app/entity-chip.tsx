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

function kindLabel(kind: EntityLinkKind): string {
  switch (kind) {
    case "note":
      return "Note";
    case "task":
      return "Task";
    case "contact":
      return "Contact";
    case "project":
      return "Project";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

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
      label: kindLabel(kind),
      color: KIND_FALLBACK_COLOR[kind] as EntityColor,
      href: null as string | null,
      deleted: false,
      done: false,
      badges: undefined as string[] | undefined,
    };
  }, [cache, kind, id]);

  const color = resolved.color;
  const classes = ENTITY_COLOR_CLASSES[color];
  const href = resolved.href;
  const muted = resolved.deleted || resolved.done;

  const title = [kindLabel(resolved.kind), resolved.label]
    .concat(resolved.badges ?? [])
    .join(" · ");

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
      title={title}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", classes.dot)} />
      <span className="truncate">{resolved.label}</span>
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
