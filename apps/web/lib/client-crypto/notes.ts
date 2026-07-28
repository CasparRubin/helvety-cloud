import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type {
  EntityLinkTarget,
  NoteResponse,
} from "@helvety-cloud/api-contract";

import {
  deleteNote as deleteNoteApi,
  getNote,
  listNotes,
  putNote,
  type ListNotesParams,
} from "@/lib/api/v1-client";
import {
  EMPTY_NOTE_BODY,
  parseNotePlaintext,
  toNotePlaintext,
  type TaskBodyDoc,
  type NotePlaintext,
} from "@/lib/client-crypto/note-plaintext";
import { extractEntityRefsFromDoc, extractFileAttachmentIdsFromDoc } from "@/lib/client-crypto/entity-refs";
import {
  comparePinned,
  movePinnedItem,
  nextPinSortOrder,
} from "@/lib/client-crypto/pins";

const textDecoder = new TextDecoder();

export type DecryptedNote = {
  id: string;
  workspaceId: string;
  links: EntityLinkTarget[];
  title: string;
  body: TaskBodyDoc;
  sortOrder: number;
  isPinned: boolean;
  pinSortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function noteAad(noteId: string) {
  return {
    table: "notes" as const,
    recordId: noteId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptNoteContent(
  workspaceKey: Uint8Array,
  noteId: string,
  content: NotePlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: noteAad(noteId),
    keyVersion,
  });
}

export async function decryptNoteContent(
  workspaceKey: Uint8Array,
  noteId: string,
  envelope: CiphertextEnvelope,
): Promise<NotePlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: noteAad(noteId),
  });
  return parseNotePlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: NoteResponse,
): Promise<DecryptedNote> {
  let title = "Untitled";
  let body: TaskBodyDoc = EMPTY_NOTE_BODY;
  try {
    const content = await decryptNoteContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    title = content.title;
    body = content.body;
  } catch {
    title = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    links: row.links,
    title,
    body,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedNotes(
  workspaceId: string,
  workspaceKey: Uint8Array,
  params?: ListNotesParams,
): Promise<{ notes: DecryptedNote[]; nextCursor: string | null }> {
  const page = await listNotes(workspaceId, params);
  const notes = await Promise.all(
    page.notes.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { notes, nextCursor: page.nextCursor };
}

export async function loadDecryptedNote(
  workspaceId: string,
  noteId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedNote> {
  const row = await getNote(workspaceId, noteId);
  return toDecrypted(workspaceKey, row);
}

export async function createNote(
  workspaceId: string,
  workspaceKey: Uint8Array,
  content: {
    title: string;
    body?: TaskBodyDoc;
    links?: EntityLinkTarget[];
  },
  sortOrder = 0,
): Promise<DecryptedNote> {
  const noteId = crypto.randomUUID();
  const plaintext = toNotePlaintext(
    content.title,
    content.body ?? EMPTY_NOTE_BODY,
  );
  const encryptedBlob = await encryptNoteContent(
    workspaceKey,
    noteId,
    plaintext,
  );
  const links =
    content.links ??
    extractEntityRefsFromDoc("note", plaintext.body);
  const row = await putNote(workspaceId, noteId, {
    encryptedBlob,
    sortOrder,
    isPinned: false,
    pinSortOrder: null,
    links,
    attachmentIds: extractFileAttachmentIdsFromDoc(plaintext.body),
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveNote(
  workspaceId: string,
  workspaceKey: Uint8Array,
  note: DecryptedNote,
  content: NotePlaintext,
  options?: {
    /** When omitted, links are extracted from the TipTap body. */
    links?: EntityLinkTarget[];
  },
): Promise<DecryptedNote> {
  const encryptedBlob = await encryptNoteContent(
    workspaceKey,
    note.id,
    content,
  );
  const links =
    options?.links !== undefined
      ? options.links
      : extractEntityRefsFromDoc("note", content.body);
  const row = await putNote(workspaceId, note.id, {
    encryptedBlob,
    sortOrder: note.sortOrder,
    isPinned: note.isPinned,
    pinSortOrder: note.pinSortOrder,
    deletedAt: note.deletedAt,
    links,
    attachmentIds: extractFileAttachmentIdsFromDoc(content.body),
  });
  return toDecrypted(workspaceKey, row);
}

/** Replace project affiliations without re-encrypting (reuses stored ciphertext). */
export async function setNoteProjectIds(
  workspaceId: string,
  noteId: string,
  projectIds: string[],
): Promise<NoteResponse> {
  const row = await getNote(workspaceId, noteId);
  return putNote(workspaceId, noteId, {
    encryptedBlob: row.encryptedBlob,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    deletedAt: row.deletedAt,
    projectIds,
  });
}

export function sortNotesForDisplay(
  notes: DecryptedNote[],
  compareUnpinned: (a: DecryptedNote, b: DecryptedNote) => number,
): DecryptedNote[] {
  return notes.slice().sort((a, b) => {
    const byPinned = comparePinned(a, b);
    if (byPinned !== 0) return byPinned;
    if (a.isPinned && b.isPinned) return 0;
    return compareUnpinned(a, b);
  });
}

export async function setNotePinned(
  workspaceId: string,
  workspaceKey: Uint8Array,
  notes: DecryptedNote[],
  note: DecryptedNote,
  pinned: boolean,
): Promise<DecryptedNote> {
  const existing = await getNote(workspaceId, note.id);
  const row = await putNote(workspaceId, note.id, {
    encryptedBlob: existing.encryptedBlob,
    sortOrder: existing.sortOrder,
    isPinned: pinned,
    pinSortOrder: pinned ? nextPinSortOrder(notes) : null,
    deletedAt: existing.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function reorderPinnedNotes(
  workspaceId: string,
  workspaceKey: Uint8Array,
  notes: DecryptedNote[],
  noteId: string,
  direction: "up" | "down",
): Promise<DecryptedNote[]> {
  const next = movePinnedItem(notes, noteId, direction);
  if (next === notes) return notes;
  const previousById = new Map(notes.map((note) => [note.id, note]));
  const changed = next.filter((note) => {
    const previous = previousById.get(note.id);
    return (
      previous?.pinSortOrder !== note.pinSortOrder ||
      previous.isPinned !== note.isPinned
    );
  });

  const rows = await Promise.all(
    changed.map(async (note) => {
      const existing = await getNote(workspaceId, note.id);
      return putNote(workspaceId, note.id, {
        encryptedBlob: existing.encryptedBlob,
        sortOrder: existing.sortOrder,
        isPinned: note.isPinned,
        pinSortOrder: note.pinSortOrder,
        deletedAt: existing.deletedAt,
      });
    }),
  );

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return Promise.all(
    next.map(async (note) => {
      const row = rowsById.get(note.id);
      return row ? toDecrypted(workspaceKey, row) : note;
    }),
  );
}

export async function deleteNote(
  workspaceId: string,
  note: DecryptedNote,
): Promise<void> {
  await deleteNoteApi(workspaceId, note.id);
}
