import {
  ciphertextEnvelopeSchema,
  milestoneResponseSchema,
  putMilestoneRequestSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
    projectId: string;
    milestoneId: string;
  }>;
};

const MILESTONE_SELECT =
  "id, project_id, encrypted_blob, sort_order, updated_at, deleted_at";

function toMilestoneResponse(
  row: {
    id: string;
    project_id: string;
    encrypted_blob: unknown;
    sort_order: number;
    updated_at: string;
    deleted_at: string | null;
  },
  workspaceId: string,
) {
  return milestoneResponseSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId,
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
  const { workspaceId, projectId, milestoneId } = await context.params;

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
    return apiError("not_found", "Project not found", 404);
  }

  const { data, error } = await supabase
    .from("milestones")
    .select(MILESTONE_SELECT)
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Milestone not found", 404);
  }

  return jsonOk(toMilestoneResponse(data, workspaceId));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId, milestoneId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putMilestoneRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const data = parsed.data;

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
    return apiError("not_found", "Project not found", 404);
  }

  const { data: row, error } = await supabase
    .from("milestones")
    .upsert(
      {
        id: milestoneId,
        project_id: projectId,
        encrypted_blob: data.encryptedBlob,
        sort_order: data.sortOrder ?? 0,
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(MILESTONE_SELECT)
    .single();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("invalid_ciphertext", error.message, 400);
  }

  return jsonOk(toMilestoneResponse(row, workspaceId));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId, milestoneId } = await context.params;

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
    return apiError("not_found", "Project not found", 404);
  }

  const { data, error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42501") {
      return apiError("forbidden", "Not a workspace member", 403);
    }
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Milestone not found", 404);
  }

  return new Response(null, { status: 204 });
}
