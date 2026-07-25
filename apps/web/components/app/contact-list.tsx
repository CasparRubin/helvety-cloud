"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [displayName, setDisplayName] = useState("");
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        contacts.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
      const created = await createContact(
        workspaceId,
        key,
        { displayName: trimmed },
        nextOrder,
      );
      setDisplayName("");
      window.dispatchEvent(new Event("helvety:contacts-changed"));
      router.push(`/app/w/${workspaceId}/contacts/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Contact details are encrypted end-to-end in this workspace.
        </p>
      </div>

      <form onSubmit={(e) => void onCreate(e)} className="flex gap-2">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="New contact name"
          disabled={busy}
          maxLength={500}
          aria-label="Contact name"
        />
        <Button type="submit" disabled={busy || !displayName.trim()} size="sm">
          Create
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading contacts…</p>
      ) : contacts.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          No contacts yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Link
                href={`/app/w/${workspaceId}/contacts/${contact.id}`}
                className="block rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
              >
                {contact.displayName || "Untitled"}
                {contact.emails[0] ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {contact.emails[0]}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
