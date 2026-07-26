"use client";

import { useTranslations } from "next-intl";

import { AccountSettingsProvider } from "@/components/app/account-settings/provider";
import {
  SettingsShell,
  accountSettingsNavItems,
} from "@/components/app/settings-shell";

export default function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("settings");
  const tShell = useTranslations("shell");

  return (
    <AccountSettingsProvider>
      <SettingsShell
        title={tShell("account")}
        items={accountSettingsNavItems(t)}
      >
        {children}
      </SettingsShell>
    </AccountSettingsProvider>
  );
}
