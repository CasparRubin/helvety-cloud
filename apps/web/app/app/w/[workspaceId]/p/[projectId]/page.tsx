"use client";

import { useParams } from "next/navigation";

import { IssueList } from "@/components/app/issue-list";

export default function ProjectPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  return (
    <IssueList
      workspaceId={params.workspaceId}
      projectId={params.projectId}
    />
  );
}
