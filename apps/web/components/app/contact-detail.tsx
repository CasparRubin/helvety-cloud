"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import { InlineTitle } from "@/components/app/inline-title";
import { SaveStatus } from "@/components/app/save-status";
import {
  TaskBodyEditor,
  type EntityLinkAction,
} from "@/components/app/task-body-editor";
import { useVaultEntityCache } from "@/components/vault/vault-entity-cache";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  createContact,
  deleteContact,
  loadDecryptedContact,
  saveContact,
  type DecryptedContact,
} from "@/lib/vault/contacts";
import { toContactPlaintext } from "@/lib/vault/contact-plaintext";
import type { EntityColor } from "@/lib/vault/entity-colors";
import { createTask } from "@/lib/vault/tasks";
import {
  EMPTY_TASK_BODY,
  type TaskBodyDoc,
} from "@/lib/vault/task-plaintext";

type ContactDetailProps = {
  workspaceId: string;
  contactId: string;
};

type ContactDraft = {
  displayName: string;
  emailsText: string;
  phonesText: string;
  notes: TaskBodyDoc;
  color: EntityColor | undefined;
};

export function ContactDetail({
  workspaceId,
  contactId,
}: ContactDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();
  const cache = useVaultEntityCache();
  const { upsertContact } = cache;

  const [contact, setContact] = useState<DecryptedContact | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [phonesText, setPhonesText] = useState("");
  const [notes, setNotes] = useState<TaskBodyDoc>(EMPTY_TASK_BODY);
  const [color, setColor] = useState<EntityColor | undefined>();
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
    () => ({ displayName, emailsText, phonesText, notes, color }),
    [displayName, emailsText, phonesText, notes, color],
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
          displayName: next.displayName,
          emails: next.emailsText
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
          phones: next.phonesText
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          notes: next.notes,
          color: next.color,
        }),
      );
      setContact(saved);
      cache.upsertContact(saved);
      return {
        displayName: saved.displayName,
        emailsText: saved.emails.join(", "),
        phonesText: saved.phones.join(", "),
        notes: saved.notes,
        color: saved.color,
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setDisplayName(canonical.displayName);
      setEmailsText(canonical.emailsText);
      setPhonesText(canonical.phonesText);
      setNotes(canonical.notes);
      setColor(canonical.color);
      setError(null);
    },
  });

  useEffect(() => {
    if (!vault) return;
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
        setDisplayName(loaded.displayName);
        setEmailsText(loaded.emails.join(", "));
        setPhonesText(loaded.phones.join(", "));
        setNotes(loaded.notes);
        setColor(loaded.color);
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
  }, [vault, workspaceId, contactId, getWorkspaceKey, upsertContact]);

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
          displayName: action.displayName,
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
    for (const p of cache.projects) {
      items.push({ kind: "project", id: p.id, label: p.name });
    }
    return items;
  }, [cache.tasks, cache.notes, cache.projects]);

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <InlineTitle
              value={displayName}
              onChange={setDisplayName}
              onBlur={flush}
              placeholder="Display name"
              disabled={deleting}
              maxLength={500}
              aria-label="Display name"
              className="min-w-0 flex-1"
            />
            <DeleteButton
              disabled={deleting}
              busy={deleting}
              dialogTitle="Delete this contact?"
              dialogDescription="This permanently deletes the contact. This cannot be undone."
              onConfirm={onDelete}
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Emails
            </span>
            <Input
              variant="seamless"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              onBlur={flush}
              placeholder="comma-separated"
              disabled={deleting}
              aria-label="Emails"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Phones
            </span>
            <Input
              variant="seamless"
              value={phonesText}
              onChange={(e) => setPhonesText(e.target.value)}
              onBlur={flush}
              placeholder="comma-separated"
              disabled={deleting}
              aria-label="Phones"
            />
          </label>
          <EntityColorPicker
            value={color}
            disabled={deleting}
            onChange={setColor}
          />

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
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {storageLimitMessage}
            </p>
          ) : null}
          <BacklinksPanel
            workspaceId={workspaceId}
            kind="contact"
            id={contactId}
          />
          <SaveStatus
            status={status}
            savedAt={savedAt}
            onRetry={flush}
          />
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {pendingProjectPick ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg">
            <p className="text-sm font-medium">{pendingProjectPick.title}</p>
            <ul className="mt-3 flex max-h-60 flex-col gap-1 overflow-auto">
              {cache.projects.map((p) => (
                <li key={p.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => pendingProjectPick.resolve(p.id)}
                  >
                    {p.name}
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => pendingProjectPick.resolve(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
