"use client";


import { NoteList } from "@/components/app/note-list";
import { useParams } from "next/navigation";

export default function NotesPage() {
  const params = useParams<{ workspaceId: string }>();
  return <NoteList workspaceId={params.workspaceId} />;
}
