import {
  attachmentParentKindSchema,
  createAttachmentRequestSchema,
  createAttachmentResponseSchema,
  listAttachmentsResponseSchema,
} from "@helvety-cloud/api-contract";

import {
  ATTACHMENT_SELECT,
  toAttachmentResponse,
} from "@/lib/api/attachment-response";
import { assertWorkspaceStorageAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  attachmentStoragePath,
  createAttachmentUploadUrl,
} from "@/lib/api/attachment-storage";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  const { data: isMember, error: memberError } = await supabase.rpc(
    "is_workspace_member",
    { ws_id: workspaceId },
  );
  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }
  if (!isMember) {
    return apiError("forbidden", "Not a workspace member", 403);
  }

  const url = new URL(request.url);
  const parentKindRaw = url.searchParams.get("parentKind");
  const parentId = url.searchParams.get("parentId");

  if (parentKindRaw || parentId) {
    const kindParsed = attachmentParentKindSchema.safeParse(parentKindRaw);
    if (!kindParsed.success || !parentId) {
      return apiError(
        "invalid_body",
        "parentKind and parentId are required together",
        400,
      );
    }
    const { data: links, error: linksError } = await supabase
      .from("attachment_links")
      .select("attachment_id")
      .eq("workspace_id", workspaceId)
      .eq("parent_kind", kindParsed.data)
      .eq("parent_id", parentId);
    if (linksError) {
      return apiError("internal", linksError.message, 500);
    }
    const ids = (links ?? []).map((l) => l.attachment_id);
    if (ids.length === 0) {
      return jsonOk(listAttachmentsResponseSchema.parse({ attachments: [] }));
    }
    const { data, error } = await supabase
      .from("attachments")
      .select(ATTACHMENT_SELECT)
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .is("deleted_at", null)
      .eq("status", "ready");
    if (error) {
      return apiError("internal", error.message, 500);
    }
    return jsonOk(
      listAttachmentsResponseSchema.parse({
        attachments: (data ?? []).map(toAttachmentResponse),
      }),
    );
  }

  const { data, error } = await supabase
    .from("attachments")
    .select(ATTACHMENT_SELECT)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return apiError("internal", error.message, 500);
  }
  return jsonOk(
    listAttachmentsResponseSchema.parse({
      attachments: (data ?? []).map(toAttachmentResponse),
    }),
  );
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId } = await context.params;

  const { data: isMember, error: memberError } = await supabase.rpc(
    "is_workspace_member",
    { ws_id: workspaceId },
  );
  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }
  if (!isMember) {
    return apiError("forbidden", "Not a workspace member", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = createAttachmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const limitResponse = await assertWorkspaceStorageAllowed(
    supabase,
    workspaceId,
    data.byteSize,
  );
  if (limitResponse) {
    return limitResponse;
  }

  const { data: existing, error: existingError } = await supabase
    .from("attachments")
    .select("id, workspace_id")
    .eq("id", data.id)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.workspace_id !== workspaceId) {
    return apiError(
      "conflict",
      "Attachment id belongs to another workspace",
      409,
    );
  }
  if (existing) {
    return apiError("conflict", "Attachment already exists", 409);
  }

  const storagePath = attachmentStoragePath(workspaceId, data.id);

  const { data: row, error } = await supabase
    .from("attachments")
    .insert({
      id: data.id,
      workspace_id: workspaceId,
      encrypted_meta: data.encryptedMeta,
      wrapped_dek: data.wrappedDek,
      byte_size: data.byteSize,
      storage_path: storagePath,
      status: "pending",
    })
    .select(ATTACHMENT_SELECT)
    .single();
  if (error || !row) {
    return apiError("internal", error?.message ?? "Insert failed", 500);
  }

  let uploadUrl: string;
  try {
    uploadUrl = await createAttachmentUploadUrl(storagePath);
  } catch (e) {
    await supabase.from("attachments").delete().eq("id", data.id);
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to mint upload URL",
      500,
    );
  }

  const attachment = toAttachmentResponse(row);
  return jsonOk(
    createAttachmentResponseSchema.parse({
      ...attachment,
      uploadUrl,
    }),
  );
}
