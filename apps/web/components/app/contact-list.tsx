"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createContact,
  loadDecryptedContacts,
  type DecryptedContact,
} from "@/lib/vault/contacts";

type ContactListProps = {
  workspaceId: string;
};

export function ContactList({ workspaceId }: ContactListProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [contacts, setContacts] = useState<DecryptedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedContacts(workspaceId, key);
        if (cancelled) return;
        setContacts(page.contacts);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load contacts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, getWorkspaceKey]);

  async function onCreate(displayName: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        contacts.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
      const created = await createContact(
        workspaceId,
        key,
        { displayName },
        nextOrder,
      );
      window.dispatchEvent(new Event("helvety:contacts-changed"));
      router.push(`/app/w/${workspaceId}/contacts/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <EntityListShell
      title="Contacts"
      createForm={
        <CreateEntityDialog
          triggerLabel="Create contact"
          dialogTitle="Create contact"
          fieldLabel="Name"
          fieldPlaceholder="New contact name"
          fieldMaxLength={500}
          disabled={busy}
          onCreate={onCreate}
        />
      }
      error={error}
      loading={loading}
      loadingLabel="Loading contacts…"
      empty={!loading && contacts.length === 0}
      emptyLabel="No contacts yet."
    >
      {contacts.map((contact) => (
        <EntityListRow key={contact.id}>
          <Link
            href={`/app/w/${workspaceId}/contacts/${contact.id}`}
            className="font-medium"
          >
            {contact.displayName || "Untitled"}
            {contact.emails[0] ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {contact.emails[0]}
              </span>
            ) : null}
          </Link>
        </EntityListRow>
      ))}
    </EntityListShell>
  );
}
