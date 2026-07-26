"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  /** Nested project settings under /p/{id}/settings. */
  projectSettings: boolean;
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
    projectSettings: false,
  };

  if (!section) return { ...base, section: "projects" };

  if (section === "p") {
    if (!entityId) return { ...base, section: "projects" };
    const onProjectSettings = childSegment === "settings";
    return {
      ...base,
      section: "projects",
      entity: { kind: "project", id: entityId },
      taskId: childSegment === "t" && childId ? childId : null,
      projectSettings: onProjectSettings,
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
  const { workspaceBase, section, entity, taskId, projectSettings } = location;

  if (entity) {
    switch (entity.kind) {
      case "project":
        return taskId || projectSettings
          ? `${workspaceBase}/p/${entity.id}`
          : workspaceBase;
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

/** True for workspace-scoped app routes (excludes bare `/app`). */
export function isInAppWorkspacePath(pathname: string): boolean {
  return pathname.startsWith("/app/w/");
}

type NavBackMode = "history" | "parent" | "none";

/** Prefer in-app history; otherwise logical parent; otherwise disabled. */
export function resolveNavBackMode(input: {
  hasInAppPredecessor: boolean;
  parentHref: string | null;
}): NavBackMode {
  if (input.hasInAppPredecessor) return "history";
  if (input.parentHref) return "parent";
  return "none";
}

/**
 * Tracks in-app pathnames so Back can use `router.back()` when the user
 * arrived via an in-app navigation (e.g. note → task), not only logical parent.
 */
export function useInAppNavHistory(pathname: string): {
  hasInAppPredecessor: boolean;
  noteParentReplace: (href: string) => void;
} {
  const stackRef = useRef<string[]>([]);
  const [hasInAppPredecessor, setHasInAppPredecessor] = useState(false);

  useLayoutEffect(() => {
    if (!pathname.startsWith("/app")) return;

    const stack = stackRef.current;
    const last = stack[stack.length - 1];
    if (last === pathname) {
      setHasInAppPredecessor(
        stack.length >= 2 && isInAppWorkspacePath(stack[stack.length - 2]!),
      );
      return;
    }

    // Browser / router.back(): new path matches the previous stack entry.
    if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
      stack.pop();
    } else {
      stack.push(pathname);
      if (stack.length > 50) stack.shift();
    }

    setHasInAppPredecessor(
      stack.length >= 2 && isInAppWorkspacePath(stack[stack.length - 2]!),
    );
  }, [pathname]);

  const noteParentReplace = useCallback((href: string) => {
    const stack = stackRef.current;
    if (stack.length > 0) {
      stack[stack.length - 1] = href;
    } else {
      stack.push(href);
    }
    setHasInAppPredecessor(
      stack.length >= 2 && isInAppWorkspacePath(stack[stack.length - 2]!),
    );
  }, []);

  return { hasInAppPredecessor, noteParentReplace };
}

type NavBackButtonProps = {
  mode: NavBackMode;
  parentHref: string | null;
  onParentNavigate?: (href: string) => void;
};

export function NavBackButton({
  mode,
  parentHref,
  onParentNavigate,
}: NavBackButtonProps) {
  const router = useRouter();
  const disabled = mode === "none";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title="Back"
      disabled={disabled}
      onClick={() => {
        if (mode === "history") {
          router.back();
          return;
        }
        if (mode === "parent" && parentHref) {
          onParentNavigate?.(parentHref);
          router.replace(parentHref);
        }
      }}
    >
      <ChevronLeftIcon />
      Back
    </Button>
  );
}
