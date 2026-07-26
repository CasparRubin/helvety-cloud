"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOutIcon,
  MailIcon,
  ScaleIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";

import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AccountFooterProps = {
  email: string;
  variant?: "sidebar" | "mobile";
};

function FooterLink({
  href,
  active,
  icon: Icon,
  children,
  compact,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={compact ? children : undefined}
      className={cn(
        compact
          ? "inline-flex size-9 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", !compact && "opacity-60")} />
      {compact ? <span className="sr-only">{children}</span> : children}
    </Link>
  );
}

export function AccountFooter({
  email,
  variant = "sidebar",
}: AccountFooterProps) {
  const pathname = usePathname();
  const { lock } = useCryptoSession();
  const onAccount = pathname.startsWith("/app/account");
  const onInvitations = pathname.startsWith("/app/invitations");

  async function signOut() {
    lock();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (variant === "mobile") {
    return (
      <nav
        aria-label="Account"
        className="flex items-center justify-around gap-1 border-t border-sidebar-border bg-sidebar px-2 py-1.5 text-sidebar-foreground"
      >
        <FooterLink
          href="/app/account/general"
          active={onAccount}
          icon={UserRoundIcon}
          compact
        >
          Account
        </FooterLink>
        <FooterLink
          href="/app/invitations"
          active={onInvitations}
          icon={MailIcon}
          compact
        >
          Invitations
        </FooterLink>
        <FooterLink href="/legal" active={false} icon={ScaleIcon} compact>
          Legal
        </FooterLink>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex size-9 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOutIcon className="size-4 shrink-0" />
        </button>
      </nav>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 border-t border-sidebar-border bg-sidebar px-2 py-2 text-sidebar-foreground">
      <p className="truncate px-2 pb-0.5 text-[10px] text-muted-foreground">
        {email}
      </p>
      <FooterLink
        href="/app/account/general"
        active={onAccount}
        icon={UserRoundIcon}
      >
        Account
      </FooterLink>
      <FooterLink
        href="/app/invitations"
        active={onInvitations}
        icon={MailIcon}
      >
        Invitations
      </FooterLink>
      <FooterLink href="/legal" active={false} icon={ScaleIcon}>
        Legal
      </FooterLink>
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOutIcon className="size-4 shrink-0 opacity-60" />
        Sign out
      </button>
    </div>
  );
}
