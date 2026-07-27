"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DateTimeText } from "@/components/app/datetime-text";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { ListSearchInput } from "@/components/app/list-search-input";
import { ListSortToggle } from "@/components/app/list-sort-toggle";
import {
  ListRefreshButton,
  PageActions,
  WorkspaceSettingsAction,
} from "@/components/app/page-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createContact,
  loadDecryptedContacts,
  type DecryptedContact,
} from "@/lib/client-crypto/contacts";
import { formatContactName } from "@/lib/client-crypto/contact-plaintext";
import { textToTaskBody } from "@/lib/client-crypto/task-plaintext";
import { matchesQuery } from "@/lib/list-search";

type ContactSort = "lastName" | "firstName" | "created" | "modified";

const CONTACT_SORT_OPTIONS = [
  { id: "lastName" as const, label: "Last name" },
  { id: "firstName" as const, label: "First name" },
  { id: "created" as const, label: "Created" },
  { id: "modified" as const, label: "Modified" },
];

function compareContacts(
  a: DecryptedContact,
  b: DecryptedContact,
  sort: ContactSort,
) {
  switch (sort) {
    case "lastName": {
      const byLast = a.lastName.localeCompare(b.lastName, undefined, {
        sensitivity: "base",
      });
      if (byLast !== 0) return byLast;
      const byFirst = a.firstName.localeCompare(b.firstName, undefined, {
        sensitivity: "base",
      });
      if (byFirst !== 0) return byFirst;
      return a.id.localeCompare(b.id);
    }
    case "firstName": {
      const byFirst = a.firstName.localeCompare(b.firstName, undefined, {
        sensitivity: "base",
      });
      if (byFirst !== 0) return byFirst;
      const byLast = a.lastName.localeCompare(b.lastName, undefined, {
        sensitivity: "base",
      });
      if (byLast !== 0) return byLast;
      return a.id.localeCompare(b.id);
    }
    case "created": {
      const byDate = b.createdAt.localeCompare(a.createdAt);
      if (byDate !== 0) return byDate;
      return a.id.localeCompare(b.id);
    }
    case "modified": {
      const byDate = b.updatedAt.localeCompare(a.updatedAt);
      if (byDate !== 0) return byDate;
      return a.id.localeCompare(b.id);
    }
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

type ContactListProps = {
  workspaceId: string;
};

export function ContactList({ workspaceId }: ContactListProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [contacts, setContacts] = useState<DecryptedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newLastName, setNewLastName] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newEmails, setNewEmails] = useState("");
  const [newPhones, setNewPhones] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ContactSort>("lastName");
  const deferredQuery = useDeferredValue(query);

  const loadContacts = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    return loadDecryptedContacts(workspaceId, key);
  }, [getWorkspaceKey, workspaceId]);

  const refresh = useCallback(async () => {
    const page = await loadContacts();
    setContacts(page.contacts);
    setError(null);
  }, [loadContacts]);

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [refresh]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await loadContacts();
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
  }, [userKeys, loadContacts]);

  function resetCreateFields() {
    setNewLastName("");
    setNewJobTitle("");
    setNewEmails("");
    setNewPhones("");
    setNewNotes("");
  }

  async function onCreate(firstName: string) {
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
          firstName,
          lastName: newLastName,
          jobTitle: newJobTitle,
          emails,
          phones,
          notes: notes ? textToTaskBody(notes) : undefined,
        },
        nextOrder,
      );
      window.dispatchEvent(new Event("helvety:contacts-changed"));
      router.push(`/app/w/${workspaceId}/contacts/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  const filtering = deferredQuery.trim().length > 0;
  const filteredContacts = contacts
    .filter((c) =>
      matchesQuery([formatContactName(c), ...c.emails], deferredQuery),
    )
    .sort((a, b) => compareContacts(a, b, sort));

  const showDateMeta = sort === "created" || sort === "modified";

  return (
    <>
      <ListRefreshButton disabled={busy} onRefresh={handleRefresh} />
      <PageActions>
        <CreateEntityDialog
          triggerLabel="Create contact"
          dialogTitle="Create contact"
          fieldLabel="First name"
          fieldPlaceholder="First name"
          fieldMaxLength={500}
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) resetCreateFields();
          }}
          companion={
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-contact-last-name">Last name</Label>
              <Input
                id="new-contact-last-name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="Last name"
                disabled={busy}
                maxLength={500}
              />
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-contact-job-title">Job title</Label>
            <Input
              id="new-contact-job-title"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              placeholder="Job title"
              disabled={busy}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </CreateEntityDialog>
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title="Contacts"
        belowTitle={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ListSearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Filter contacts…"
              disabled={loading || contacts.length === 0}
            />
            <ListSortToggle
              value={sort}
              onValueChange={setSort}
              options={CONTACT_SORT_OPTIONS}
              disabled={loading || contacts.length === 0}
            />
          </div>
        }
        error={error}
        loading={loading}
        loadingLabel="Loading contacts…"
        empty={
          !loading &&
          (contacts.length === 0 ||
            (filtering && filteredContacts.length === 0))
        }
        emptyLabel={
          contacts.length === 0 ? "No contacts yet." : "No matching contacts."
        }
      >
        {filteredContacts.map((contact) => {
          const name = formatContactName(contact) || "Untitled";
          const email = contact.emails[0] || null;
          return (
            <EntityListRow key={contact.id}>
              <Link
                href={`/app/w/${workspaceId}/contacts/${contact.id}`}
                className="flex w-full flex-col gap-1"
              >
                <span className="font-medium">{name}</span>
                {email || showDateMeta ? (
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {email ? <span>{email}</span> : null}
                    {showDateMeta ? (
                      <span>
                        {sort === "created" ? "Created" : "Modified"}{" "}
                        <DateTimeText
                          value={
                            sort === "created"
                              ? contact.createdAt
                              : contact.updatedAt
                          }
                        />
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </Link>
            </EntityListRow>
          );
        })}
      </EntityListShell>
    </>
  );
}
