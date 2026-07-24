"use client";

import { useParams } from "next/navigation";

import { ContactDetail } from "@/components/app/contact-detail";

export default function ContactDetailPage() {
  const params = useParams<{ workspaceId: string; contactId: string }>();
  return (
    <ContactDetail
      workspaceId={params.workspaceId}
      contactId={params.contactId}
    />
  );
}
