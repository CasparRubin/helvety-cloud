"use client";


import { TaskDetail } from "@/components/app/task-detail";
import { useParams } from "next/navigation";

export default function TaskPage() {
  const params = useParams<{
    workspaceId: string;
    projectId: string;
    taskId: string;
  }>();
  return (
    <TaskDetail
      key={params.taskId}
      workspaceId={params.workspaceId}
      projectId={params.projectId}
      taskId={params.taskId}
    />
  );
}
