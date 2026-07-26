"use client";


import { ContactDetail } from "@/components/app/contact-detail";
import { useParams } from "next/navigation";

export default function ContactDetailPage() {
  const params = useParams<{ workspaceId: string; contactId: string }>();
  return (
    <ContactDetail
      key={params.contactId}
      workspaceId={params.workspaceId}
      contactId={params.contactId}
    />
  );
}
