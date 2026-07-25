"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ContactIcon,
  FolderKanbanIcon,
  SettingsIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";

import { TaskJumpSwitcher } from "@/components/app/task-jump-switcher";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { WorkspaceJumpSwitcher } from "@/components/app/workspace-jump-switcher";
import {
  NavBackButton,
  NavSeparator,
  parentHrefFor,
  parseAppNavPath,
} from "@/components/app/workspace-nav";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { UnlockGate } from "@/components/vault/unlock-gate";
import { VaultEntityCacheProvider } from "@/components/vault/vault-entity-cache";
import {
  useVaultSession,
  VaultSessionProvider,
} from "@/components/vault/vault-session-provider";
import {
  loadLastWorkspaceId,
  pickDefaultWorkspaceId,
  storeLastWorkspaceId,
} from "@/lib/vault/workspaces";
import { cn } from "@/lib/utils";

type AppShellProps = {
  email: string;
  userId: string;
  children: React.ReactNode;
};

function SidebarLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-60" />
      {children}
    </Link>
  );
}

function AppShellInner({ email, userId, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { vault, recovery, workspaces } = useVaultSession();

  const location = parseAppNavPath(pathname);
  const activeWorkspaceId = location?.workspaceId ?? null;
  const workspaceBase = location?.workspaceBase ?? null;
  const backHref = location ? parentHrefFor(location) : null;
  const projectsActive = location?.section === "projects";
  const notesActive = location?.section === "notes";
  const contactsActive = location?.section === "contacts";
  const settingsActive = location?.section === "settings";

  const onAppIndex = pathname === "/app" || pathname === "/app/";
  const shouldRedirectToWorkspace =
    Boolean(vault) && !recovery && workspaces.length > 0 && onAppIndex;

  useEffect(() => {
    if (!shouldRedirectToWorkspace) return;
    const preferred = loadLastWorkspaceId(userId);
    const id = pickDefaultWorkspaceId(workspaces, preferred);
    if (!id) return;
    storeLastWorkspaceId(userId, id);
    router.replace(`/app/w/${id}`);
  }, [shouldRedirectToWorkspace, userId, workspaces, router]);

  if (!vault || recovery) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center p-6">
        <UnlockGate email={email} userId={userId} />
      </main>
    );
  }

  if (shouldRedirectToWorkspace) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
        Opening workspace…
      </main>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Link
          href="/app"
          title="Helvety Cloud"
          className="size-6 shrink-0"
        >
          <Image
            src="/icon.svg"
            width={24}
            height={24}
            alt="Helvety Cloud"
            className="size-6 rounded-md"
            priority
          />
        </Link>
        {backHref ? <NavBackButton href={backHref} /> : null}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5"
        >
          <WorkspaceSwitcher
            userId={userId}
            activeWorkspaceId={activeWorkspaceId}
          />
          {location?.entity ? (
            <>
              <NavSeparator />
              <WorkspaceJumpSwitcher
                workspaceId={location.workspaceId}
                active={location.entity}
              />
            </>
          ) : null}
          {location?.entity?.kind === "project" && location.taskId ? (
            <>
              <NavSeparator />
              <TaskJumpSwitcher
                workspaceId={location.workspaceId}
                projectId={location.entity.id}
                taskId={location.taskId}
              />
            </>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu email={email} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2 text-sm">
            {workspaceBase ? (
              <>
                <SidebarLink
                  href={workspaceBase}
                  active={projectsActive}
                  icon={FolderKanbanIcon}
                >
                  Projects
                </SidebarLink>
                <SidebarLink
                  href={`${workspaceBase}/notes`}
                  active={notesActive}
                  icon={StickyNoteIcon}
                >
                  Notes
                </SidebarLink>
                <SidebarLink
                  href={`${workspaceBase}/contacts`}
                  active={contactsActive}
                  icon={ContactIcon}
                >
                  Contacts
                </SidebarLink>
                <div className="my-1 border-t border-sidebar-border" />
                <SidebarLink
                  href={`${workspaceBase}/settings`}
                  active={settingsActive}
                  icon={SettingsIcon}
                >
                  Settings
                </SidebarLink>
              </>
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Select a workspace
              </p>
            )}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          {activeWorkspaceId ? (
            <VaultEntityCacheProvider
              key={activeWorkspaceId}
              workspaceId={activeWorkspaceId}
            >
              {children}
            </VaultEntityCacheProvider>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <VaultSessionProvider>
      <AppShellInner {...props} />
    </VaultSessionProvider>
  );
}
