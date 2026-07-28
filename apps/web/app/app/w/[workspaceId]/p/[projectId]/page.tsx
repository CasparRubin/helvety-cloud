"use client";

import { useParams } from "next/navigation";

import { TaskList } from "@/components/app/task-list";

export default function ProjectPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  return (
    <TaskList workspaceId={params.workspaceId} projectId={params.projectId} />
  );
}
