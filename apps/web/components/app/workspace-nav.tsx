"use client";

import Link from "next/link";
import { ChevronLeftIcon, SlashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export type AppNavEntity = {
  kind: "project" | "note" | "contact";
  id: string;
};

type AppNavLocation = {
  workspaceId: string;
  workspaceBase: string;
  section: "projects" | "notes" | "contacts" | "settings" | null;
  entity: AppNavEntity | null;
  taskId: string | null;
};

const WORKSPACE_PREFIX = "/app/w/";

export function parseAppNavPath(pathname: string): AppNavLocation | null {
  if (!pathname.startsWith(WORKSPACE_PREFIX)) return null;

  const [workspaceId, section, entityId, childSegment, childId] = pathname
    .slice(WORKSPACE_PREFIX.length)
    .split("/")
    .filter(Boolean);

  if (!workspaceId) return null;

  const base: AppNavLocation = {
    workspaceId,
    workspaceBase: `${WORKSPACE_PREFIX}${workspaceId}`,
    section: null,
    entity: null,
    taskId: null,
  };

  if (!section) return { ...base, section: "projects" };

  if (section === "p") {
    if (!entityId) return { ...base, section: "projects" };
    return {
      ...base,
      section: "projects",
      entity: { kind: "project", id: entityId },
      taskId: childSegment === "t" && childId ? childId : null,
    };
  }

  if (section === "notes") {
    return {
      ...base,
      section: "notes",
      entity: entityId ? { kind: "note", id: entityId } : null,
    };
  }

  if (section === "contacts") {
    return {
      ...base,
      section: "contacts",
      entity: entityId ? { kind: "contact", id: entityId } : null,
    };
  }

  if (section === "settings") return { ...base, section: "settings" };

  return base;
}

export function parentHrefFor(location: AppNavLocation): string | null {
  const { workspaceBase, section, entity, taskId } = location;

  if (entity) {
    switch (entity.kind) {
      case "project":
        return taskId ? `${workspaceBase}/p/${entity.id}` : workspaceBase;
      case "note":
        return `${workspaceBase}/notes`;
      case "contact":
        return `${workspaceBase}/contacts`;
      default: {
        const _exhaustive: never = entity.kind;
        return _exhaustive;
      }
    }
  }

  return section === "projects" || section === null ? null : workspaceBase;
}

export function NavSeparator() {
  return (
    <SlashIcon
      role="presentation"
      aria-hidden="true"
      className="size-3.5 shrink-0 text-muted-foreground/50"
    />
  );
}

export function NavBackButton({ href }: { href: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Back"
      title="Back"
      className="text-muted-foreground hover:text-foreground"
      render={<Link href={href} />}
      nativeButton={false}
    >
      <ChevronLeftIcon />
    </Button>
  );
}
