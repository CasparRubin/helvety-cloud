"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ContactIcon,
  FolderKanbanIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";

import { AccountFooter } from "@/components/app/account-footer";
import {
  PageActionsProvider,
  PageActionsSlot,
} from "@/components/app/page-actions";
import { TaskJumpSwitcher } from "@/components/app/task-jump-switcher";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { WorkspaceJumpSwitcher } from "@/components/app/workspace-jump-switcher";
import {
  NavBackButton,
  NavSeparator,
  parentHrefFor,
  parseAppNavPath,
  resolveNavBackMode,
  useInAppNavHistory,
} from "@/components/app/workspace-nav";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { ButtonGroup } from "@/components/ui/button-group";
import { UnlockGate } from "@/components/unlock/unlock-gate";
import { EntityCacheProvider } from "@/components/unlock/entity-cache";
import {
  useCryptoSession,
  CryptoSessionProvider,
} from "@/components/unlock/crypto-session-provider";
import {
  loadLastWorkspaceId,
  pickDefaultWorkspaceId,
  storeLastWorkspaceId,
} from "@/lib/client-crypto/workspaces";
import { cn } from "@/lib/utils";

type AppShellProps = {
  email: string;
  userId: string;
  children: React.ReactNode;
};

type SectionId = "projects" | "notes" | "contacts";

function workspaceSections(workspaceBase: string): {
  id: SectionId;
  href: string;
  label: string;
  icon: LucideIcon;
}[] {
  return [
    {
      id: "projects",
      href: workspaceBase,
      label: "Projects",
      icon: FolderKanbanIcon,
    },
    {
      id: "notes",
      href: `${workspaceBase}/notes`,
      label: "Notes",
      icon: StickyNoteIcon,
    },
    {
      id: "contacts",
      href: `${workspaceBase}/contacts`,
      label: "Contacts",
      icon: ContactIcon,
    },
  ];
}

function SectionLink({
  href,
  active,
  icon: Icon,
  children,
  variant,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
  variant: "sidebar" | "mobile";
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        variant === "sidebar"
          ? "flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
        active &&
          (variant === "sidebar"
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "bg-muted text-foreground"),
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          variant === "sidebar" ? "opacity-60" : "opacity-70",
        )}
      />
      {children}
    </Link>
  );
}

function AppShellInner({ email, userId, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userKeys, recovery, workspaces } = useCryptoSession();

  const location = parseAppNavPath(pathname);
  const activeWorkspaceId = location?.workspaceId ?? null;
  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const activeWorkspaceName = activeWorkspace?.name ?? null;
  const planLabel = activeWorkspace
    ? activeWorkspace.plan === "pro"
      ? "Pro"
      : "Free"
    : null;
  const workspaceBase = location?.workspaceBase ?? null;
  const onWorkspaceHome = Boolean(
    workspaceBase && pathname === workspaceBase,
  );
  const parentHref = location ? parentHrefFor(location) : null;
  const { hasInAppPredecessor, noteParentReplace } =
    useInAppNavHistory(pathname);
  const backMode = resolveNavBackMode({
    hasInAppPredecessor,
    parentHref,
  });
  const activeSection = location?.section ?? null;
  const sections = workspaceBase ? workspaceSections(workspaceBase) : [];
  let nonWorkspaceSidebarLabel = "Select a workspace";
  if (pathname.startsWith("/app/account")) {
    nonWorkspaceSidebarLabel = "Account";
  } else if (pathname.startsWith("/app/invitations")) {
    nonWorkspaceSidebarLabel = "Invitations";
  }

  const onAppIndex = pathname === "/app" || pathname === "/app/";
  const shouldRedirectToWorkspace =
    Boolean(userKeys) && !recovery && workspaces.length > 0 && onAppIndex;

  useEffect(() => {
    if (!shouldRedirectToWorkspace) return;
    const preferred = loadLastWorkspaceId(userId);
    const id = pickDefaultWorkspaceId(workspaces, preferred);
    if (!id) return;
    storeLastWorkspaceId(userId, id);
    router.replace(`/app/w/${id}`);
  }, [shouldRedirectToWorkspace, userId, workspaces, router]);

  if (!userKeys || recovery) {
    return <UnlockGate email={email} userId={userId} />;
  }

  if (shouldRedirectToWorkspace) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
        Opening workspace…
      </main>
    );
  }

  return (
    <PageActionsProvider>
      <div className="grain-bg relative flex min-h-svh flex-col bg-background text-foreground">
        <div className="sticky top-0 z-40 bg-background">
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
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-1.5 overflow-x-auto"
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
            <div className="ml-auto shrink-0">
              <ThemeToggle />
            </div>
          </header>
        </div>
        <div className="relative z-10 flex min-h-0 flex-1">
          <aside className="sticky top-12 hidden h-[calc(100svh-3rem)] w-48 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2 text-sm">
              {workspaceBase ? (
                <>
                  {activeWorkspaceName ? (
                    <div className="mb-1.5 flex flex-col gap-0.5">
                      <p className="px-2 text-xs font-medium text-muted-foreground">
                        Workspace
                      </p>
                      <Link
                        href={workspaceBase}
                        title={activeWorkspaceName}
                        aria-current={onWorkspaceHome ? "page" : undefined}
                        className={cn(
                          "truncate rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          onWorkspaceHome &&
                            "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        {activeWorkspaceName}
                      </Link>
                      {planLabel ? (
                        <p className="px-2 text-xs text-muted-foreground">
                          {planLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {sections.map((section) => (
                    <SectionLink
                      key={section.id}
                      href={section.href}
                      active={activeSection === section.id}
                      icon={section.icon}
                      variant="sidebar"
                    >
                      {section.label}
                    </SectionLink>
                  ))}
                </>
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  {nonWorkspaceSidebarLabel}
                </p>
              )}
            </nav>
            <AccountFooter email={email} />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="sticky top-12 z-30 border-b bg-background">
              {workspaceBase ? (
                <nav
                  aria-label="Workspace sections"
                  className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5 md:hidden"
                >
                  {sections.map((section) => (
                    <SectionLink
                      key={section.id}
                      href={section.href}
                      active={activeSection === section.id}
                      icon={section.icon}
                      variant="mobile"
                    >
                      {section.label}
                    </SectionLink>
                  ))}
                </nav>
              ) : null}
              <div
                aria-label="Page actions"
                className="flex h-10 min-w-0 shrink-0 items-center gap-2 px-3"
              >
                <ButtonGroup className="shrink-0">
                  <NavBackButton
                    mode={backMode}
                    parentHref={parentHref}
                    onParentNavigate={noteParentReplace}
                  />
                </ButtonGroup>
                <PageActionsSlot />
              </div>
            </div>
            <main className="min-w-0 flex-1">
              {activeWorkspaceId ? (
                <EntityCacheProvider
                  key={activeWorkspaceId}
                  workspaceId={activeWorkspaceId}
                >
                  {children}
                </EntityCacheProvider>
              ) : (
                children
              )}
            </main>
            <div className="sticky bottom-0 z-30 md:hidden">
              <AccountFooter email={email} variant="mobile" />
            </div>
          </div>
        </div>
      </div>
    </PageActionsProvider>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <CryptoSessionProvider>
      <AppShellInner {...props} />
    </CryptoSessionProvider>
  );
}
