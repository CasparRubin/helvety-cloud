"use client";

import { useEffect, useState } from "react";
import type { CommentParentKind } from "@helvety-cloud/api-contract";

import { EntityErrorAlert } from "@/components/app/entity-list-shell";
import { useDateTimePrefs } from "@/components/app/datetime-prefs";
import { TaskBodyEditor } from "@/components/app/task-body-editor";
import { Button } from "@/components/ui/button";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { ApiClientError } from "@/lib/api/v1-client";
import {
  EMPTY_COMMENT_BODY,
  type TaskBodyDoc,
} from "@/lib/client-crypto/comment-plaintext";
import {
  createComment,
  deleteComment,
  loadDecryptedComments,
  saveComment,
  type DecryptedComment,
} from "@/lib/client-crypto/comments";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type CommentsSectionProps = {
  workspaceId: string;
  parentKind: CommentParentKind;
  parentId: string;
};

function isEmptyBody(body: TaskBodyDoc): boolean {
  for (const node of body.content ?? []) {
    if (node.type !== "paragraph") return false;
    const kids = (node as { content?: { type: string; text?: string }[] })
      .content;
    for (const kid of kids ?? []) {
      if (kid.type === "text" && kid.text?.trim()) return false;
    }
  }
  return true;
}

export function CommentsSection({
  workspaceId,
  parentKind,
  parentId,
}: CommentsSectionProps) {
  const { prefs } = useDateTimePrefs();
  const { userKeys, getWorkspaceKey } = useCryptoSession();
  const [comments, setComments] = useState<DecryptedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState<TaskBodyDoc>(EMPTY_COMMENT_BODY);
  const [composerKey, setComposerKey] = useState(0);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState<TaskBodyDoc>(EMPTY_COMMENT_BODY);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState<TaskBodyDoc>(EMPTY_COMMENT_BODY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userKeys) return;
      setLoading(true);
      setError(null);
      try {
        const key = await getWorkspaceKey(workspaceId);
        const rows = await loadDecryptedComments(
          workspaceId,
          key,
          parentKind,
          parentId,
        );
        if (!cancelled) setComments(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load comments");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, parentKind, parentId, getWorkspaceKey]);

  const roots = comments.filter((c) => !c.parentCommentId);
  const repliesByParent = new Map<string, DecryptedComment[]>();
  for (const c of comments) {
    if (!c.parentCommentId) continue;
    const list = repliesByParent.get(c.parentCommentId) ?? [];
    list.push(c);
    repliesByParent.set(c.parentCommentId, list);
  }

  async function postComment(
    body: TaskBodyDoc,
    parentCommentId: string | null,
  ) {
    if (!userKeys || busy || isEmptyBody(body)) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const created = await createComment(workspaceId, key, {
        parentKind,
        parentId,
        parentCommentId,
        body,
      });
      setComments((prev) => [...prev, created]);
      if (parentCommentId) {
        setReplyToId(null);
        setReplyBody(EMPTY_COMMENT_BODY);
      } else {
        setComposer(EMPTY_COMMENT_BODY);
        setComposerKey((k) => k + 1);
      }
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to post comment",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(comment: DecryptedComment) {
    if (!userKeys || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveComment(workspaceId, key, comment, editBody);
      setComments((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save comment");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(commentId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteComment(workspaceId, commentId);
      setComments((prev) =>
        prev.filter(
          (c) => c.id !== commentId && c.parentCommentId !== commentId,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete comment");
    } finally {
      setBusy(false);
    }
  }

  function renderComment(comment: DecryptedComment, depth: number) {
    const replies = repliesByParent.get(comment.id) ?? [];
    const editing = editingId === comment.id;
    const author =
      userKeys?.userId === comment.authorId ? "You" : "Member";
    return (
      <li
        key={comment.id}
        className={cn(
          "flex flex-col gap-1.5",
          depth === 0 &&
            "rounded-lg border border-border bg-muted/30 px-3 py-2.5",
          depth > 0 &&
            "ml-4 rounded-md border-l border-border bg-muted/20 py-2 pl-3 pr-2.5",
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{author}</span>
          <span>{formatDateTime(comment.createdAt, prefs)}</span>
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <TaskBodyEditor
              content={editBody}
              onChange={setEditBody}
              disabled={busy}
              compact
              placeholder="Edit comment…"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || isEmptyBody(editBody)}
                onClick={() => void onSaveEdit(comment)}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <TaskBodyEditor
            content={comment.body}
            onChange={() => {}}
            disabled
            compact
            className="min-h-0"
          />
        )}
        {!editing ? (
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => {
                setReplyToId(comment.id);
                setReplyBody(EMPTY_COMMENT_BODY);
              }}
            >
              Reply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={() => {
                setEditingId(comment.id);
                setEditBody(comment.body);
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive"
              disabled={busy}
              onClick={() => void onDelete(comment.id)}
            >
              Delete
            </Button>
          </div>
        ) : null}
        {replyToId === comment.id ? (
          <div className="flex flex-col gap-2">
            <TaskBodyEditor
              content={replyBody}
              onChange={setReplyBody}
              disabled={busy}
              compact
              placeholder="Write a reply…"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || isEmptyBody(replyBody)}
                onClick={() => void postComment(replyBody, comment.id)}
              >
                Reply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setReplyToId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        {replies.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {replies.map((r) => renderComment(r, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
      <h2 className="text-sm font-medium text-foreground">Comments</h2>
      {error ? <EntityErrorAlert message={error} /> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : roots.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {roots.map((c) => renderComment(c, 0))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2.5">
        <TaskBodyEditor
          key={composerKey}
          content={composer}
          onChange={setComposer}
          disabled={busy}
          compact
          placeholder="Write a comment…"
        />
        <div>
          <Button
            type="button"
            size="sm"
            disabled={busy || isEmptyBody(composer)}
            onClick={() => void postComment(composer, null)}
          >
            Post comment
          </Button>
        </div>
      </div>
    </section>
  );
}
