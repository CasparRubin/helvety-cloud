"use client";


import { ProjectList } from "@/components/app/project-list";
import { useParams } from "next/navigation";

export default function WorkspaceHomePage() {
  const params = useParams<{ workspaceId: string }>();
  return <ProjectList workspaceId={params.workspaceId} />;
}
