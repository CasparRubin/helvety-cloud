"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  LogOutIcon,
  MailIcon,
  ScaleIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AccountFooterProps = {
  email: string;
};

function FooterLink({
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
      aria-current={active ? "page" : undefined}
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

export function AccountFooter({ email }: AccountFooterProps) {
  const t = useTranslations("shell");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const { lock } = useCryptoSession();
  const onAccount = pathname.startsWith("/app/account");
  const onInvitations = pathname.startsWith("/app/invitations");

  async function signOut() {
    lock();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
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
        {t("account")}
      </FooterLink>
      <FooterLink
        href="/app/invitations"
        active={onInvitations}
        icon={MailIcon}
      >
        {t("invitations")}
      </FooterLink>
      <FooterLink href="/legal" active={false} icon={ScaleIcon}>
        {tCommon("legal")}
      </FooterLink>
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOutIcon className="size-4 shrink-0 opacity-60" />
        {t("signOut")}
      </button>
    </div>
  );
}
