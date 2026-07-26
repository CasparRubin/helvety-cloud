"use client";


import { TaskList } from "@/components/app/task-list";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams<{ workspaceId: string; projectId: string }>();
  return (
    <TaskList
      workspaceId={params.workspaceId}
      projectId={params.projectId}
    />
  );
}
