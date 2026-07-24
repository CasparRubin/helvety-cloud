"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IssueBodyEditor } from "@/components/app/issue-body-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  EMPTY_ISSUE_BODY,
  toIssuePlaintext,
  type IssueBodyDoc,
} from "@/lib/vault/issue-plaintext";
import {
  loadDecryptedIssue,
  saveIssue,
  softDeleteIssue,
  type DecryptedIssue,
} from "@/lib/vault/issues";

const AUTOSAVE_MS = 600;

type IssueDetailProps = {
  workspaceId: string;
  projectId: string;
  issueId: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function IssueDetail({
  workspaceId,
  projectId,
  issueId,
}: IssueDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [issue, setIssue] = useState<DecryptedIssue | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<IssueBodyDoc>(EMPTY_ISSUE_BODY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const issueRef = useRef(issue);
  const deletingRef = useRef(deleting);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const loadedSnapshotRef = useRef<string | null>(null);
  const getWorkspaceKeyRef = useRef(getWorkspaceKey);
  const mountedRef = useRef(true);
  const persistRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    titleRef.current = title;
    bodyRef.current = body;
    issueRef.current = issue;
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
        const loaded = await loadDecryptedIssue(
          workspaceId,
          projectId,
          issueId,
          key,
        );
        if (cancelled) return;
        setIssue(loaded);
        setTitle(loaded.title);
        setBody(loaded.body);
        loadedSnapshotRef.current = snapshot(loaded.title, loaded.body);
        setSaveStatus("idle");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load issue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, issueId, getWorkspaceKey]);

  async function persist() {
    const current = issueRef.current;
    if (!current || deletingRef.current) return;

    const nextTitle = titleRef.current;
    const nextBody = bodyRef.current;
    const snap = snapshot(nextTitle, nextBody);
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
      const saved = await saveIssue(
        workspaceId,
        projectId,
        key,
        current,
        toIssuePlaintext(nextTitle, nextBody),
      );
      loadedSnapshotRef.current = snapshot(saved.title, saved.body);
      if (!mountedRef.current) return;
      setIssue(saved);
      if (snapshot(titleRef.current, bodyRef.current) === snap) {
        setTitle(saved.title);
        setBody(saved.body);
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
    if (!issue || loading) return;
    const snap = snapshot(title, body);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [title, body, issue, loading, workspaceId, projectId]);

  // Flush dirty edits on SPA leave / hard navigation (best-effort for pagehide).
  useEffect(() => {
    function flushIfDirty() {
      const current = issueRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(titleRef.current, bodyRef.current);
      if (snap === loadedSnapshotRef.current) return;
      void persistRef.current();
    }

    const onPageHide = () => flushIfDirty();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushIfDirty();
    };
  }, [workspaceId, projectId, issueId]);

  async function onDelete() {
    if (!issue || deleting || savingRef.current) return;
    if (!window.confirm("Delete this issue?")) return;
    setDeleting(true);
    setError(null);
    try {
      await softDeleteIssue(workspaceId, projectId, issue);
      router.push(`/app/w/${workspaceId}/p/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (!vault) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div>
        <Link
          href={`/app/w/${workspaceId}/p/${projectId}`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Issues
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">Issue</h1>
        <p className="text-sm text-muted-foreground">
          Edits are encrypted on your device before upload.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={deleting}
            maxLength={500}
            aria-label="Title"
          />
          <IssueBodyEditor
            content={body}
            onChange={setBody}
            disabled={deleting}
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              Delete
            </Button>
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

function snapshot(title: string, body: IssueBodyDoc): string {
  return JSON.stringify({ title, body });
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
