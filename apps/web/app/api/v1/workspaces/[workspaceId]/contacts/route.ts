import {
  ciphertextEnvelopeSchema,
  contactResponseSchema,
  listContactsResponseSchema,
  type EntityLinkTarget,
} from "@helvety-cloud/api-contract";

import { listOutgoingLinksForSources } from "@/lib/api/entity-links";
import { apiError, jsonOk } from "@/lib/api/errors";
import {
  encodeSortOrderCursor,
  parseListSearchParams,
} from "@/lib/api/list-cursor";
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

  const url = new URL(request.url);
  const parsed = parseListSearchParams(url);
  if (!parsed.ok) {
    return apiError("invalid_body", parsed.message, 400);
  }
  const { limit, cursor, includeDeleted } = parsed;

  let query = supabase
    .from("contacts")
    .select(
      "id, workspace_id, encrypted_blob, sort_order, updated_at, deleted_at",
    )
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (cursor) {
    query = query.or(
      `sort_order.gt.${cursor.sortOrder},and(sort_order.eq.${cursor.sortOrder},id.gt.${cursor.id})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeSortOrderCursor({ sortOrder: last.sort_order, id: last.id })
      : null;

  let linksByContact: Map<string, EntityLinkTarget[]>;
  try {
    linksByContact = await listOutgoingLinksForSources(
      supabase,
      workspaceId,
      "contact",
      page.map((r) => r.id),
    );
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  const contacts = page.map((row) =>
    contactResponseSchema.parse({
      id: row.id,
      workspaceId: row.workspace_id,
      encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      links: linksByContact.get(row.id) ?? [],
    }),
  );

  return jsonOk(
    listContactsResponseSchema.parse({
      contacts,
      nextCursor,
    }),
  );
}
