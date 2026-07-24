"use client";

import { useParams } from "next/navigation";

import { IssueDetail } from "@/components/app/issue-detail";

export default function IssuePage() {
  const params = useParams<{
    workspaceId: string;
    projectId: string;
    issueId: string;
  }>();
  return (
    <IssueDetail
      workspaceId={params.workspaceId}
      projectId={params.projectId}
      issueId={params.issueId}
    />
  );
}
