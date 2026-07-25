"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type SettingsNavItem = {
  href: string;
  label: string;
  destructive?: boolean;
};

type SettingsShellProps = {
  title: string;
  description?: string;
  items: SettingsNavItem[];
  children: React.ReactNode;
};

function isActiveSettingsPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsShell({
  title,
  description,
  items,
  children,
}: SettingsShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:gap-8">
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border pb-2 md:w-44 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:pb-0 md:pr-4"
        >
          {items.map((item) => {
            const active = isActiveSettingsPath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap hover:bg-muted hover:text-foreground",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground",
                  item.destructive && !active && "text-destructive/80",
                  item.destructive && active && "text-destructive",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function projectSettingsNavItems(
  workspaceId: string,
  projectId: string,
): SettingsNavItem[] {
  const base = `/app/w/${workspaceId}/p/${projectId}/settings`;
  return [
    { href: `${base}/general`, label: "General" },
    { href: `${base}/stages`, label: "Task stages" },
    { href: `${base}/labels`, label: "Task labels" },
    { href: `${base}/priorities`, label: "Task priorities" },
    { href: `${base}/import`, label: "Import" },
    { href: `${base}/danger`, label: "Danger zone", destructive: true },
  ];
}

export function workspaceSettingsNavItems(
  workspaceId: string,
  opts?: { showDanger?: boolean },
): SettingsNavItem[] {
  const base = `/app/w/${workspaceId}/settings`;
  const items: SettingsNavItem[] = [
    { href: `${base}/general`, label: "General" },
    { href: `${base}/members`, label: "Members" },
    { href: `${base}/billing`, label: "Billing" },
  ];
  if (opts?.showDanger !== false) {
    items.push({
      href: `${base}/danger`,
      label: "Danger zone",
      destructive: true,
    });
  }
  return items;
}

export function accountSettingsNavItems(): SettingsNavItem[] {
  return [
    { href: "/app/account/general", label: "General" },
    {
      href: "/app/account/danger",
      label: "Danger zone",
      destructive: true,
    },
  ];
}
