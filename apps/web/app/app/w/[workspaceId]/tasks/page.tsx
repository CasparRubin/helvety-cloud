"use client";

import { useParams } from "next/navigation";

import { TaskList } from "@/components/app/task-list";

export default function WorkspaceTasksPage() {
  const params = useParams<{ workspaceId: string }>();
  return <TaskList workspaceId={params.workspaceId} />;
}
