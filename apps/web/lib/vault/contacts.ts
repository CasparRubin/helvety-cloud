import {
  decrypt,
  encrypt,
  encodeUtf8,
  type CiphertextEnvelope,
} from "@helvety-cloud/crypto";
import type { ContactResponse } from "@helvety-cloud/api-contract";

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
} from "@/lib/vault/contact-plaintext";

const textDecoder = new TextDecoder();

export type DecryptedContact = {
  id: string;
  workspaceId: string;
  displayName: string;
  emails: string[];
  phones: string[];
  notes: string;
  sortOrder: number;
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
  const plaintext = toContactPlaintext(content);
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
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
  let displayName = "Untitled";
  let emails: string[] = [];
  let phones: string[] = [];
  let notes = "";
  try {
    const content = await decryptContactContent(
      workspaceKey,
      row.id,
      row.encryptedBlob,
    );
    displayName = content.displayName;
    emails = content.emails;
    phones = content.phones;
    notes = content.notes;
  } catch {
    displayName = "Unable to decrypt";
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    displayName,
    emails,
    phones,
    notes,
    sortOrder: row.sortOrder,
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
    displayName: string;
    emails?: string[];
    phones?: string[];
    notes?: string;
  },
  sortOrder = 0,
): Promise<DecryptedContact> {
  const contactId = crypto.randomUUID();
  const encryptedBlob = await encryptContactContent(
    workspaceKey,
    contactId,
    toContactPlaintext(content),
  );
  const row = await putContact(workspaceId, contactId, {
    encryptedBlob,
    sortOrder,
  });
  return toDecrypted(workspaceKey, row);
}

export async function saveContact(
  workspaceId: string,
  workspaceKey: Uint8Array,
  contact: DecryptedContact,
  content: ContactPlaintext,
): Promise<DecryptedContact> {
  const encryptedBlob = await encryptContactContent(
    workspaceKey,
    contact.id,
    content,
  );
  const row = await putContact(workspaceId, contact.id, {
    encryptedBlob,
    sortOrder: contact.sortOrder,
    deletedAt: contact.deletedAt,
  });
  return toDecrypted(workspaceKey, row);
}

export async function deleteContact(
  workspaceId: string,
  contact: DecryptedContact,
): Promise<void> {
  await deleteContactApi(workspaceId, contact.id);
}
