"use client";

import { useParams } from "next/navigation";

import { ContactList } from "@/components/app/contact-list";

export default function ContactsPage() {
  const params = useParams<{ workspaceId: string }>();
  return <ContactList workspaceId={params.workspaceId} />;
}
