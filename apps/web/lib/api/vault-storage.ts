/**
 * Supabase Storage helpers for vault-attachments (P11).
 * Service role mints signed URLs and removes opaque objects after /api/v1
 * membership + entitlement checks. Never used to decrypt.
 */
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const VAULT_ATTACHMENTS_BUCKET = "vault-attachments";

const DOWNLOAD_URL_TTL_SECONDS = 60 * 10;

export function attachmentStoragePath(
  workspaceId: string,
  attachmentId: string,
): string {
  return `${workspaceId}/${attachmentId}`;
}

export async function createAttachmentUploadUrl(
  storagePath: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage
    .from(VAULT_ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create upload URL");
  }
  return data.signedUrl;
}

export async function createAttachmentDownloadUrl(
  storagePath: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage
    .from(VAULT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, DOWNLOAD_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create download URL");
  }
  return data.signedUrl;
}

/** Returns object size, -1 if present without size metadata, null if missing. */
export async function getAttachmentObjectSize(
  storagePath: string,
): Promise<number | null> {
  const admin = createServiceRoleClient();
  const slash = storagePath.lastIndexOf("/");
  const folder = slash >= 0 ? storagePath.slice(0, slash) : "";
  const name = slash >= 0 ? storagePath.slice(slash + 1) : storagePath;
  const { data, error } = await admin.storage
    .from(VAULT_ATTACHMENTS_BUCKET)
    .list(folder, { search: name, limit: 20 });
  if (error) {
    throw new Error(error.message);
  }
  const match = (data ?? []).find((obj) => obj.name === name);
  if (!match) return null;
  const raw = match.metadata?.size ?? match.metadata?.contentLength;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : -1;
  }
  return -1;
}

export async function removeAttachmentObject(
  storagePath: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.storage
    .from(VAULT_ATTACHMENTS_BUCKET)
    .remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}
