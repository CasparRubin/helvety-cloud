import {
  ciphertextEnvelopeSchema,
  noteResponseSchema,
  putNoteRequestSchema,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import {
  listOutgoingLinks,
  replaceOutgoingLinks,
  replaceProjectLinks,
  validateLinkTargetsInWorkspace,
  deleteLinksTouching,
} from "@/lib/api/entity-links";
import {
  AttachmentLinkLimitError,
  replaceAttachmentLinks,
  softDeleteAttachmentsForParent,
} from "@/lib/api/attachment-links";
import { removeAttachmentObject } from "@/lib/api/attachment-storage";
import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; noteId: string }>;
};

const NOTE_SELECT =
  "id, workspace_id, encrypted_blob, sort_order, created_at, updated_at, deleted_at";

function toNoteResponse(
  row: {
    id: string;
    workspace_id: string;
    encrypted_blob: unknown;
    sort_order: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  },
  links: EntityLinkTarget[],
) {
  return noteResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    links,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser(_request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, noteId } = await context.params;

  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("id", noteId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Note not found", 404);
  }

  let links: EntityLinkTarget[];
  try {
    links = await listOutgoingLinks(supabase, workspaceId, "note", noteId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  return jsonOk(toNoteResponse(data, links));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, noteId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putNoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("notes")
    .select("workspace_id")
    .eq("id", noteId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.workspace_id !== workspaceId) {
    return apiError("conflict", "Note id belongs to another workspace", 409);
  }

  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "notes",
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  if (data.links !== undefined) {
    const bodyLinks = data.links.filter((l) => l.kind !== "project");
    const validated = await validateLinkTargetsInWorkspace(
      supabase,
      workspaceId,
      "note",
      bodyLinks,
    );
    if (!validated.ok) {
      return apiError("invalid_body", validated.message, 400);
    }
  }

  if (data.projectIds !== undefined) {
    const projectLinks: EntityLinkTarget[] = data.projectIds.map((id) => ({
      kind: "project" as const,
      id,
    }));
    const validated = await validateLinkTargetsInWorkspace(
      supabase,
      workspaceId,
      "note",
      projectLinks,
    );
    if (!validated.ok) {
      return apiError("invalid_body", validated.message, 400);
    }
  }

  const { data: row, error } = await supabase
    .from("notes")
    .upsert(
      {
        id: noteId,
        workspace_id: workspaceId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(NOTE_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  let links: EntityLinkTarget[];
  try {
    if (data.links !== undefined) {
      links = await replaceOutgoingLinks(
        supabase,
        workspaceId,
        "note",
        noteId,
        data.links.filter((l) => l.kind !== "project"),
      );
    } else {
      links = await listOutgoingLinks(supabase, workspaceId, "note", noteId);
    }
    if (data.projectIds !== undefined) {
      links = await replaceProjectLinks(
        supabase,
        workspaceId,
        "note",
        noteId,
        data.projectIds,
      );
    }
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to update links",
      500,
    );
  }

  if (data.attachmentIds !== undefined) {
    try {
      await replaceAttachmentLinks(
        supabase,
        workspaceId,
        "note",
        noteId,
        data.attachmentIds,
      );
    } catch (e) {
      if (e instanceof AttachmentLinkLimitError) {
        return apiError("limit_exceeded", e.message, 403);
      }
      return apiError(
        "invalid_body",
        e instanceof Error ? e.message : "Failed to update attachments",
        400,
      );
    }
  }

  return jsonOk(toNoteResponse(row, links));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, noteId } = await context.params;

  // Drop edges before deleting the note.
  try {
    await deleteLinksTouching(supabase, workspaceId, "note", noteId);
    const orphanIds = await softDeleteAttachmentsForParent(
      supabase,
      workspaceId,
      "note",
      noteId,
    );
    for (const id of orphanIds) {
      try {
        await removeAttachmentObject(`${workspaceId}/${id}`);
      } catch {
        // Soft-delete is enough; Storage orphan can be swept later.
      }
    }
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to delete links",
      500,
    );
  }

  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Note not found", 404);
  }

  return new Response(null, { status: 204 });
}
