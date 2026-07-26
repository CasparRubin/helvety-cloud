"use client";


import { ContactList } from "@/components/app/contact-list";
import { useParams } from "next/navigation";

export default function ContactsPage() {
  const params = useParams<{ workspaceId: string }>();
  return <ContactList workspaceId={params.workspaceId} />;
}
