"use client";

import { useParams } from "next/navigation";

import { DatabaseDetail } from "@/components/app/database-detail";

export default function DatabaseDetailPage() {
  const params = useParams<{ workspaceId: string; databaseId: string }>();
  return (
    <DatabaseDetail
      key={params.databaseId}
      workspaceId={params.workspaceId}
      databaseId={params.databaseId}
    />
  );
}
