"use client";

import { useParams } from "next/navigation";

import { ProjectList } from "@/components/app/project-list";

export default function WorkspaceHomePage() {
  const params = useParams<{ workspaceId: string }>();
  return <ProjectList workspaceId={params.workspaceId} />;
}
