"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SettingsNavItem } from "@/lib/settings-nav";

export {
  accountSettingsNavItems,
  projectSettingsNavItems,
  workspaceSettingsNavItems,
} from "@/lib/settings-nav";

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
  const t = useTranslations("shell");

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row md:gap-8">
        <nav
          aria-label={t("settingsSections")}
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
