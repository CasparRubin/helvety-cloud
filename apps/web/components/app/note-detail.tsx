"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import {
  TaskBodyEditor,
  type EntityLinkAction,
} from "@/components/app/task-body-editor";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import {
  EntityDetailLayout,
  EntityDetailShell,
} from "@/components/app/entity-detail-shell";
import { EntityTimestampsCard } from "@/components/app/entity-timestamps-card";
import { InlineTitle } from "@/components/app/inline-title";
import { PageActions } from "@/components/app/page-actions";
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
import { Label } from "@/components/ui/label";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { createContact } from "@/lib/client-crypto/contacts";
import {
  EMPTY_NOTE_BODY,
  toNotePlaintext,
  type TaskBodyDoc,
} from "@/lib/client-crypto/note-plaintext";
import {
  deleteNote,
  loadDecryptedNote,
  saveNote,
  type DecryptedNote,
} from "@/lib/client-crypto/notes";
import { createTask } from "@/lib/client-crypto/tasks";

type NoteDetailProps = {
  workspaceId: string;
  noteId: string;
};

type NoteDraft = {
  title: string;
  body: TaskBodyDoc;
  projectId: string;
};

export function NoteDetail({ workspaceId, noteId }: NoteDetailProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const cache = useEntityCache();
  const { upsertNote } = cache;

  const [note, setNote] = useState<DecryptedNote | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<TaskBodyDoc>(EMPTY_NOTE_BODY);
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingProjectPick, setPendingProjectPick] = useState<{
    title: string;
    resolve: (projectId: string | null) => void;
  } | null>(null);
  const [storageLimitMessage, setStorageLimitMessage] = useState<string | null>(
    null,
  );

  const noteRef = useRef(note);
  const projectIdRef = useRef(projectId);
  useEffect(() => {
    noteRef.current = note;
    projectIdRef.current = projectId;
  });

  const draft = useMemo<NoteDraft>(
    () => ({ title, body, projectId }),
    [title, body, projectId],
  );

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(note) && !loading && !deleting,
    save: async (next) => {
      const current = noteRef.current;
      if (!current) throw new Error("Note not loaded");
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveNote(
        workspaceId,
        key,
        current,
        toNotePlaintext(next.title, next.body),
        {
          projectId: next.projectId || null,
        },
      );
      setNote(saved);
      cache.upsertNote(saved);
      return {
        title: saved.title,
        body: saved.body,
        projectId: saved.projectId ?? "",
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setTitle(canonical.title);
      setBody(canonical.body);
      setProjectId(canonical.projectId);
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
        const loaded = await loadDecryptedNote(workspaceId, noteId, key);
        if (cancelled) return;
        setNote(loaded);
        setTitle(loaded.title);
        setBody(loaded.body);
        setProjectId(loaded.projectId ?? "");
        setError(null);
        upsertNote(loaded);
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
  }, [userKeys, workspaceId, noteId, getWorkspaceKey, upsertNote]);

  async function onDelete() {
    if (!note || deleting || status === "saving") return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNote(workspaceId, note);
      router.push(`/app/w/${workspaceId}/notes`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function pickProjectForNewTask(): Promise<string | null> {
    if (projectIdRef.current) return projectIdRef.current;
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
        if (!projectIdRef.current) {
          setProjectId(projectForTask);
        }
        return { kind: "task", id: task.id };
      }
      case "create-contact": {
        const contact = await createContact(workspaceId, key, {
          displayName: action.displayName,
        });
        cache.upsertContact(contact);
        return { kind: "contact", id: contact.id };
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
      items.push({ kind: "contact", id: c.id, label: c.displayName });
    }
    return items;
  }, [cache.tasks, cache.contacts]);

  if (!userKeys) return null;

  return (
    <EntityDetailShell loading={loading} error={error}>
      <PageActions>
        <DeleteButton
          disabled={deleting}
          busy={deleting}
          dialogTitle="Delete this note?"
          dialogDescription="This permanently deletes the note. This cannot be undone."
          onConfirm={onDelete}
        />
      </PageActions>
      <EntityDetailLayout
        main={
          <>
            <InlineTitle
              value={title}
              onChange={setTitle}
              onBlur={flush}
              placeholder="Untitled note"
              disabled={deleting}
              maxLength={500}
              className="min-w-0"
            />

            <TaskBodyEditor
              content={body}
              onChange={setBody}
              disabled={deleting}
              enableEntityLinks
              entityLinkSourceKind="note"
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
            <BacklinksPanel workspaceId={workspaceId} kind="note" id={noteId} />
          </>
        }
        aside={
          <>
            {note ? (
              <EntityTimestampsCard
                createdAt={note.createdAt}
                updatedAt={note.updatedAt}
                status={status}
                savedAt={savedAt}
                onRetry={flush}
              />
            ) : null}

            <Card size="sm">
              <CardContent className="flex flex-col gap-1.5">
                <Label
                  htmlFor="note-detail-project"
                  className="text-xs text-muted-foreground"
                >
                  Filed under project
                </Label>
                <select
                  id="note-detail-project"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  value={projectId}
                  disabled={deleting}
                  onChange={(e) => setProjectId(e.target.value)}
                  onBlur={flush}
                >
                  <option value="">None</option>
                  {cache.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
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
