"use client";

import { useParams } from "next/navigation";

import { TableDetail } from "@/components/app/table-detail";

export default function TableDetailPage() {
  const params = useParams<{
    workspaceId: string;
    databaseId: string;
    tableId: string;
  }>();
  return (
    <TableDetail
      key={params.tableId}
      workspaceId={params.workspaceId}
      databaseId={params.databaseId}
      tableId={params.tableId}
    />
  );
}
