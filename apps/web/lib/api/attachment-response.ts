import {
  attachmentResponseSchema,
  ciphertextEnvelopeSchema,
  wrappedKeyEnvelopeSchema,
} from "@helvety-cloud/api-contract";

export const ATTACHMENT_SELECT =
  "id, workspace_id, encrypted_meta, wrapped_dek, byte_size, storage_path, status, created_at, updated_at, deleted_at";

export type AttachmentRow = {
  id: string;
  workspace_id: string;
  encrypted_meta: unknown;
  wrapped_dek: unknown;
  byte_size: number;
  storage_path: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function toAttachmentResponse(row: AttachmentRow) {
  return attachmentResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    byteSize: row.byte_size,
    storagePath: row.storage_path,
    status: row.status,
    encryptedMeta: ciphertextEnvelopeSchema.parse(row.encrypted_meta),
    wrappedDek: wrappedKeyEnvelopeSchema.parse(row.wrapped_dek),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}
