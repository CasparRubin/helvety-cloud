"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntityLinkTarget } from "@helvety-cloud/api-contract";

import { BacklinksPanel } from "@/components/app/backlinks-panel";
import { CommentsSection } from "@/components/app/comments-section";
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
import { LimitExceededAlert } from "@/components/app/limit-exceeded-notice";
import { InlineTitle } from "@/components/app/inline-title";
import { PageDangerActions } from "@/components/app/page-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEntityCache } from "@/components/unlock/entity-cache";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { createContact } from "@/lib/client-crypto/contacts";
import { formatContactName } from "@/lib/client-crypto/contact-plaintext";
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
};

export function NoteDetail({ workspaceId, noteId }: NoteDetailProps) {
  const router = useRouter();
  const { userKeys, workspaces, getWorkspaceKey } = useCryptoSession();
  const cache = useEntityCache();
  const { upsertNote } = cache;

  const [note, setNote] = useState<DecryptedNote | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<TaskBodyDoc>(EMPTY_NOTE_BODY);
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
  useEffect(() => {
    noteRef.current = note;
  });

  const draft = useMemo<NoteDraft>(() => ({ title, body }), [title, body]);

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
      );
      setNote(saved);
      cache.upsertNote(saved);
      return {
        title: saved.title,
        body: saved.body,
      };
    },
    onError: (message) => setError(message),
    onSaved: (canonical) => {
      setTitle(canonical.title);
      setBody(canonical.body);
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
    const cached = cache.notes.find((n) => n.id === noteId);
    const linkedProjects = (
      cached?.links ??
      noteRef.current?.links ??
      []
    ).filter((l) => l.kind === "project");
    if (linkedProjects.length === 1) return linkedProjects[0]!.id;
    if (cache.projects.length === 1) return cache.projects[0]!.id;
    return new Promise((resolve) => {
      setPendingProjectPick({
        title: "Choose a project for the new task",
        resolve: (pickId) => {
          setPendingProjectPick(null);
          resolve(pickId);
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
        const task = await createTask(
          workspaceId,
          projectForTask,
          key,
          { title: action.title },
          0,
          workspaces.find((item) => item.id === workspaceId)?.categorizations,
        );
        cache.upsertTask(task);
        return { kind: "task", id: task.id };
      }
      case "create-contact": {
        const contact = await createContact(workspaceId, key, {
          firstName: action.firstName,
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
    const items: {
      kind: EntityLinkTarget["kind"];
      id: string;
      label: string;
    }[] = [];
    for (const t of cache.tasks) {
      items.push({ kind: "task", id: t.id, label: t.title });
    }
    for (const c of cache.contacts) {
      items.push({
        kind: "contact",
        id: c.id,
        label: formatContactName(c) || "Untitled",
      });
    }
    return items;
  }, [cache.tasks, cache.contacts]);

  if (!userKeys) return null;

  return (
    <EntityDetailShell loading={loading} error={error}>
      <PageDangerActions>
        <DeleteButton
          disabled={deleting}
          busy={deleting}
          dialogTitle="Delete this note?"
          dialogDescription="This permanently deletes the note, its comments, attached files, and its links to other items. This cannot be undone."
          onConfirm={onDelete}
        />
      </PageDangerActions>
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
              <LimitExceededAlert
                title="Storage limit"
                message={storageLimitMessage}
                workspaceId={workspaceId}
              />
            ) : null}
            <CommentsSection
              workspaceId={workspaceId}
              parentKind="note"
              parentId={noteId}
            />
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
            <BacklinksPanel workspaceId={workspaceId} kind="note" id={noteId} />
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
            <DialogTitle>
              {pendingProjectPick?.title ?? "Choose project"}
            </DialogTitle>
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
