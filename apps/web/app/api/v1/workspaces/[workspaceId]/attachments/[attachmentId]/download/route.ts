import {
  ciphertextEnvelopeSchema,
  downloadAttachmentResponseSchema,
  wrappedKeyEnvelopeSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { createAttachmentDownloadUrl } from "@/lib/api/vault-storage";
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
    .select(
      "id, byte_size, storage_path, status, encrypted_meta, wrapped_dek, deleted_at",
    )
    .eq("id", attachmentId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data || data.status !== "ready") {
    return apiError("not_found", "Attachment not found", 404);
  }

  let downloadUrl: string;
  try {
    downloadUrl = await createAttachmentDownloadUrl(data.storage_path);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to mint download URL",
      500,
    );
  }

  return jsonOk(
    downloadAttachmentResponseSchema.parse({
      id: data.id,
      downloadUrl,
      byteSize: data.byte_size,
      encryptedMeta: ciphertextEnvelopeSchema.parse(data.encrypted_meta),
      wrappedDek: wrappedKeyEnvelopeSchema.parse(data.wrapped_dek),
    }),
  );
}
