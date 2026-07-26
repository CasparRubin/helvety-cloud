"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ProjectSettingsProvider } from "@/components/app/project-settings/provider";
import {
  SettingsShell,
  projectSettingsNavItems,
} from "@/components/app/settings-shell";

export default function ProjectSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  const workspaceId = params.workspaceId;
  const projectId = params.projectId;
  const t = useTranslations("settings");

  return (
    <ProjectSettingsProvider workspaceId={workspaceId} projectId={projectId}>
      <SettingsShell
        title={t("projectSettings")}
        description={t("projectSettingsDescription")}
        items={projectSettingsNavItems(workspaceId, projectId, t)}
      >
        {children}
      </SettingsShell>
    </ProjectSettingsProvider>
  );
}
