import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type {
  ContactResponse,
  EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import {
  deleteContact as deleteContactApi,
  getContact,
  listContacts,
  putContact,
  type ListParams,
} from "@/lib/api/v1-client";
import {
  parseContactPlaintext,
  toContactPlaintext,
  type ContactPlaintext,
} from "@/lib/client-crypto/contact-plaintext";
import { extractEntityRefsFromDoc, extractFileAttachmentIdsFromDoc } from "@/lib/client-crypto/entity-refs";
import {
  EMPTY_TASK_BODY,
  type TaskBodyDoc,
} from "@/lib/client-crypto/task-plaintext";
import {
  comparePinned,
  movePinnedItem,
  nextPinSortOrder,
} from "@/lib/client-crypto/pins";

const textDecoder = new TextDecoder();

export type DecryptedContact = {
  id: string;
  workspaceId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  emails: string[];
  phones: string[];
  notes: TaskBodyDoc;
  links: EntityLinkTarget[];
  sortOrder: number;
  isPinned: boolean;
  pinSortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

function contactAad(contactId: string) {
  return {
    table: "contacts" as const,
    recordId: contactId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptContactContent(
  workspaceKey: Uint8Array,
  contactId: string,
  content: ContactPlaintext,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(content)),
    aad: contactAad(contactId),
    keyVersion,
  });
}

export async function decryptContactContent(
  workspaceKey: Uint8Array,
  contactId: string,
  envelope: CiphertextEnvelope,
): Promise<ContactPlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: contactAad(contactId),
  });
  return parseContactPlaintext(JSON.parse(textDecoder.decode(bytes)));
}

async function toDecrypted(
  workspaceKey: Uint8Array,
  row: ContactResponse,
): Promise<DecryptedContact> {
  let firstName = "";
  let lastName = "";
  let jobTitle = "";
  let emails: string[] = [];
  let phones: string[] = [];
  let notes: TaskBodyDoc = EMPTY_TASK_BODY;
  try {
    const content = await decryptContactContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    firstName = content.firstName;
    lastName = content.lastName;
    jobTitle = content.jobTitle;
    emails = content.emails;
    phones = content.phones;
    notes = content.notes;
  } catch {
    firstName = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    firstName,
    lastName,
    jobTitle,
    emails,
    phones,
    notes,
    links: row.links,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export async function loadDecryptedContacts(
  workspaceId: string,
  workspaceKey: Uint8Array,
  params?: ListParams,
): Promise<{ contacts: DecryptedContact[]; nextCursor: string | null }> {
  const page = await listContacts(workspaceId, params);
  const contacts = await Promise.all(
    page.contacts.map((row) => toDecrypted(workspaceKey, row)),
  );
  return { contacts, nextCursor: page.nextCursor };
}

export async function loadDecryptedContact(
  workspaceId: string,
  contactId: string,
  workspaceKey: Uint8Array,
): Promise<DecryptedContact> {
  const row = await getContact(workspaceId, contactId);
  return toDecrypted(workspaceKey, row);
}

export async function createContact(
  workspaceId: string,
  workspaceKey: Uint8Array,
  content: {
    firstName: string;
    lastName?: string;
    jobTitle?: string;
    emails?: string[];
    phones?: string[];
    notes?: TaskBodyDoc;
    links?: EntityLinkTarget[];
  },
  sortOrder = 0,
): Promise<DecryptedContact> {
  const contactId = crypto.randomUUID();
  const plaintext = toContactPlaintext(content);
  const encryptedBlob = await encryptContactContent(
    workspaceKey,
    contactId,
    plaintext,
  );
  const links =
    content.links ?? extractEntityRefsFromDoc("contact", plaintext.notes);
  const row = await putContact(workspaceId, contactId, {
    encryptedBlob,
    sortOrder,
    isPinned: false,
    pinSortOrder: null,
    links,
    attachmentIds: extractFileAttachmentIdsFromDoc(plaintext.notes),
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveContact(
  workspaceId: string,
  workspaceKey: Uint8Array,
  contact: DecryptedContact,
  content: ContactPlaintext,
  options?: {
    /** When omitted, links are extracted from the TipTap notes body. */
    links?: EntityLinkTarget[];
  },
): Promise<DecryptedContact> {
  const encryptedBlob = await encryptContactContent(
    workspaceKey,
    contact.id,
    content,
  );
  const links =
    options?.links !== undefined
      ? options.links
      : extractEntityRefsFromDoc("contact", content.notes);
  const row = await putContact(workspaceId, contact.id, {
    encryptedBlob,
    sortOrder: contact.sortOrder,
    isPinned: contact.isPinned,
    pinSortOrder: contact.pinSortOrder,
    deletedAt: contact.deletedAt,
    links,
    attachmentIds: extractFileAttachmentIdsFromDoc(content.notes),
  });
  return toDecrypted(workspaceKey, row);
}

/** Replace project affiliations without re-encrypting (reuses stored ciphertext). */
export async function setContactProjectIds(
  workspaceId: string,
  contactId: string,
  projectIds: string[],
): Promise<ContactResponse> {
  const row = await getContact(workspaceId, contactId);
  return putContact(workspaceId, contactId, {
    encryptedBlob: row.encryptedBlob,
    sortOrder: row.sortOrder,
    isPinned: row.isPinned,
    pinSortOrder: row.pinSortOrder,
    deletedAt: row.deletedAt,
    projectIds,
  });
}

export function sortContactsForDisplay(
  contacts: DecryptedContact[],
  compareUnpinned: (a: DecryptedContact, b: DecryptedContact) => number,
): DecryptedContact[] {
  return contacts.slice().sort((a, b) => {
    const byPinned = comparePinned(a, b);
    if (byPinned !== 0) return byPinned;
    if (a.isPinned && b.isPinned) return 0;
    return compareUnpinned(a, b);
  });
}

export async function setContactPinned(
  workspaceId: string,
  workspaceKey: Uint8Array,
  contacts: DecryptedContact[],
  contact: DecryptedContact,
  pinned: boolean,
): Promise<DecryptedContact> {
  const existing = await getContact(workspaceId, contact.id);
  const row = await putContact(workspaceId, contact.id, {
    encryptedBlob: existing.encryptedBlob,
    sortOrder: existing.sortOrder,
    isPinned: pinned,
    pinSortOrder: pinned ? nextPinSortOrder(contacts) : null,
    deletedAt: existing.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function reorderPinnedContacts(
  workspaceId: string,
  workspaceKey: Uint8Array,
  contacts: DecryptedContact[],
  contactId: string,
  direction: "up" | "down",
): Promise<DecryptedContact[]> {
  const next = movePinnedItem(contacts, contactId, direction);
  if (next === contacts) return contacts;
  const previousById = new Map(contacts.map((contact) => [contact.id, contact]));
  const changed = next.filter((contact) => {
    const previous = previousById.get(contact.id);
    return (
      previous?.pinSortOrder !== contact.pinSortOrder ||
      previous.isPinned !== contact.isPinned
    );
  });

  const rows = await Promise.all(
    changed.map(async (contact) => {
      const existing = await getContact(workspaceId, contact.id);
      return putContact(workspaceId, contact.id, {
        encryptedBlob: existing.encryptedBlob,
        sortOrder: existing.sortOrder,
        isPinned: contact.isPinned,
        pinSortOrder: contact.pinSortOrder,
        deletedAt: existing.deletedAt,
      });
    }),
  );

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return Promise.all(
    next.map(async (contact) => {
      const row = rowsById.get(contact.id);
      return row ? toDecrypted(workspaceKey, row) : contact;
    }),
  );
}

export async function deleteContact(
  workspaceId: string,
  contact: DecryptedContact,
): Promise<void> {
  await deleteContactApi(workspaceId, contact.id);
}
