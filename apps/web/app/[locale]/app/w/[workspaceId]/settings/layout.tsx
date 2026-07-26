"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  SettingsShell,
  workspaceSettingsNavItems,
} from "@/components/app/settings-shell";
import { WorkspaceSettingsProvider } from "@/components/app/workspace-settings/provider";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const { workspaces } = useCryptoSession();
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const isOwner = workspace?.role === "owner";
  const t = useTranslations("settings");

  return (
    <WorkspaceSettingsProvider workspaceId={workspaceId}>
      <SettingsShell
        title={t("workspaceSettings")}
        description={
          workspace
            ? t("workspaceSettingsDescription", { name: workspace.name })
            : t("workspaceSettingsDescriptionFallback")
        }
        items={workspaceSettingsNavItems(workspaceId, t, {
          showDanger: isOwner,
        })}
      >
        {children}
      </SettingsShell>
    </WorkspaceSettingsProvider>
  );
}
