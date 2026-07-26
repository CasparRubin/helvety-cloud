"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  createContact,
  loadDecryptedContacts,
  type DecryptedContact,
} from "@/lib/vault/contacts";
import type { EntityColor } from "@/lib/vault/entity-colors";
import { textToTaskBody } from "@/lib/vault/task-plaintext";

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
  const [newEmails, setNewEmails] = useState("");
  const [newPhones, setNewPhones] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newColor, setNewColor] = useState<EntityColor | undefined>();

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

  function resetCreateFields() {
    setNewEmails("");
    setNewPhones("");
    setNewNotes("");
    setNewColor(undefined);
  }

  async function onCreate(displayName: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        contacts.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
      const emails = newEmails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const phones = newPhones
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const notes = newNotes.trim();
      const created = await createContact(
        workspaceId,
        key,
        {
          displayName,
          emails,
          phones,
          notes: notes ? textToTaskBody(notes) : undefined,
          color: newColor,
        },
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
          onOpenChange={(open) => {
            if (open) resetCreateFields();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-contact-emails">Emails</Label>
              <Input
                id="new-contact-emails"
                value={newEmails}
                onChange={(e) => setNewEmails(e.target.value)}
                placeholder="comma-separated"
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-contact-phones">Phones</Label>
              <Input
                id="new-contact-phones"
                value={newPhones}
                onChange={(e) => setNewPhones(e.target.value)}
                placeholder="comma-separated"
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-contact-notes">Notes</Label>
            <Textarea
              id="new-contact-notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Add notes…"
              disabled={busy}
              rows={3}
            />
          </div>
          <EntityColorPicker
            value={newColor}
            disabled={busy}
            onChange={setNewColor}
          />
        </CreateEntityDialog>
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
