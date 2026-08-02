import {
  ciphertextEnvelopeSchema,
  boardResponseSchema,
  putBoardRequestSchema,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import {
  listOutgoingLinks,
  replaceOutgoingLinks,
  validateLinkTargetsInWorkspace,
  deleteLinksTouching,
} from "@/lib/api/entity-links";
import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; boardId: string }>;
};

const BOARD_SELECT =
  "id, workspace_id, encrypted_blob, sort_order, is_pinned, pin_sort_order, created_at, updated_at, deleted_at";

function toBoardResponse(
  row: {
    id: string;
    workspace_id: string;
    encrypted_blob: unknown;
    sort_order: number;
    is_pinned: boolean;
    pin_sort_order: number | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  },
  links: EntityLinkTarget[],
) {
  return boardResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    links,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    sortOrder: row.sort_order,
    isPinned: row.is_pinned,
    pinSortOrder: row.pin_sort_order,
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
  const { workspaceId, boardId } = await context.params;

  const { data, error } = await supabase
    .from("boards")
    .select(BOARD_SELECT)
    .eq("id", boardId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Board not found", 404);
  }

  let links: EntityLinkTarget[];
  try {
    links = await listOutgoingLinks(supabase, workspaceId, "board", boardId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  return jsonOk(toBoardResponse(data, links));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, boardId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putBoardRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("boards")
    .select("workspace_id")
    .eq("id", boardId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.workspace_id !== workspaceId) {
    return apiError("conflict", "Board id belongs to another workspace", 409);
  }

  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "boards",
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  if (data.links !== undefined) {
    const validated = await validateLinkTargetsInWorkspace(
      supabase,
      workspaceId,
      "board",
      data.links,
    );
    if (!validated.ok) {
      return apiError("invalid_body", validated.message, 400);
    }
  }

  const { data: row, error } = await supabase
    .from("boards")
    .upsert(
      {
        id: boardId,
        workspace_id: workspaceId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        is_pinned: data.isPinned ?? false,
        pin_sort_order:
          data.isPinned === false ? null : (data.pinSortOrder ?? null),
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(BOARD_SELECT)
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
        "board",
        boardId,
        data.links,
      );
    } else {
      links = await listOutgoingLinks(supabase, workspaceId, "board", boardId);
    }
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to update links",
      500,
    );
  }

  return jsonOk(toBoardResponse(row, links));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, boardId } = await context.params;

  try {
    await deleteLinksTouching(supabase, workspaceId, "board", boardId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to delete links",
      500,
    );
  }

  const { data, error } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId)
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
    return apiError("not_found", "Board not found", 404);
  }

  return new Response(null, { status: 204 });
}
