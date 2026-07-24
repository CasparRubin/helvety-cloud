"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  loadDecryptedProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";
import { cn } from "@/lib/utils";

type SidebarProjectsProps = {
  workspaceId: string;
  activeProjectId: string | null;
  projectsHomeActive?: boolean;
};

export function SidebarProjects({
  workspaceId,
  activeProjectId,
  projectsHomeActive = false,
}: SidebarProjectsProps) {
  const { vault, getWorkspaceKey } = useVaultSession();
  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    const page = await loadDecryptedProjects(workspaceId, key, {
      limit: 100,
    });
    setProjects(page.projects);
    setError(null);
  }, [getWorkspaceKey, workspaceId]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedProjects(workspaceId, key, {
          limit: 100,
        });
        if (cancelled) return;
        setProjects(page.projects);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setProjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, getWorkspaceKey]);

  useEffect(() => {
    if (!vault) return;
    const onChange = () => {
      void refresh().catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
      });
    };
    window.addEventListener("helvety:projects-changed", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener("helvety:projects-changed", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [vault, refresh]);

  if (!vault) return null;

  return (
    <div className="flex flex-col gap-1">
      <Link
        href={`/app/w/${workspaceId}`}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          !activeProjectId &&
            projectsHomeActive &&
            "bg-sidebar-accent text-sidebar-accent-foreground",
        )}
      >
        All projects
      </Link>
      {error ? (
        <p className="px-2 text-xs text-destructive">{error}</p>
      ) : projects.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">No projects</p>
      ) : (
        projects.map((p) => (
          <Link
            key={p.id}
            href={`/app/w/${workspaceId}/p/${p.id}`}
            className={cn(
              "truncate rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              activeProjectId === p.id &&
                "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
            title={p.name}
          >
            {p.name}
          </Link>
        ))
      )}
    </div>
  );
}
