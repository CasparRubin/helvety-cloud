import {
  ciphertextEnvelopeSchema,
  noteResponseSchema,
  putNoteRequestSchema,
} from "@helvety-cloud/api-contract";

import { assertWorkspaceCreateAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{ workspaceId: string; noteId: string }>;
};

const NOTE_SELECT =
  "id, workspace_id, project_id, issue_id, encrypted_blob, sort_order, updated_at, deleted_at";

function toNoteResponse(row: {
  id: string;
  workspace_id: string;
  project_id: string | null;
  issue_id: string | null;
  encrypted_blob: unknown;
  sort_order: number;
  updated_at: string;
  deleted_at: string | null;
}) {
  return noteResponseSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    issueId: row.issue_id,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    sortOrder: row.sort_order,
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

  return jsonOk(toNoteResponse(data));
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

  const projectId =
    data.projectId === undefined ? undefined : data.projectId;
  const issueId = data.issueId === undefined ? undefined : data.issueId;

  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (projectError) {
      return apiError("internal", projectError.message, 500);
    }
    if (!project) {
      return apiError("invalid_body", "projectId not in workspace", 400);
    }
  }

  if (issueId) {
    const { data: issue, error: issueError } = await supabase
      .from("issues")
      .select("id, project_id")
      .eq("id", issueId)
      .maybeSingle();
    if (issueError) {
      return apiError("internal", issueError.message, 500);
    }
    if (!issue) {
      return apiError("invalid_body", "issueId not in workspace", 400);
    }
    const { data: issueProject, error: issueProjectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", issue.project_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (issueProjectError) {
      return apiError("internal", issueProjectError.message, 500);
    }
    if (!issueProject) {
      return apiError("invalid_body", "issueId not in workspace", 400);
    }
  }

  const upsertRow: {
    id: string;
    workspace_id: string;
    encrypted_blob: typeof data.encryptedBlob;
    sort_order: number;
    deleted_at: string | null;
    project_id?: string | null;
    issue_id?: string | null;
  } = {
    id: noteId,
    workspace_id: workspaceId,
    encrypted_blob: data.encryptedBlob,
    sort_order: data.sortOrder ?? 0,
    deleted_at: data.deletedAt ?? null,
  };

  if (projectId !== undefined) {
    upsertRow.project_id = projectId;
  }
  if (issueId !== undefined) {
    upsertRow.issue_id = issueId;
  }

  // On first insert without projectId/issueId in body, default to null.
  if (!existing) {
    if (projectId === undefined) upsertRow.project_id = null;
    if (issueId === undefined) upsertRow.issue_id = null;
  }

  const { data: row, error } = await supabase
    .from("notes")
    .upsert(upsertRow, { onConflict: "id" })
    .select(NOTE_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  return jsonOk(toNoteResponse(row));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, noteId } = await context.params;

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
