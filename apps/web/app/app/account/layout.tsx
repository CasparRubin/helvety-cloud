"use client";

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
  return (
    <AccountSettingsProvider>
      <SettingsShell title="Account" items={accountSettingsNavItems()}>
        {children}
      </SettingsShell>
    </AccountSettingsProvider>
  );
}
