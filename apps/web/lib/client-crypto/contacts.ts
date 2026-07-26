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
    deletedAt: row.deletedAt,
    projectIds,
  });
}

export async function deleteContact(
  workspaceId: string,
  contact: DecryptedContact,
): Promise<void> {
  await deleteContactApi(workspaceId, contact.id);
}
