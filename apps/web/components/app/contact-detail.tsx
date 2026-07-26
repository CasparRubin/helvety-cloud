"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import {
  EntityDetailLayout,
  EntityDetailShell,
} from "@/components/app/entity-detail-shell";
import { EntityTimestampsCard } from "@/components/app/entity-timestamps-card";
import { InlineTitle } from "@/components/app/inline-title";
import { PageDangerActions } from "@/components/app/page-actions";
import {
  TaskBodyEditor,
  type EntityLinkAction,
} from "@/components/app/task-body-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  createContact,
  deleteContact,
  loadDecryptedContact,
  saveContact,
  type DecryptedContact,
} from "@/lib/client-crypto/contacts";
import { toContactPlaintext } from "@/lib/client-crypto/contact-plaintext";
import { createTask } from "@/lib/client-crypto/tasks";
import {
  EMPTY_TASK_BODY,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";

type ContactDetailProps = {
  workspaceId: string;
  contactId: string;
};

type ContactDraft = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  emailsText: string;
  phonesText: string;
  notes: TaskBodyDoc;
};

export function ContactDetail({
  workspaceId,
  contactId,
}: ContactDetailProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const cache = useEntityCache();
  const { upsertContact } = cache;

  const [contact, setContact] = useState<DecryptedContact | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [phonesText, setPhonesText] = useState("");
  const [notes, setNotes] = useState<TaskBodyDoc>(EMPTY_TASK_BODY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageLimitMessage, setStorageLimitMessage] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [pendingProjectPick, setPendingProjectPick] = useState<{
    title: string;
    resolve: (id: string | null) => void;
  } | null>(null);

  const contactRef = useRef(contact);
  useEffect(() => {
    contactRef.current = contact;
  });

  const draft = useMemo<ContactDraft>(
    () => ({
      firstName,
      lastName,
      jobTitle,
      emailsText,
      phonesText,
      notes,
    }),
    [firstName, lastName, jobTitle, emailsText, phonesText, notes],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(contact) && !loading && !deleting,
    save: async (next) => {
      const current = contactRef.current;
      if (!current) throw new Error("Contact not loaded");
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveContact(
        workspaceId,
        key,
        current,
        toContactPlaintext({
          firstName: next.firstName,
          lastName: next.lastName,
          jobTitle: next.jobTitle,
          emails: next.emailsText
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          phones: next.phonesText
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          notes: next.notes,
        }),
      );
      setContact(saved);
      cache.upsertContact(saved);
      return {
        firstName: saved.firstName,
        lastName: saved.lastName,
        jobTitle: saved.jobTitle,
        emailsText: saved.emails.join(", "),
        phonesText: saved.phones.join(", "),
        notes: saved.notes,
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setFirstName(canonical.firstName);
      setLastName(canonical.lastName);
      setJobTitle(canonical.jobTitle);
      setEmailsText(canonical.emailsText);
      setPhonesText(canonical.phonesText);
      setNotes(canonical.notes);
      setError(null);
    },
  });

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const loaded = await loadDecryptedContact(
          workspaceId,
          contactId,
          key,
        );
        if (cancelled) return;
        setContact(loaded);
        setFirstName(loaded.firstName);
        setLastName(loaded.lastName);
        setJobTitle(loaded.jobTitle);
        setEmailsText(loaded.emails.join(", "));
        setPhonesText(loaded.phones.join(", "));
        setNotes(loaded.notes);
        setError(null);
        upsertContact(loaded);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load contact");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, contactId, getWorkspaceKey, upsertContact]);

  async function onDelete() {
    if (!contact || deleting || status === "saving") return;
    setDeleting(true);
    setError(null);
    try {
      await deleteContact(workspaceId, contact);
      router.push(`/app/w/${workspaceId}/contacts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function pickProjectForNewTask(): Promise<string | null> {
    const cached = cache.contacts.find((c) => c.id === contactId);
    const linkedProjects = (
      cached?.links ?? contactRef.current?.links ?? []
    ).filter((l) => l.kind === "project");
    if (linkedProjects.length === 1) return linkedProjects[0]!.id;
    if (cache.projects.length === 1) return cache.projects[0]!.id;
    return new Promise((resolve) => {
      setPendingProjectPick({
        title: "Choose a project for the new task",
        resolve: (id) => {
          setPendingProjectPick(null);
          resolve(id);
        },
      });
    });
  }

  async function onEntityLinkAction(
    action: EntityLinkAction,
  ): Promise<EntityLinkTarget | void> {
    const key = await getWorkspaceKey(workspaceId);
    switch (action.type) {
      case "create-task": {
        const projectForTask = await pickProjectForNewTask();
        if (!projectForTask) return;
        const project = cache.projects.find((p) => p.id === projectForTask);
        const task = await createTask(
          workspaceId,
          projectForTask,
          key,
          { title: action.title },
          0,
          project?.categorizations,
        );
        cache.upsertTask(task);
        return { kind: "task", id: task.id };
      }
      case "create-contact": {
        const created = await createContact(workspaceId, key, {
          firstName: action.firstName,
        });
        cache.upsertContact(created);
        return { kind: "contact", id: created.id };
      }
      case "link-existing":
        return action.target;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  const linkCandidates = useMemo(() => {
    const items: { kind: EntityLinkTarget["kind"]; id: string; label: string }[] =
      [];
    for (const t of cache.tasks) {
      items.push({ kind: "task", id: t.id, label: t.title });
    }
    for (const n of cache.notes) {
      items.push({ kind: "note", id: n.id, label: n.title });
    }
    return items;
  }, [cache.tasks, cache.notes]);

  if (!userKeys) return null;

  return (
    <EntityDetailShell loading={loading} error={error}>
      <PageDangerActions>
        <DeleteButton
          disabled={deleting}
          busy={deleting}
          dialogTitle="Delete this contact?"
          dialogDescription="This permanently deletes the contact, its attached files, and its links to other items. This cannot be undone."
          onConfirm={onDelete}
        />
      </PageDangerActions>
      <EntityDetailLayout
        main={
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  First name
                </Label>
                <InlineTitle
                  value={firstName}
                  onChange={setFirstName}
                  onBlur={flush}
                  placeholder="First name"
                  disabled={deleting}
                  maxLength={500}
                  aria-label="First name"
                  className="min-w-0"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Last name
                </Label>
                <InlineTitle
                  value={lastName}
                  onChange={setLastName}
                  onBlur={flush}
                  placeholder="Last name"
                  disabled={deleting}
                  maxLength={500}
                  aria-label="Last name"
                  className="min-w-0"
                />
              </div>
            </div>

            <TaskBodyEditor
              content={notes}
              onChange={setNotes}
              disabled={deleting}
              placeholder="Add notes…"
              enableEntityLinks
              entityLinkSourceKind="contact"
              linkCandidates={linkCandidates}
              onEntityLinkAction={onEntityLinkAction}
              fileAttachments={{
                workspaceId,
                getWorkspaceKey: () => getWorkspaceKey(workspaceId),
                onStorageLimit: (message) => setStorageLimitMessage(message),
              }}
            />
            {storageLimitMessage ? (
              <Alert>
                <AlertTitle>Storage limit</AlertTitle>
                <AlertDescription>{storageLimitMessage}</AlertDescription>
              </Alert>
            ) : null}
            <BacklinksPanel
              workspaceId={workspaceId}
              kind="contact"
              id={contactId}
            />
          </>
        }
        aside={
          <>
            {contact ? (
              <EntityTimestampsCard
                createdAt={contact.createdAt}
                updatedAt={contact.updatedAt}
                status={status}
                savedAt={savedAt}
                onRetry={flush}
              />
            ) : null}

            <Card size="sm">
              <CardContent className="flex flex-col gap-1.5">
                <Label
                  htmlFor="contact-detail-job-title"
                  className="text-xs text-muted-foreground"
                >
                  Job title
                </Label>
                <Input
                  id="contact-detail-job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  onBlur={flush}
                  placeholder="Job title"
                  disabled={deleting}
                  maxLength={500}
                />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-1.5">
                <Label
                  htmlFor="contact-detail-emails"
                  className="text-xs text-muted-foreground"
                >
                  Emails
                </Label>
                <Input
                  id="contact-detail-emails"
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                  onBlur={flush}
                  placeholder="comma-separated"
                  disabled={deleting}
                />
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="flex flex-col gap-1.5">
                <Label
                  htmlFor="contact-detail-phones"
                  className="text-xs text-muted-foreground"
                >
                  Phones
                </Label>
                <Input
                  id="contact-detail-phones"
                  value={phonesText}
                  onChange={(e) => setPhonesText(e.target.value)}
                  onBlur={flush}
                  placeholder="comma-separated"
                  disabled={deleting}
                />
              </CardContent>
            </Card>
          </>
        }
      />

      <Dialog
        open={pendingProjectPick != null}
        onOpenChange={(open) => {
          if (!open) pendingProjectPick?.resolve(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{pendingProjectPick?.title ?? "Choose project"}</DialogTitle>
          </DialogHeader>
          <ul className="flex max-h-60 flex-col gap-1 overflow-auto">
            {cache.projects.map((p) => (
              <li key={p.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => pendingProjectPick?.resolve(p.id)}
                >
                  {p.name}
                </Button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => pendingProjectPick?.resolve(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EntityDetailShell>
  );
}
