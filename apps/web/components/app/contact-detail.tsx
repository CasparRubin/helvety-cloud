"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityColorPicker } from "@/components/app/entity-color-picker";
import {
  TaskBodyEditor,
  type EntityLinkAction,
} from "@/components/app/task-body-editor";
import { useVaultEntityCache } from "@/components/vault/vault-entity-cache";
import { useVaultSession } from "@/components/vault/vault-session-provider";
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

const AUTOSAVE_MS = 600;

type ContactDetailProps = {
  workspaceId: string;
  contactId: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function ContactDetail({
  workspaceId,
  contactId,
}: ContactDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();
  const cache = useVaultEntityCache();

  const [contact, setContact] = useState<DecryptedContact | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [phonesText, setPhonesText] = useState("");
  const [notes, setNotes] = useState<TaskBodyDoc>(EMPTY_TASK_BODY);
  const [color, setColor] = useState<EntityColor | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pendingProjectPick, setPendingProjectPick] = useState<{
    title: string;
    resolve: (id: string | null) => void;
  } | null>(null);

  const displayNameRef = useRef(displayName);
  const emailsTextRef = useRef(emailsText);
  const phonesTextRef = useRef(phonesText);
  const notesRef = useRef(notes);
  const colorRef = useRef(color);
  const contactRef = useRef(contact);
  const deletingRef = useRef(deleting);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const loadedSnapshotRef = useRef<string | null>(null);
  const getWorkspaceKeyRef = useRef(getWorkspaceKey);
  const upsertContactRef = useRef(cache.upsertContact);
  const mountedRef = useRef(true);
  const persistRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    displayNameRef.current = displayName;
    emailsTextRef.current = emailsText;
    phonesTextRef.current = phonesText;
    notesRef.current = notes;
    colorRef.current = color;
    contactRef.current = contact;
    deletingRef.current = deleting;
    getWorkspaceKeyRef.current = getWorkspaceKey;
    upsertContactRef.current = cache.upsertContact;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        loadedSnapshotRef.current = snapshot(
          loaded.displayName,
          loaded.emails.join(", "),
          loaded.phones.join(", "),
          loaded.notes,
          loaded.color,
        );
        setSaveStatus("idle");
        setError(null);
        upsertContactRef.current(loaded);
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
  }, [vault, workspaceId, contactId, getWorkspaceKey]);

  async function persist() {
    const current = contactRef.current;
    if (!current || deletingRef.current) return;

    const nextName = displayNameRef.current;
    const nextEmails = emailsTextRef.current;
    const nextPhones = phonesTextRef.current;
    const nextNotes = notesRef.current;
    const nextColor = colorRef.current;
    const snap = snapshot(
      nextName,
      nextEmails,
      nextPhones,
      nextNotes,
      nextColor,
    );
    if (snap === loadedSnapshotRef.current) {
      if (mountedRef.current) {
        setSaveStatus((s) => (s === "dirty" ? "idle" : s));
      }
      return;
    }

    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    savingRef.current = true;
    if (mountedRef.current) {
      setSaveStatus("saving");
      setError(null);
    }
    try {
      const key = await getWorkspaceKeyRef.current(workspaceId);
      const saved = await saveContact(
        workspaceId,
        key,
        current,
        toContactPlaintext({
          displayName: nextName,
          emails: nextEmails.split(",").map((e) => e.trim()).filter(Boolean),
          phones: nextPhones.split(",").map((p) => p.trim()).filter(Boolean),
          notes: nextNotes,
          color: nextColor,
        }),
      );
      loadedSnapshotRef.current = snapshot(
        saved.displayName,
        saved.emails.join(", "),
        saved.phones.join(", "),
        saved.notes,
        saved.color,
      );
      if (!mountedRef.current) return;
      setContact(saved);
      upsertContactRef.current(saved);
      if (
        snapshot(
          displayNameRef.current,
          emailsTextRef.current,
          phonesTextRef.current,
          notesRef.current,
          colorRef.current,
        ) === snap
      ) {
        setDisplayName(saved.displayName);
        setEmailsText(saved.emails.join(", "));
        setPhonesText(saved.phones.join(", "));
        setNotes(saved.notes);
        setColor(saved.color);
      }
      setSavedAt(new Date().toLocaleTimeString());
      setSaveStatus("saved");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        await persist();
      }
    }
  }

  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(() => {
    if (!contact || loading) return;
    const snap = snapshot(displayName, emailsText, phonesText, notes, color);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [
    displayName,
    emailsText,
    phonesText,
    notes,
    color,
    contact,
    loading,
    workspaceId,
  ]);

  useEffect(() => {
    function flushIfDirty() {
      const current = contactRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(
        displayNameRef.current,
        emailsTextRef.current,
        phonesTextRef.current,
        notesRef.current,
        colorRef.current,
      );
      if (snap === loadedSnapshotRef.current) return;
      void persistRef.current();
    }

    const onPageHide = () => flushIfDirty();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushIfDirty();
    };
  }, [workspaceId, contactId]);

  async function onDelete() {
    if (!contact || deleting || savingRef.current) return;
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
    for (const c of cache.contacts) {
      if (c.id === contactId) continue;
      items.push({ kind: "contact", id: c.id, label: c.displayName });
    }
    for (const n of cache.notes) {
      items.push({ kind: "note", id: n.id, label: n.title });
    }
    for (const p of cache.projects) {
      items.push({ kind: "project", id: p.id, label: p.name });
    }
    return items;
  }, [cache.tasks, cache.contacts, cache.notes, cache.projects, contactId]);

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Contact</h1>
        <p className="text-sm text-muted-foreground">
          Select text to create linked tasks or contacts. Edits are encrypted on
          your device before upload.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            disabled={deleting}
            maxLength={500}
            aria-label="Display name"
          />
          <Input
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            placeholder="Emails (comma-separated)"
            disabled={deleting}
            aria-label="Emails"
          />
          <Input
            value={phonesText}
            onChange={(e) => setPhonesText(e.target.value)}
            placeholder="Phones (comma-separated)"
            disabled={deleting}
            aria-label="Phones"
          />
          <EntityColorPicker
            value={color}
            disabled={deleting}
            onChange={setColor}
          />

          <TaskBodyEditor
            content={notes}
            onChange={setNotes}
            disabled={deleting}
            enableEntityLinks
            linkCandidates={linkCandidates}
            onEntityLinkAction={onEntityLinkAction}
          />
          <BacklinksPanel
            workspaceId={workspaceId}
            kind="contact"
            id={contactId}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={deleting || saveStatus === "saving"}
              onClick={() => void persist()}
            >
              Save now
            </Button>
            <DeleteButton
              disabled={deleting}
              busy={deleting}
              dialogTitle="Delete this contact?"
              dialogDescription="This permanently deletes the contact. This cannot be undone."
              onConfirm={onDelete}
            />
            <SaveStatusLabel status={saveStatus} savedAt={savedAt} />
          </div>
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

function snapshot(
  displayName: string,
  emailsText: string,
  phonesText: string,
  notes: TaskBodyDoc,
  color: EntityColor | undefined,
): string {
  return JSON.stringify({
    displayName,
    emailsText,
    phonesText,
    notes,
    color: color ?? null,
  });
}

function SaveStatusLabel({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: string | null;
}) {
  switch (status) {
    case "idle":
      return null;
    case "dirty":
      return (
        <span className="text-xs text-muted-foreground">Unsaved changes</span>
      );
    case "saving":
      return <span className="text-xs text-muted-foreground">Saving…</span>;
    case "saved":
      return (
        <span className="text-xs text-muted-foreground">
          {savedAt ? `Saved ${savedAt}` : "Saved"}
        </span>
      );
    case "error":
      return <span className="text-xs text-destructive">Save failed</span>;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
