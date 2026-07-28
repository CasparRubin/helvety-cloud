import {
  createWorkspaceInvitationRequestSchema,
  listWorkspaceInvitationsResponseSchema,
  workspaceInvitationSchema,
} from "@helvety-cloud/api-contract";

import { assertInviteMemberAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { mapInvitationRow } from "@/lib/api/invitations";
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
    return apiError("forbidden", "Not allowed to list invitations", 403);
  }

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select(
      "id, workspace_id, email, invited_by, role, claimed_by, claimed_public_key, claimed_at, sealed_workspace_key, sealed_at, sealed_by, accepted_at, cancelled_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("internal", error.message, 500);
  }

  return jsonOk(
    listWorkspaceInvitationsResponseSchema.parse({
      invitations: (data ?? []).map((row) => mapInvitationRow(row)),
    }),
  );
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;
  const { workspaceId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = createWorkspaceInvitationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const { id, email, role } = parsed.data;

  const { data: isMember, error: memberError } = await supabase.rpc(
    "is_workspace_member",
    { ws_id: workspaceId },
  );
  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }
  if (!isMember) {
    return apiError("forbidden", "Not allowed to invite", 403);
  }

  const limitResponse = await assertInviteMemberAllowed(supabase, workspaceId);
  if (limitResponse) {
    return limitResponse;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: user.id },
    { onConflict: "id" },
  );
  if (profileError) {
    return apiError("internal", profileError.message, 500);
  }

  const { data, error } = await supabase
    .from("workspace_invitations")
    .insert({
      id,
      workspace_id: workspaceId,
      email,
      invited_by: user.id,
      role,
    })
    .select(
      "id, workspace_id, email, invited_by, role, claimed_by, claimed_public_key, claimed_at, sealed_workspace_key, sealed_at, sealed_by, accepted_at, cancelled_at, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return apiError(
        "conflict",
        "An active invitation already exists for this email",
        409,
      );
    }
    return apiError("internal", error.message, 500);
  }
  if (!data) {
    return apiError("internal", "Invitation insert returned no row", 500);
  }

  return jsonOk(workspaceInvitationSchema.parse(mapInvitationRow(data)), 201);
}
