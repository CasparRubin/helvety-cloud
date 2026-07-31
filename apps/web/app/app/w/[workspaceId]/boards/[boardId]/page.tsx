"use client";

import { useParams } from "next/navigation";

import { BoardDetail } from "@/components/app/board-detail";

export default function BoardDetailPage() {
  const params = useParams<{ workspaceId: string; boardId: string }>();
  return (
    <BoardDetail
      key={params.boardId}
      workspaceId={params.workspaceId}
      boardId={params.boardId}
    />
  );
}
