"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import {
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

type ContactListProps = {
  workspaceId: string;
};

function compareContactsByLastName(a: DecryptedContact, b: DecryptedContact) {
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

export function ContactList({ workspaceId }: ContactListProps) {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
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

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedContacts(workspaceId, key);
        if (cancelled) return;
        setContacts([...page.contacts].sort(compareContactsByLastName));
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, getWorkspaceKey, t]);

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

  return (
    <>
      <PageActions>
        <CreateEntityDialog
          triggerLabel={t("createTitle")}
          dialogTitle={t("createTitle")}
          fieldLabel={t("firstName")}
          fieldPlaceholder={t("firstName")}
          fieldMaxLength={500}
          disabled={busy}
          onCreate={onCreate}
          onOpenChange={(open) => {
            if (open) resetCreateFields();
          }}
          companion={
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-contact-last-name">{t("lastName")}</Label>
              <Input
                id="new-contact-last-name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder={t("lastName")}
                disabled={busy}
                maxLength={500}
              />
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-contact-job-title">{t("jobTitle")}</Label>
            <Input
              id="new-contact-job-title"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              placeholder={t("jobTitle")}
              disabled={busy}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-contact-emails">{t("emails")}</Label>
              <Input
                id="new-contact-emails"
                value={newEmails}
                onChange={(e) => setNewEmails(e.target.value)}
                placeholder={t("commaSeparated")}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-contact-phones">{t("phones")}</Label>
              <Input
                id="new-contact-phones"
                value={newPhones}
                onChange={(e) => setNewPhones(e.target.value)}
                placeholder={t("commaSeparated")}
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-contact-notes">{t("notes")}</Label>
            <Textarea
              id="new-contact-notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              disabled={busy}
              rows={3}
            />
          </div>
        </CreateEntityDialog>
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title={t("title")}
        error={error}
        loading={loading}
        loadingLabel={t("loading")}
        empty={!loading && contacts.length === 0}
        emptyLabel={t("empty")}
      >
        {contacts.map((contact) => {
          const name = formatContactName(contact) || tCommon("untitled");
          const email = contact.emails[0] || null;
          return (
            <EntityListRow key={contact.id}>
              <Link
                href={`/app/w/${workspaceId}/contacts/${contact.id}`}
                className="block w-full font-medium"
              >
                {name}
                {email ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {email}
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
