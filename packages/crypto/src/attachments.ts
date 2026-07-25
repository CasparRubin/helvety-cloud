/**
 * Attachment crypto helpers (P11).
 * File bytes use a per-file DEK; DEK + metadata are wrapped/encrypted under workspace_key.
 */
import { encodeUtf8, randomKeyBytes } from "./bytes";
import {
  decryptBinary,
  encryptBinary,
  packBinaryCiphertext,
  unpackBinaryCiphertext,
} from "./binary";
import { decrypt, encrypt } from "./content";
import type {
  CiphertextEnvelope,
  ContentAad,
  WrappedKeyEnvelope,
} from "./envelope";
import { unwrapKey, wrapKey } from "./wrap";

export type AttachmentMetaPlaintext = {
  filename: string;
  mimeType: string;
};

export type EncryptedAttachmentPayload = {
  packedCiphertext: Uint8Array;
  encryptedMeta: CiphertextEnvelope;
  wrappedDek: WrappedKeyEnvelope;
  byteSize: number;
};

function metaAad(attachmentId: string): ContentAad {
  return { table: "attachments", recordId: attachmentId, field: "encrypted_meta" };
}

function dekAad(attachmentId: string): ContentAad {
  return { table: "attachments", recordId: attachmentId, field: "wrapped_dek" };
}

function fileAad(attachmentId: string): ContentAad {
  return { table: "attachments", recordId: attachmentId, field: "ciphertext" };
}

export async function encryptAttachment(params: {
  workspaceKey: Uint8Array;
  attachmentId: string;
  plaintext: Uint8Array;
  meta: AttachmentMetaPlaintext;
}): Promise<EncryptedAttachmentPayload> {
  const dek = randomKeyBytes();
  const binary = await encryptBinary({
    key: dek,
    plaintext: params.plaintext,
    aad: fileAad(params.attachmentId),
  });
  const packedCiphertext = packBinaryCiphertext(binary);
  const wrappedDek = await wrapKey(
    params.workspaceKey,
    dek,
    dekAad(params.attachmentId),
  );
  const encryptedMeta = await encrypt({
    key: params.workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(params.meta)),
    aad: metaAad(params.attachmentId),
  });
  return {
    packedCiphertext,
    encryptedMeta,
    wrappedDek,
    byteSize: packedCiphertext.byteLength,
  };
}

export async function decryptAttachmentMeta(params: {
  workspaceKey: Uint8Array;
  attachmentId: string;
  encryptedMeta: CiphertextEnvelope;
}): Promise<AttachmentMetaPlaintext> {
  const bytes = await decrypt({
    key: params.workspaceKey,
    envelope: params.encryptedMeta,
    aad: metaAad(params.attachmentId),
  });
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as AttachmentMetaPlaintext).filename !== "string" ||
    typeof (parsed as AttachmentMetaPlaintext).mimeType !== "string"
  ) {
    throw new Error("Invalid attachment metadata plaintext");
  }
  return parsed as AttachmentMetaPlaintext;
}

export async function decryptAttachmentBytes(params: {
  workspaceKey: Uint8Array;
  attachmentId: string;
  wrappedDek: WrappedKeyEnvelope;
  packedCiphertext: Uint8Array;
}): Promise<Uint8Array> {
  const dek = await unwrapKey(
    params.workspaceKey,
    params.wrappedDek,
    dekAad(params.attachmentId),
  );
  const binary = unpackBinaryCiphertext(params.packedCiphertext);
  return decryptBinary({
    key: dek,
    ciphertext: binary,
    aad: fileAad(params.attachmentId),
  });
}
