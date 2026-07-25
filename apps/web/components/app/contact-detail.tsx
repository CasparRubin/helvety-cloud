"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  deleteContact,
  loadDecryptedContact,
  saveContact,
  toContactPlaintext,
  type DecryptedContact,
} from "@/lib/vault/contacts";

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

  const [contact, setContact] = useState<DecryptedContact | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emailsText, setEmailsText] = useState("");
  const [phonesText, setPhonesText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const displayNameRef = useRef(displayName);
  const emailsTextRef = useRef(emailsText);
  const phonesTextRef = useRef(phonesText);
  const notesRef = useRef(notes);
  const contactRef = useRef(contact);
  const deletingRef = useRef(deleting);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const loadedSnapshotRef = useRef<string | null>(null);
  const getWorkspaceKeyRef = useRef(getWorkspaceKey);
  const mountedRef = useRef(true);
  const persistRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    displayNameRef.current = displayName;
    emailsTextRef.current = emailsText;
    phonesTextRef.current = phonesText;
    notesRef.current = notes;
    contactRef.current = contact;
    deletingRef.current = deleting;
    getWorkspaceKeyRef.current = getWorkspaceKey;
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
        loadedSnapshotRef.current = snapshot(
          loaded.displayName,
          loaded.emails.join(", "),
          loaded.phones.join(", "),
          loaded.notes,
        );
        setSaveStatus("idle");
        setError(null);
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
    const snap = snapshot(nextName, nextEmails, nextPhones, nextNotes);
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
        }),
      );
      loadedSnapshotRef.current = snapshot(
        saved.displayName,
        saved.emails.join(", "),
        saved.phones.join(", "),
        saved.notes,
      );
      if (!mountedRef.current) return;
      setContact(saved);
      if (
        snapshot(
          displayNameRef.current,
          emailsTextRef.current,
          phonesTextRef.current,
          notesRef.current,
        ) === snap
      ) {
        setDisplayName(saved.displayName);
        setEmailsText(saved.emails.join(", "));
        setPhonesText(saved.phones.join(", "));
        setNotes(saved.notes);
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
    const snap = snapshot(displayName, emailsText, phonesText, notes);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [displayName, emailsText, phonesText, notes, contact, loading, workspaceId]);

  useEffect(() => {
    function flushIfDirty() {
      const current = contactRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(
        displayNameRef.current,
        emailsTextRef.current,
        phonesTextRef.current,
        notesRef.current,
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

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Contact</h1>
        <p className="text-sm text-muted-foreground">
          Edits are encrypted on your device before upload.
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
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            disabled={deleting}
            rows={4}
            aria-label="Notes"
            className="min-h-[6rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
    </div>
  );
}

function snapshot(
  displayName: string,
  emailsText: string,
  phonesText: string,
  notes: string,
): string {
  return JSON.stringify({ displayName, emailsText, phonesText, notes });
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
