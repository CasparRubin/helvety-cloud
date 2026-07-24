"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { SidebarProjects } from "@/components/app/sidebar-projects";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { Button } from "@/components/ui/button";
import { UnlockGate } from "@/components/vault/unlock-gate";
import {
  useVaultSession,
  VaultSessionProvider,
} from "@/components/vault/vault-session-provider";
import { createClient } from "@/lib/supabase/client";
import {
  loadLastWorkspaceId,
  pickDefaultWorkspaceId,
  storeLastWorkspaceId,
} from "@/lib/vault/workspaces";

type AppShellProps = {
  email: string;
  userId: string;
  children: React.ReactNode;
};

function AppShellInner({ email, userId, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { vault, recovery, workspaces, lock } = useVaultSession();

  const pathParts = pathname.split("/");
  const activeWorkspaceId = pathname.startsWith("/app/w/")
    ? (pathParts[3] ?? null)
    : null;
  const activeProjectId =
    pathParts[4] === "p" && pathParts[5] ? pathParts[5] : null;

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

  async function signOut() {
    lock();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!vault || recovery) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center p-6">
        <UnlockGate email={email} userId={userId} onUnlocked={() => undefined} />
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
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex flex-col gap-3 border-b border-sidebar-border px-3 py-3">
          <Link
            href="/app"
            className="truncate text-sm font-semibold tracking-tight"
          >
            Helvety Cloud
          </Link>
          <WorkspaceSwitcher
            userId={userId}
            activeWorkspaceId={activeWorkspaceId}
          />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2 text-sm">
          {activeWorkspaceId ? (
            <SidebarProjects
              workspaceId={activeWorkspaceId}
              activeProjectId={activeProjectId}
            />
          ) : (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Select a workspace
            </p>
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border px-2 py-2">
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            render={<Link href="/legal" />}
            nativeButton={false}
          >
            Legal
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
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
