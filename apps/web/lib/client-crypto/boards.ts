import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type {
  EntityLinkTarget,
  BoardResponse,
} from "@helvety-cloud/api-contract";

import {
  deleteBoard as deleteBoardApi,
  getBoard,
  listBoards,
  putBoard,
  type ListBoardsParams,
} from "@/lib/api/v1-client";
import {
  extractEntityLinksFromBoardNodes,
  parseBoardPlaintext,
  toBoardPlaintext,
  type BoardGraphEdge,
  type BoardGraphNode,
  type BoardPlaintext,
  type BoardViewport,
} from "@/lib/client-crypto/board-plaintext";
import {
  comparePinned,
  movePinnedItem,
  nextPinSortOrder,
} from "@/lib/client-crypto/pins";

const textDecoder = new TextDecoder();

export type DecryptedBoard = {
  id: string;
  workspaceId: string;
  links: EntityLinkTarget[];
  title: string;
  nodes: BoardGraphNode[];
  edges: BoardGraphEdge[];
  viewport?: BoardViewport;
  sortOrder: number;
  isPinned: boolean;
  pinSortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function boardAad(boardId: string) {
  return {
    table: "boards" as const,
    recordId: boardId,
    field: "encrypted_blob" as const,
  };
}

async function encryptBoardContent(
  workspaceKey: Uint8Array,
  boardId: string,
  content: BoardPlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: boardAad(boardId),
    keyVersion,
  });
}

async function decryptBoardContent(
  workspaceKey: Uint8Array,
  boardId: string,
  envelope: CiphertextEnvelope,
): Promise<BoardPlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: boardAad(boardId),
  });
  return parseBoardPlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: BoardResponse,
): Promise<DecryptedBoard> {
  let title = "Untitled";
  let nodes: BoardGraphNode[] = [];
  let edges: BoardGraphEdge[] = [];
  let viewport: BoardViewport | undefined;
  try {
    const content = await decryptBoardContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    title = content.title;
    nodes = content.nodes;
    edges = content.edges;
    viewport = content.viewport;
  } catch {
    title = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    links: row.links,
    title,
    nodes,
    edges,
    viewport,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedBoards(
  workspaceId: string,
  workspaceKey: Uint8Array,
  params?: ListBoardsParams,
): Promise<{ boards: DecryptedBoard[]; nextCursor: string | null }> {
  const page = await listBoards(workspaceId, params);
  const boards = await Promise.all(
    page.boards.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { boards, nextCursor: page.nextCursor };
}

export async function loadDecryptedBoard(
  workspaceId: string,
  boardId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedBoard> {
  const row = await getBoard(workspaceId, boardId);
  return toDecrypted(workspaceKey, row);
}

export async function createBoard(
  workspaceId: string,
  workspaceKey: Uint8Array,
  content: { title: string },
  sortOrder = 0,
): Promise<DecryptedBoard> {
  const boardId = crypto.randomUUID();
  const plaintext = toBoardPlaintext({
    title: content.title,
    nodes: [],
    edges: [],
  });
  const encryptedBlob = await encryptBoardContent(
    workspaceKey,
    boardId,
    plaintext,
  );
  const row = await putBoard(workspaceId, boardId, {
    encryptedBlob,
    sortOrder,
    isPinned: false,
    pinSortOrder: null,
    links: [],
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveBoard(
  workspaceId: string,
  workspaceKey: Uint8Array,
  board: DecryptedBoard,
  content: {
    title: string;
    nodes: BoardGraphNode[];
    edges: BoardGraphEdge[];
    viewport?: BoardViewport;
  },
): Promise<DecryptedBoard> {
  const plaintext = toBoardPlaintext(content);
  const encryptedBlob = await encryptBoardContent(
    workspaceKey,
    board.id,
    plaintext,
  );
  const links = extractEntityLinksFromBoardNodes(content.nodes);
  const row = await putBoard(workspaceId, board.id, {
    encryptedBlob,
    sortOrder: board.sortOrder,
    isPinned: board.isPinned,
    pinSortOrder: board.pinSortOrder,
    deletedAt: board.deletedAt,
    links,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteBoard(
  workspaceId: string,
  boardId: string,
): Promise<void> {
  await deleteBoardApi(workspaceId, boardId);
}

export function sortBoardsForDisplay(
  boards: DecryptedBoard[],
  compare: (a: DecryptedBoard, b: DecryptedBoard) => number,
): DecryptedBoard[] {
  return [...boards].sort((a, b) => {
    const pin = comparePinned(a, b);
    if (pin !== 0) return pin;
    return compare(a, b);
  });
}

export async function setBoardPinned(
  workspaceId: string,
  workspaceKey: Uint8Array,
  board: DecryptedBoard,
  isPinned: boolean,
  siblings: DecryptedBoard[],
): Promise<DecryptedBoard> {
  const pinSortOrder = isPinned
    ? nextPinSortOrder(siblings.filter((b) => b.isPinned && b.id !== board.id))
    : null;
  const plaintext = toBoardPlaintext({
    title: board.title,
    nodes: board.nodes,
    edges: board.edges,
    viewport: board.viewport,
  });
  const encryptedBlob = await encryptBoardContent(
    workspaceKey,
    board.id,
    plaintext,
  );
  const row = await putBoard(workspaceId, board.id, {
    encryptedBlob,
    sortOrder: board.sortOrder,
    isPinned,
    pinSortOrder,
    deletedAt: board.deletedAt,
    links: board.links,
  });
  return toDecrypted(workspaceKey, row);
}

export async function reorderPinnedBoards(
  workspaceId: string,
  workspaceKey: Uint8Array,
  boards: DecryptedBoard[],
  boardId: string,
  direction: "up" | "down",
): Promise<DecryptedBoard[]> {
  const next = movePinnedItem(boards, boardId, direction);
  const results: DecryptedBoard[] = [];
  for (const board of next) {
    if (!board.isPinned) {
      results.push(board);
      continue;
    }
    const plaintext = toBoardPlaintext({
      title: board.title,
      nodes: board.nodes,
      edges: board.edges,
      viewport: board.viewport,
    });
    const encryptedBlob = await encryptBoardContent(
      workspaceKey,
      board.id,
      plaintext,
    );
    const row = await putBoard(workspaceId, board.id, {
      encryptedBlob,
      sortOrder: board.sortOrder,
      isPinned: board.isPinned,
      pinSortOrder: board.pinSortOrder,
      deletedAt: board.deletedAt,
      links: board.links,
    });
    results.push(await toDecrypted(workspaceKey, row));
  }
  return results;
}
