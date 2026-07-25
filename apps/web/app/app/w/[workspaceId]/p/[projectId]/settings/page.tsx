"use client";

import { useParams } from "next/navigation";

import { ProjectSettings } from "@/components/app/project-settings";

export default function ProjectSettingsPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  return (
    <ProjectSettings
      workspaceId={params.workspaceId}
      projectId={params.projectId}
    />
  );
}
