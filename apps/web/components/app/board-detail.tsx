"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BoardCanvas,
  type BoardCanvasGraph,
} from "@/components/app/board-canvas";
import { DeleteButton } from "@/components/app/confirm-delete-dialog";
import { EntityErrorAlert } from "@/components/app/entity-list-shell";
import { InlineTitle } from "@/components/app/inline-title";
import { PageDangerActions } from "@/components/app/page-actions";
import { SaveStatus } from "@/components/app/save-status";
import { Spinner } from "@/components/ui/spinner";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { useAutosave } from "@/lib/hooks/use-autosave";
import type {
  BoardGraphEdge,
  BoardGraphNode,
  BoardViewport,
} from "@/lib/client-crypto/board-plaintext";
import {
  deleteBoard,
  loadDecryptedBoard,
  saveBoard,
  type DecryptedBoard,
} from "@/lib/client-crypto/boards";

type BoardDetailProps = {
  workspaceId: string;
  boardId: string;
};

type BoardDraft = {
  title: string;
  nodes: BoardGraphNode[];
  edges: BoardGraphEdge[];
  viewport?: BoardViewport;
};

export function BoardDetail({ workspaceId, boardId }: BoardDetailProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [board, setBoard] = useState<DecryptedBoard | null>(null);
  const [title, setTitle] = useState("");
  const [nodes, setNodes] = useState<BoardGraphNode[]>([]);
  const [edges, setEdges] = useState<BoardGraphEdge[]>([]);
  const [viewport, setViewport] = useState<BoardViewport | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const key = await getWorkspaceKey(workspaceId);
        const loaded = await loadDecryptedBoard(workspaceId, boardId, key);
        if (cancelled) return;
        setBoard(loaded);
        setTitle(loaded.title);
        setNodes(loaded.nodes);
        setEdges(loaded.edges);
        setViewport(loaded.viewport);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load board");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, workspaceId, boardId, getWorkspaceKey]);

  const draft: BoardDraft = { title, nodes, edges, viewport };

  const { status, savedAt, flush } = useAutosave({
    draft,
    enabled: Boolean(userKeys && board && !deleting),
    delayMs: 900,
    save: async (next) => {
      const current = boardRef.current;
      if (!current) return;
      const key = await getWorkspaceKey(workspaceId);
      const saved = await saveBoard(workspaceId, key, current, {
        title: next.title,
        nodes: next.nodes,
        edges: next.edges,
        viewport: next.viewport,
      });
      setBoard(saved);
      return {
        title: saved.title,
        nodes: saved.nodes,
        edges: saved.edges,
        viewport: saved.viewport,
      };
    },
    onError: (message) => setError(message),
  });

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  const onGraphChange = useCallback((graph: BoardCanvasGraph) => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, []);

  const onViewportIdle = useCallback((next: BoardViewport) => {
    setViewport(next);
  }, []);

  async function onDelete() {
    if (!board || deleting || status === "saving") return;
    setDeleting(true);
    try {
      flush();
      await deleteBoard(workspaceId, boardId);
      router.push(`/app/w/${workspaceId}/boards`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Spinner />
        Loading…
      </div>
    );
  }

  if (!board) {
    return (
      <div className="p-6">
        {error ? <EntityErrorAlert message={error} /> : null}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-[24rem] flex-col">
      <PageDangerActions>
        <DeleteButton
          label="Delete board"
          dialogTitle="Delete this board?"
          dialogDescription="This permanently deletes the board canvas. Linked notes, contacts, tasks, and projects are not deleted. This cannot be undone."
          disabled={deleting || status === "saving"}
          busy={deleting}
          onConfirm={() => void onDelete()}
        />
      </PageDangerActions>
      {error ? (
        <div className="shrink-0 px-3 pt-2">
          <EntityErrorAlert message={error} />
        </div>
      ) : null}
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <InlineTitle
            value={title}
            onChange={setTitle}
            placeholder="Untitled board"
            className="text-lg"
          />
        </div>
        <SaveStatus
          status={status}
          savedAt={savedAt}
          onRetry={() => flush()}
        />
      </div>
      <div className="min-h-0 flex-1">
        <BoardCanvas
          initialNodes={board.nodes}
          initialEdges={board.edges}
          initialViewport={board.viewport}
          onGraphChange={onGraphChange}
          onViewportIdle={onViewportIdle}
        />
      </div>
    </div>
  );
}
