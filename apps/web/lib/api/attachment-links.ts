/**
 * Attachment parent links (P11): plaintext junction for list + cascade.
 * Synced from TipTap fileAttachment atoms on note/task/contact save.
 */
import type { AttachmentParentKind } from "@helvety-cloud/api-contract";
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getWorkspaceSubscription,
  isWorkspaceFreeOverflowLocked,
} from "@/lib/api/entitlements";
import {
  effectiveLimits,
  filesPerTaskLimitMessage,
  freeOverflowLockMessage,
  isUnlimited,
  resolvePlan,
} from "@/lib/billing/entitlements";

type Db = SupabaseClient<Database>;

/** Map to `limit_exceeded` in PUT note/task/contact handlers. */
export class AttachmentLinkLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentLinkLimitError";
  }
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** Replace all attachment links for a parent with the given attachment ids. */
export async function replaceAttachmentLinks(
  supabase: Db,
  workspaceId: string,
  parentKind: AttachmentParentKind,
  parentId: string,
  attachmentIds: string[],
): Promise<string[]> {
  const deduped = dedupeIds(attachmentIds);

  const { data: existingLinks, error: existingError } = await supabase
    .from("attachment_links")
    .select("attachment_id")
    .eq("workspace_id", workspaceId)
    .eq("parent_kind", parentKind)
    .eq("parent_id", parentId);
  if (existingError) throw new Error(existingError.message);
  const existingIds = new Set(
    (existingLinks ?? []).map((row) => row.attachment_id),
  );
  const addingNew = deduped.some((id) => !existingIds.has(id));
  if (
    addingNew &&
    (await isWorkspaceFreeOverflowLocked(supabase, workspaceId))
  ) {
    throw new AttachmentLinkLimitError(
      freeOverflowLockMessage(effectiveLimits(null).ownedWorkspaces),
    );
  }

  if (parentKind === "task") {
    const subscription = await getWorkspaceSubscription(supabase, workspaceId);
    const plan = resolvePlan(subscription);
    const limit = effectiveLimits(subscription).filesPerTask;
    if (!isUnlimited(limit) && deduped.length > limit) {
      throw new AttachmentLinkLimitError(filesPerTaskLimitMessage(plan, limit));
    }
  }

  if (deduped.length > 0) {
    const { data: rows, error } = await supabase
      .from("attachments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("id", deduped)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const found = new Set((rows ?? []).map((r) => r.id));
    for (const id of deduped) {
      if (!found.has(id)) {
        throw new Error(`attachment ${id} not in workspace`);
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("attachment_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("parent_kind", parentKind)
    .eq("parent_id", parentId);
  if (deleteError) throw new Error(deleteError.message);

  if (deduped.length > 0) {
    const { error: insertError } = await supabase
      .from("attachment_links")
      .insert(
        deduped.map((attachmentId) => ({
          workspace_id: workspaceId,
          parent_kind: parentKind,
          parent_id: parentId,
          attachment_id: attachmentId,
        })),
      );
    if (insertError) throw new Error(insertError.message);
  }

  return deduped;
}

/** Soft-delete attachments linked only to this parent (and remove Storage later via API). */
export async function softDeleteAttachmentsForParent(
  supabase: Db,
  workspaceId: string,
  parentKind: AttachmentParentKind,
  parentId: string,
): Promise<string[]> {
  const { data: links, error } = await supabase
    .from("attachment_links")
    .select("attachment_id")
    .eq("workspace_id", workspaceId)
    .eq("parent_kind", parentKind)
    .eq("parent_id", parentId);
  if (error) throw new Error(error.message);

  const attachmentIds = dedupeIds((links ?? []).map((l) => l.attachment_id));
  if (attachmentIds.length === 0) return [];

  const { error: unlinkError } = await supabase
    .from("attachment_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("parent_kind", parentKind)
    .eq("parent_id", parentId);
  if (unlinkError) throw new Error(unlinkError.message);

  const orphanIds: string[] = [];
  for (const attachmentId of attachmentIds) {
    const { count, error: countError } = await supabase
      .from("attachment_links")
      .select("id", { count: "exact", head: true })
      .eq("attachment_id", attachmentId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) === 0) {
      orphanIds.push(attachmentId);
    }
  }

  if (orphanIds.length > 0) {
    const { error: softError } = await supabase
      .from("attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .in("id", orphanIds)
      .is("deleted_at", null);
    if (softError) throw new Error(softError.message);
  }

  return orphanIds;
}
