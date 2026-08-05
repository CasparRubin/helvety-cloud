"use client";

import { useParams } from "next/navigation";

import { DatabaseList } from "@/components/app/database-list";

export default function DatabasesPage() {
  const params = useParams<{ workspaceId: string }>();
  return <DatabaseList workspaceId={params.workspaceId} />;
}
