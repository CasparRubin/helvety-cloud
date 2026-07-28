"use client";

import { useParams } from "next/navigation";

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

  return (
    <WorkspaceSettingsProvider workspaceId={workspaceId}>
      <SettingsShell
        title="Workspace settings"
        description={
          workspace
            ? `Manage name, task categorizations, members, billing, and deletion for ${workspace.name}.`
            : "Manage name, task categorizations, members, billing, and deletion."
        }
        items={workspaceSettingsNavItems(workspaceId, {
          showDanger: isOwner,
        })}
      >
        {children}
      </SettingsShell>
    </WorkspaceSettingsProvider>
  );
}
