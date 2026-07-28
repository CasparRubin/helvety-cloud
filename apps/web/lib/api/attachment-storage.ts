/**
 * Supabase Storage helpers for encrypted-attachments (P11).
 * Service role mints signed URLs and removes opaque objects after /api/v1
 * membership + entitlement checks. Never used to decrypt.
 */
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const ATTACHMENTS_BUCKET = "encrypted-attachments";

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
    .from(ATTACHMENTS_BUCKET)
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
    .from(ATTACHMENTS_BUCKET)
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
    .from(ATTACHMENTS_BUCKET)
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
    .from(ATTACHMENTS_BUCKET)
    .remove([storagePath]);
  if (error) {
    throw new Error(error.message);
  }
}

const LIST_PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 100;

/** List object paths under `{workspaceId}/` in the attachments bucket. */
async function listWorkspaceAttachmentPaths(
  workspaceId: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .list(workspaceId, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) {
      throw new Error(error.message);
    }
    const page = data ?? [];
    for (const obj of page) {
      if (!obj.name || obj.name.endsWith("/")) continue;
      if (obj.id === null && !obj.metadata) continue;
      paths.push(`${workspaceId}/${obj.name}`);
    }
    if (page.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return paths;
}

async function removeAttachmentObjects(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const admin = createServiceRoleClient();
  for (let i = 0; i < storagePaths.length; i += REMOVE_BATCH_SIZE) {
    const batch = storagePaths.slice(i, i + REMOVE_BATCH_SIZE);
    const { error } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .remove(batch);
    if (error) {
      throw new Error(error.message);
    }
  }
}

/**
 * Best-effort wipe of all Storage objects for a workspace.
 * Retries once; logs and continues on failure (DB wipe still proceeds).
 */
export async function wipeWorkspaceAttachmentStorage(
  workspaceId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const paths = await listWorkspaceAttachmentPaths(workspaceId);
      await removeAttachmentObjects(paths);
      return;
    } catch (error) {
      console.error("Workspace attachment Storage wipe failed", {
        workspaceId,
        attempt,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
