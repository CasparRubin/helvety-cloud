import {
  ciphertextEnvelopeSchema,
  contactResponseSchema,
  putContactRequestSchema,
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
  params: Promise<{ workspaceId: string; contactId: string }>;
};

const CONTACT_SELECT =
  "id, workspace_id, encrypted_blob, sort_order, updated_at, deleted_at";

function toContactResponse(
  row: {
    id: string;
    workspace_id: string;
    encrypted_blob: unknown;
    sort_order: number;
    updated_at: string;
    deleted_at: string | null;
  },
  links: EntityLinkTarget[],
) {
  return contactResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    links,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser(_request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, contactId } = await context.params;

  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Contact not found", 404);
  }

  let links: EntityLinkTarget[];
  try {
    links = await listOutgoingLinks(
      supabase,
      workspaceId,
      "contact",
      contactId,
    );
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  return jsonOk(toContactResponse(data, links));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, contactId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putContactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

  const { data: existing, error: existingError } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (existing && existing.workspace_id !== workspaceId) {
    return apiError("conflict", "Contact id belongs to another workspace", 409);
  }

  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "contacts",
    );
    if (limitResponse) {
      return limitResponse;
    }
  }

  if (data.links !== undefined) {
    const validated = await validateLinkTargetsInWorkspace(
      supabase,
      workspaceId,
      data.links,
    );
    if (!validated.ok) {
      return apiError("invalid_body", validated.message, 400);
    }
  }

  const { data: row, error } = await supabase
    .from("contacts")
    .upsert(
      {
        id: contactId,
        workspace_id: workspaceId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(CONTACT_SELECT)
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
        "contact",
        contactId,
        data.links,
      );
    } else {
      links = await listOutgoingLinks(
        supabase,
        workspaceId,
        "contact",
        contactId,
      );
    }
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to update links",
      500,
    );
  }

  return jsonOk(toContactResponse(row, links));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, contactId } = await context.params;

  try {
    await deleteLinksTouching(supabase, workspaceId, "contact", contactId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to delete links",
      500,
    );
  }

  const { data, error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
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
    return apiError("not_found", "Contact not found", 404);
  }

  return new Response(null, { status: 204 });
}
