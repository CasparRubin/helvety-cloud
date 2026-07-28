import { completeAttachmentResponseSchema } from "@helvety-cloud/api-contract";

import {
  ATTACHMENT_SELECT,
  toAttachmentResponse,
} from "@/lib/api/attachment-response";
import { apiError, jsonOk } from "@/lib/api/errors";
import { getAttachmentObjectSize } from "@/lib/api/attachment-storage";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; attachmentId: string }>;
};

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
    await supabase
      .from("attachments")
      .update({ status: "failed" })
      .eq("id", attachmentId);
    return apiError(
      "invalid_body",
      "Uploaded object not found in storage",
      400,
    );
  }
  // -1 = object present but Storage did not report size metadata.
  if (objectSize >= 0 && objectSize !== data.byte_size) {
    await supabase
      .from("attachments")
      .update({ status: "failed", byte_size: objectSize })
      .eq("id", attachmentId);
    return apiError(
      "invalid_body",
      "Uploaded size does not match declared byteSize",
      400,
    );
  }

  const reconciledSize = objectSize >= 0 ? objectSize : data.byte_size;

  const { data: updated, error: updateError } = await supabase
    .from("attachments")
    .update({ status: "ready", byte_size: reconciledSize })
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
