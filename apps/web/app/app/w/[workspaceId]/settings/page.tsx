"use client";

import { useParams } from "next/navigation";

import { WorkspaceSettings } from "@/components/app/workspace-settings";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  return <WorkspaceSettings workspaceId={params.workspaceId} />;
}
