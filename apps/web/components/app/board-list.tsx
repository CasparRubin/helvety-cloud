"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PinIcon } from "lucide-react";

import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DateTimeText } from "@/components/app/datetime-text";
import {
  EntityListRow,
  EntityListShell,
} from "@/components/app/entity-list-shell";
import { ListSearchInput } from "@/components/app/list-search-input";
import { ListSortToggle } from "@/components/app/list-sort-toggle";
import {
  ListRefreshButton,
  PageActions,
  WorkspaceSettingsAction,
} from "@/components/app/page-actions";
import { Button } from "@/components/ui/button";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  createBoard,
  loadDecryptedBoards,
  reorderPinnedBoards,
  setBoardPinned,
  sortBoardsForDisplay,
  type DecryptedBoard,
} from "@/lib/client-crypto/boards";
import { matchesQuery } from "@/lib/list-search";

type BoardSort = "created" | "modified";

const BOARD_SORT_OPTIONS = [
  { id: "created" as const, label: "Created" },
  { id: "modified" as const, label: "Modified" },
];

function compareBoards(a: DecryptedBoard, b: DecryptedBoard, sort: BoardSort) {
  const field = sort === "created" ? "createdAt" : "updatedAt";
  const byDate = b[field].localeCompare(a[field]);
  if (byDate !== 0) return byDate;
  return a.id.localeCompare(b.id);
}

type BoardListProps = {
  workspaceId: string;
};

export function BoardList({ workspaceId }: BoardListProps) {
  const router = useRouter();
  const { userKeys, getWorkspaceKey } = useCryptoSession();

  const [boards, setBoards] = useState<DecryptedBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BoardSort>("created");
  const deferredQuery = useDeferredValue(query);

  const loadBoards = useCallback(async () => {
    const key = await getWorkspaceKey(workspaceId);
    return loadDecryptedBoards(workspaceId, key);
  }, [getWorkspaceKey, workspaceId]);

  const handleRefresh = useCallback(async () => {
    try {
      const page = await loadBoards();
      setBoards(page.boards);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, [loadBoards]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const page = await loadBoards();
        if (cancelled) return;
        setBoards(page.boards);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load boards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadBoards]);

  async function onCreate(title: string) {
    setBusy(true);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const nextOrder =
        boards.reduce((max, b) => Math.max(max, b.sortOrder), -1) + 1;
      const created = await createBoard(
        workspaceId,
        key,
        { title },
        nextOrder,
      );
      setBoards((prev) => [created, ...prev]);
      router.push(`/app/w/${workspaceId}/boards/${created.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function onTogglePinned(board: DecryptedBoard) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const updated = await setBoardPinned(
        workspaceId,
        key,
        board,
        !board.isPinned,
        boards,
      );
      setBoards((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update pin");
    } finally {
      setBusy(false);
    }
  }

  async function onReorderPinned(boardId: string, direction: "up" | "down") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = await getWorkspaceKey(workspaceId);
      const next = await reorderPinnedBoards(
        workspaceId,
        key,
        boards,
        boardId,
        direction,
      );
      setBoards(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  if (!userKeys) return null;

  const filtering = deferredQuery.trim().length > 0;
  const filteredBoards = sortBoardsForDisplay(
    boards.filter((b) => matchesQuery([b.title], deferredQuery)),
    (a, b) => compareBoards(a, b, sort),
  );
  const pinnedBoards = filteredBoards.filter((board) => board.isPinned);
  const pinnedIndexById = new Map(
    pinnedBoards.map((board, index) => [board.id, index]),
  );

  return (
    <>
      <ListRefreshButton disabled={busy} onRefresh={handleRefresh} />
      <PageActions>
        <CreateEntityDialog
          workspaceId={workspaceId}
          triggerLabel="New board"
          dialogTitle="New board"
          fieldLabel="Title"
          fieldPlaceholder="Board title"
          disabled={busy}
          onCreate={onCreate}
        />
      </PageActions>
      <WorkspaceSettingsAction workspaceId={workspaceId} />
      <EntityListShell
        title="Boards"
        belowTitle={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ListSearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Filter boards…"
              disabled={loading || boards.length === 0}
            />
            <ListSortToggle
              value={sort}
              onValueChange={setSort}
              options={BOARD_SORT_OPTIONS}
              disabled={loading || boards.length === 0}
            />
          </div>
        }
        error={error}
        loading={loading}
        loadingLabel="Loading boards…"
        empty={
          !loading &&
          (boards.length === 0 || (filtering && filteredBoards.length === 0))
        }
        emptyLabel={
          boards.length === 0 ? "No boards yet." : "No matching boards."
        }
      >
        {filteredBoards.map((board) => {
          const dateIso =
            sort === "created" ? board.createdAt : board.updatedAt;
          const dateLabel = sort === "created" ? "Created" : "Modified";
          return (
            <EntityListRow key={board.id} className="flex items-start gap-2">
              <Link
                href={`/app/w/${workspaceId}/boards/${board.id}`}
                className="flex min-w-0 flex-1 flex-col gap-1"
              >
                <span className="font-medium">{board.title || "Untitled"}</span>
                <span className="text-xs text-muted-foreground">
                  {dateLabel} <DateTimeText value={dateIso} />
                </span>
              </Link>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onTogglePinned(board)}
                  aria-label={board.isPinned ? "Unpin board" : "Pin board"}
                >
                  <PinIcon
                    className="size-4"
                    aria-hidden="true"
                    fill={board.isPinned ? "currentColor" : "none"}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    busy ||
                    filtering ||
                    !board.isPinned ||
                    (pinnedIndexById.get(board.id) ?? 0) === 0
                  }
                  onClick={() => void onReorderPinned(board.id, "up")}
                  aria-label="Move pin up"
                >
                  ⇡
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    busy ||
                    filtering ||
                    !board.isPinned ||
                    (pinnedIndexById.get(board.id) ?? 0) >=
                      pinnedBoards.length - 1
                  }
                  onClick={() => void onReorderPinned(board.id, "down")}
                  aria-label="Move pin down"
                >
                  ⇣
                </Button>
              </div>
            </EntityListRow>
          );
        })}
      </EntityListShell>
    </>
  );
}
