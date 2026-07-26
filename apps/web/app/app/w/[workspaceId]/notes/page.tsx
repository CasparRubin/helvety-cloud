"use client";

import { useParams } from "next/navigation";

import { NoteList } from "@/components/app/note-list";

export default function NotesPage() {
  const params = useParams<{ workspaceId: string }>();
  return <NoteList workspaceId={params.workspaceId} />;
}
