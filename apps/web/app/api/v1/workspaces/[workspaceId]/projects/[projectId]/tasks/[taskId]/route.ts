import {
  ciphertextEnvelopeSchema,
  putTaskRequestSchema,
  taskResponseSchema,
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
  params: Promise<{
    workspaceId: string;
    projectId: string;
    taskId: string;
  }>;
};

const TASK_SELECT =
  "id, project_id, encrypted_blob, label_id, stage_id, priority_id, sort_order, updated_at, deleted_at";

function toTaskResponse(
  row: {
    id: string;
    project_id: string;
    encrypted_blob: unknown;
    label_id: string | null;
    stage_id: string | null;
    priority_id: string | null;
    sort_order: number;
    updated_at: string;
    deleted_at: string | null;
  },
  workspaceId: string,
  links: EntityLinkTarget[],
) {
  return taskResponseSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId,
    encryptedBlob: ciphertextEnvelopeSchema.parse(row.encrypted_blob),
    labelId: row.label_id,
    stageId: row.stage_id,
    priorityId: row.priority_id,
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
  const { workspaceId, projectId, taskId } = await context.params;

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
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("not_found", "Task not found", 404);
  }

  let links: EntityLinkTarget[];
  try {
    links = await listOutgoingLinks(supabase, workspaceId, "task", taskId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to load links",
      500,
    );
  }

  return jsonOk(toTaskResponse(data, workspaceId, links));
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId, taskId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = putTaskRequestSchema.safeParse(body);
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

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("id, label_id, stage_id, priority_id")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (existingError) {
    return apiError("internal", existingError.message, 500);
  }
  if (!existing) {
    const limitResponse = await assertWorkspaceCreateAllowed(
      supabase,
      workspaceId,
      "tasks",
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

  const labelId =
    data.labelId !== undefined
      ? data.labelId
      : (existing?.label_id ?? null);
  const stageId =
    data.stageId !== undefined ? data.stageId : (existing?.stage_id ?? null);
  const priorityId =
    data.priorityId !== undefined
      ? data.priorityId
      : (existing?.priority_id ?? null);

  const { data: row, error } = await supabase
    .from("tasks")
    .upsert(
      {
        id: taskId,
        project_id: projectId,
        encrypted_blob: data.encryptedBlob,
        label_id: labelId,
        stage_id: stageId,
        priority_id: priorityId,
        sort_order: data.sortOrder ?? 0,
        deleted_at: data.deletedAt ?? null,
      },
      { onConflict: "id" },
    )
    .select(TASK_SELECT)
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
        "task",
        taskId,
        data.links,
      );
    } else {
      links = await listOutgoingLinks(supabase, workspaceId, "task", taskId);
    }
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to update links",
      500,
    );
  }

  return jsonOk(toTaskResponse(row, workspaceId, links));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase } = auth;
  const { workspaceId, projectId, taskId } = await context.params;

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

  try {
    await deleteLinksTouching(supabase, workspaceId, "task", taskId);
  } catch (e) {
    return apiError(
      "internal",
      e instanceof Error ? e.message : "Failed to delete links",
      500,
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
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
    return apiError("not_found", "Task not found", 404);
  }

  return new Response(null, { status: 204 });
}
