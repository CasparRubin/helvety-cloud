"use client";

import { useParams } from "next/navigation";

import { BoardList } from "@/components/app/board-list";

export default function BoardsPage() {
  const params = useParams<{ workspaceId: string }>();
  return <BoardList workspaceId={params.workspaceId} />;
}
