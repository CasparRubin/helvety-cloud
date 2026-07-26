"use client";


import { NoteDetail } from "@/components/app/note-detail";
import { useParams } from "next/navigation";

export default function NoteDetailPage() {
  const params = useParams<{ workspaceId: string; noteId: string }>();
  return (
    <NoteDetail
      key={params.noteId}
      workspaceId={params.workspaceId}
      noteId={params.noteId}
    />
  );
}
