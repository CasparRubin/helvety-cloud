import {
  ATTACHMENT_SELECT,
  toAttachmentResponse,
} from "@/lib/api/attachment-response";
import { apiError, jsonOk } from "@/lib/api/errors";
import { removeAttachmentObject } from "@/lib/api/attachment-storage";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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
  return jsonOk(toAttachmentResponse(data));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser(_request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, attachmentId } = await context.params;

  const { data, error } = await supabase
    .from("attachments")
    .select("id, storage_path")
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

  const { error: unlinkError } = await supabase
    .from("attachment_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("attachment_id", attachmentId);
  if (unlinkError) {
    return apiError("internal", unlinkError.message, 500);
  }

  const { error: softError } = await supabase
    .from("attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", attachmentId)
    .eq("workspace_id", workspaceId);
  if (softError) {
    return apiError("internal", softError.message, 500);
  }

  try {
    await removeAttachmentObject(data.storage_path);
  } catch {
    // Soft-deleted row is enough; Storage orphan can be swept later.
  }

  return new Response(null, { status: 204 });
}
