"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { IssueBodyEditor } from "@/components/app/issue-body-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  EMPTY_NOTE_BODY,
  toNotePlaintext,
  type IssueBodyDoc,
} from "@/lib/vault/note-plaintext";
import {
  loadDecryptedNote,
  saveNote,
  softDeleteNote,
  type DecryptedNote,
} from "@/lib/vault/notes";
import {
  loadDecryptedProjects,
  type DecryptedProject,
} from "@/lib/vault/projects";
import {
  loadDecryptedIssues,
  type DecryptedIssue,
} from "@/lib/vault/issues";

const AUTOSAVE_MS = 600;

type NoteDetailProps = {
  workspaceId: string;
  noteId: string;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function NoteDetail({ workspaceId, noteId }: NoteDetailProps) {
  const router = useRouter();
  const { vault, getWorkspaceKey } = useVaultSession();

  const [note, setNote] = useState<DecryptedNote | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<IssueBodyDoc>(EMPTY_NOTE_BODY);
  const [tagsText, setTagsText] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [issueId, setIssueId] = useState<string>("");
  const [projects, setProjects] = useState<DecryptedProject[]>([]);
  const [issues, setIssues] = useState<DecryptedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const tagsTextRef = useRef(tagsText);
  const projectIdRef = useRef(projectId);
  const issueIdRef = useRef(issueId);
  const noteRef = useRef(note);
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
    tagsTextRef.current = tagsText;
    projectIdRef.current = projectId;
    issueIdRef.current = issueId;
    noteRef.current = note;
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
        const [loaded, projectsPage] = await Promise.all([
          loadDecryptedNote(workspaceId, noteId, key),
          loadDecryptedProjects(workspaceId, key, { limit: 100 }),
        ]);
        if (cancelled) return;
        setNote(loaded);
        setTitle(loaded.title);
        setBody(loaded.body);
        setTagsText(loaded.tags.join(", "));
        setProjectId(loaded.projectId ?? "");
        setIssueId(loaded.issueId ?? "");
        setProjects(projectsPage.projects);
        loadedSnapshotRef.current = snapshot(
          loaded.title,
          loaded.body,
          loaded.tags.join(", "),
          loaded.projectId ?? "",
          loaded.issueId ?? "",
        );
        setSaveStatus("idle");
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load note");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, noteId, getWorkspaceKey]);

  useEffect(() => {
    if (!vault || !projectId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const key = await getWorkspaceKey(workspaceId);
        if (cancelled) return;
        const page = await loadDecryptedIssues(workspaceId, projectId, key, {
          limit: 100,
        });
        if (cancelled) return;
        setIssues(page.issues);
      } catch {
        if (!cancelled) setIssues([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vault, workspaceId, projectId, getWorkspaceKey]);

  async function persist() {
    const current = noteRef.current;
    if (!current || deletingRef.current) return;

    const nextTitle = titleRef.current;
    const nextBody = bodyRef.current;
    const nextTagsText = tagsTextRef.current;
    const nextProjectId = projectIdRef.current;
    const nextIssueId = issueIdRef.current;
    const snap = snapshot(
      nextTitle,
      nextBody,
      nextTagsText,
      nextProjectId,
      nextIssueId,
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
      const tags = nextTagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const saved = await saveNote(
        workspaceId,
        key,
        current,
        toNotePlaintext(nextTitle, nextBody, tags),
        {
          projectId: nextProjectId || null,
          issueId: nextIssueId || null,
        },
      );
      loadedSnapshotRef.current = snapshot(
        saved.title,
        saved.body,
        saved.tags.join(", "),
        saved.projectId ?? "",
        saved.issueId ?? "",
      );
      if (!mountedRef.current) return;
      setNote(saved);
      if (
        snapshot(
          titleRef.current,
          bodyRef.current,
          tagsTextRef.current,
          projectIdRef.current,
          issueIdRef.current,
        ) === snap
      ) {
        setTitle(saved.title);
        setBody(saved.body);
        setTagsText(saved.tags.join(", "));
        setProjectId(saved.projectId ?? "");
        setIssueId(saved.issueId ?? "");
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
    if (!note || loading) return;
    const snap = snapshot(title, body, tagsText, projectId, issueId);
    if (snap === loadedSnapshotRef.current) return;

    setSaveStatus("dirty");
    const timer = window.setTimeout(() => {
      void persistRef.current();
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [title, body, tagsText, projectId, issueId, note, loading, workspaceId]);

  useEffect(() => {
    function flushIfDirty() {
      const current = noteRef.current;
      if (!current || deletingRef.current) return;
      const snap = snapshot(
        titleRef.current,
        bodyRef.current,
        tagsTextRef.current,
        projectIdRef.current,
        issueIdRef.current,
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
  }, [workspaceId, noteId]);

  async function onDelete() {
    if (!note || deleting || savingRef.current) return;
    if (!window.confirm("Delete this note?")) return;
    setDeleting(true);
    setError(null);
    try {
      await softDeleteNote(workspaceId, note);
      router.push(`/app/w/${workspaceId}/notes`);
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
          href={`/app/w/${workspaceId}/notes`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Notes
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">Note</h1>
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
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags (comma-separated)"
            disabled={deleting}
            aria-label="Tags"
          />
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Project link
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={projectId}
                disabled={deleting}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setIssueId("");
                }}
                aria-label="Linked project"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Issue link
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                value={issueId}
                disabled={deleting || !projectId}
                onChange={(e) => setIssueId(e.target.value)}
                aria-label="Linked issue"
              >
                <option value="">None</option>
                {(!projectId ? [] : issues).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
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

function snapshot(
  title: string,
  body: IssueBodyDoc,
  tagsText: string,
  projectId: string,
  issueId: string,
): string {
  return JSON.stringify({ title, body, tagsText, projectId, issueId });
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
