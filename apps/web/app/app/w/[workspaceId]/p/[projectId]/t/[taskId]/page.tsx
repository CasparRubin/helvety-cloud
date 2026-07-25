"use client";

import { useParams } from "next/navigation";

import { TaskDetail } from "@/components/app/task-detail";

export default function TaskPage() {
  const params = useParams<{
    workspaceId: string;
    projectId: string;
    taskId: string;
  }>();
  return (
    <TaskDetail
      workspaceId={params.workspaceId}
      projectId={params.projectId}
      taskId={params.taskId}
    />
  );
}
