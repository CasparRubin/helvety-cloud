/**
 * Client helpers for E2EE attachments (P11).
 */
import {
  decryptAttachmentBytes,
  decryptAttachmentMeta,
  encryptAttachment,
  type AttachmentMetaPlaintext,
} from "@helvety-cloud/crypto";

import {
  completeAttachment,
  createAttachment,
  deleteAttachment,
  downloadAttachment,
  getAttachment,
} from "@/lib/api/v1-client";

export type UploadedAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
};

export function isInlineImageMime(mimeType: string): boolean {
  return (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  );
}

export async function uploadEncryptedAttachment(params: {
  workspaceId: string;
  workspaceKey: Uint8Array;
  file: File;
}): Promise<UploadedAttachment> {
  const attachmentId = crypto.randomUUID();
  const plaintext = new Uint8Array(await params.file.arrayBuffer());
  const meta: AttachmentMetaPlaintext = {
    filename: params.file.name || "file",
    mimeType: params.file.type || "application/octet-stream",
  };
  const encrypted = await encryptAttachment({
    workspaceKey: params.workspaceKey,
    attachmentId,
    plaintext,
    meta,
  });

  const created = await createAttachment(params.workspaceId, {
    id: attachmentId,
    byteSize: encrypted.byteSize,
    encryptedMeta: encrypted.encryptedMeta,
    wrappedDek: encrypted.wrappedDek,
  });

  const uploadResponse = await fetch(created.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: new Blob([encrypted.packedCiphertext as BlobPart], {
      type: "application/octet-stream",
    }),
  });
  if (!uploadResponse.ok) {
    try {
      await deleteAttachment(params.workspaceId, attachmentId);
    } catch {
      // Best-effort cleanup of pending row.
    }
    throw new Error(`Upload failed (${uploadResponse.status})`);
  }

  await completeAttachment(params.workspaceId, attachmentId);

  return {
    id: attachmentId,
    filename: meta.filename,
    mimeType: meta.mimeType,
    byteSize: encrypted.byteSize,
  };
}

export async function loadAttachmentMeta(params: {
  workspaceId: string;
  workspaceKey: Uint8Array;
  attachmentId: string;
}): Promise<AttachmentMetaPlaintext> {
  const row = await getAttachment(params.workspaceId, params.attachmentId);
  return decryptAttachmentMeta({
    workspaceKey: params.workspaceKey,
    attachmentId: params.attachmentId,
    encryptedMeta: row.encryptedMeta,
  });
}

export async function downloadAndDecryptAttachment(params: {
  workspaceId: string;
  workspaceKey: Uint8Array;
  attachmentId: string;
}): Promise<{ meta: AttachmentMetaPlaintext; bytes: Uint8Array }> {
  const handoff = await downloadAttachment(
    params.workspaceId,
    params.attachmentId,
  );
  const response = await fetch(handoff.downloadUrl);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const packed = new Uint8Array(await response.arrayBuffer());
  const meta = await decryptAttachmentMeta({
    workspaceKey: params.workspaceKey,
    attachmentId: params.attachmentId,
    encryptedMeta: handoff.encryptedMeta,
  });
  const bytes = await decryptAttachmentBytes({
    workspaceKey: params.workspaceKey,
    attachmentId: params.attachmentId,
    wrappedDek: handoff.wrappedDek,
    packedCiphertext: packed,
  });
  return { meta, bytes };
}
