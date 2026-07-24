"use client";

import { useParams } from "next/navigation";

import { NoteDetail } from "@/components/app/note-detail";

export default function NoteDetailPage() {
  const params = useParams<{ workspaceId: string; noteId: string }>();
  return (
    <NoteDetail workspaceId={params.workspaceId} noteId={params.noteId} />
  );
}
