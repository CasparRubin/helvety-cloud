import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { NoteResponse } from "@helvety-cloud/api-contract";

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
  type IssueBodyDoc,
  type NotePlaintext,
} from "@/lib/vault/note-plaintext";

export type { IssueBodyDoc, NotePlaintext };
export { EMPTY_NOTE_BODY, parseNotePlaintext, toNotePlaintext };

const textDecoder = new TextDecoder();

export type DecryptedNote = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  issueId: string | null;
  title: string;
  body: IssueBodyDoc;
  tags: string[];
  sortOrder: number;
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
  const plaintext = toNotePlaintext(content.title, content.body, content.tags);
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
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
  let body: IssueBodyDoc = EMPTY_NOTE_BODY;
  let tags: string[] = [];
  try {
    const content = await decryptNoteContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    title = content.title;
    body = content.body;
    tags = content.tags;
  } catch {
    title = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    issueId: row.issueId,
    title,
    body,
    tags,
    sortOrder: row.sortOrder,
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
    body?: IssueBodyDoc;
    tags?: string[];
    projectId?: string | null;
    issueId?: string | null;
  },
  sortOrder = 0,
): Promise<DecryptedNote> {
  const noteId = crypto.randomUUID();
  const encryptedBlob = await encryptNoteContent(
    workspaceKey,
    noteId,
    toNotePlaintext(
      content.title,
      content.body ?? EMPTY_NOTE_BODY,
      content.tags ?? [],
    ),
  );
  const row = await putNote(workspaceId, noteId, {
    encryptedBlob,
    sortOrder,
    projectId: content.projectId ?? null,
    issueId: content.issueId ?? null,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveNote(
  workspaceId: string,
  workspaceKey: Uint8Array,
  note: DecryptedNote,
  content: NotePlaintext,
  links?: { projectId?: string | null; issueId?: string | null },
): Promise<DecryptedNote> {
  const encryptedBlob = await encryptNoteContent(
    workspaceKey,
    note.id,
    content,
  );
  const row = await putNote(workspaceId, note.id, {
    encryptedBlob,
    sortOrder: note.sortOrder,
    deletedAt: note.deletedAt,
    projectId: links?.projectId !== undefined ? links.projectId : note.projectId,
    issueId: links?.issueId !== undefined ? links.issueId : note.issueId,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteNote(
  workspaceId: string,
  note: DecryptedNote,
): Promise<void> {
  await deleteNoteApi(workspaceId, note.id);
}
