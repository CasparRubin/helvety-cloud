"use client";

import { useParams } from "next/navigation";

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

  return (
    <ProjectSettingsProvider workspaceId={workspaceId} projectId={projectId}>
      <SettingsShell
        title="Project settings"
        description="Categorization names are encrypted. Option ids on tasks are plaintext metadata for filtering."
        items={projectSettingsNavItems(workspaceId, projectId)}
      >
        {children}
      </SettingsShell>
    </ProjectSettingsProvider>
  );
}
