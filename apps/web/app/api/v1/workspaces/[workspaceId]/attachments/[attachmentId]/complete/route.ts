import { completeAttachmentResponseSchema } from "@helvety-cloud/api-contract";
import type { Database } from "@helvety-cloud/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ATTACHMENT_SELECT,
  toAttachmentResponse,
} from "@/lib/api/attachment-response";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  getAttachmentObjectSize,
  removeAttachmentObject,
} from "@/lib/api/attachment-storage";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; attachmentId: string }>;
};

async function markFailed(
  supabase: SupabaseClient<Database>,
  attachmentId: string,
  byteSize?: number,
): Promise<void> {
  const patch: { status: "failed"; byte_size?: number } = { status: "failed" };
  if (byteSize !== undefined) {
    patch.byte_size = byteSize;
  }
  await supabase.from("attachments").update(patch).eq("id", attachmentId);
}

/** Best-effort Storage cleanup, then mark the row failed. */
async function failAndRemoveObject(
  supabase: SupabaseClient<Database>,
  attachmentId: string,
  storagePath: string,
  byteSize?: number,
): Promise<void> {
  try {
    await removeAttachmentObject(storagePath);
  } catch (error) {
    console.error("Failed to remove attachment object after complete failure", {
      attachmentId,
      storagePath,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
  await markFailed(supabase, attachmentId, byteSize);
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUser(_request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, attachmentId } = await context.params;

  const { data, error } = await supabase
    .from("attachments")
    .select(ATTACHMENT_SELECT)
    .eq("id", attachmentId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Attachment not found", 404);
  }
  if (data.status === "ready") {
    return jsonOk(
      completeAttachmentResponseSchema.parse(toAttachmentResponse(data)),
    );
  }

  let objectSize: number | null;
  try {
    objectSize = await getAttachmentObjectSize(data.storage_path);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to verify upload",
      500,
    );
  }
  if (objectSize === null) {
    await markFailed(supabase, attachmentId);
    return apiError(
      "invalid_body",
      "Uploaded object not found in storage",
      400,
    );
  }
  // Reject unknown size: do not trust declared byte_size (quota undercount).
  if (objectSize < 0) {
    await failAndRemoveObject(supabase, attachmentId, data.storage_path);
    return apiError(
      "invalid_body",
      "Uploaded object size could not be verified",
      400,
    );
  }
  if (objectSize !== data.byte_size) {
    await failAndRemoveObject(
      supabase,
      attachmentId,
      data.storage_path,
      objectSize,
    );
    return apiError(
      "invalid_body",
      "Uploaded size does not match declared byteSize",
      400,
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("attachments")
    .update({ status: "ready", byte_size: objectSize })
    .eq("id", attachmentId)
    .eq("workspace_id", workspaceId)
    .select(ATTACHMENT_SELECT)
    .single();
  if (updateError || !updated) {
    return apiError("internal", updateError?.message ?? "Update failed", 500);
  }

  return jsonOk(
    completeAttachmentResponseSchema.parse(toAttachmentResponse(updated)),
  );
}
