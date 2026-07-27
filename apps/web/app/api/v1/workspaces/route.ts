import {
  ciphertextEnvelopeSchema,
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
  listWorkspacesResponseSchema,
  sealedKeyEnvelopeSchema,
  workspaceKindSchema,
  workspaceRoleSchema,
} from "@helvety-cloud/api-contract";

import { assertOwnedWorkspaceAllowed } from "@/lib/api/entitlements";
import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  const { data: memberships, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }

  if (!memberships || memberships.length === 0) {
    return jsonOk(listWorkspacesResponseSchema.parse({ workspaces: [] }));
  }

  const workspaceIds = memberships.map((m) => m.workspace_id);
  const roleByWorkspace = new Map(
    memberships.map((m) => [m.workspace_id, m.role] as const),
  );

  const { data: workspaces, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, encrypted_blob, kind, updated_at")
    .in("id", workspaceIds)
    .order("updated_at", { ascending: false });

  if (workspaceError) {
    return apiError("internal", workspaceError.message, 500);
  }

  const { data: wraps, error: wrapError } = await supabase
    .from("wrapped_keys")
    .select("subject_id, wrapped_key")
    .eq("subject_type", "workspace")
    .eq("user_id", user.id)
    .in("subject_id", workspaceIds);

  if (wrapError) {
    return apiError("internal", wrapError.message, 500);
  }

  const wrapByWorkspace = new Map(
    (wraps ?? []).map((w) => [w.subject_id, w.wrapped_key] as const),
  );

  const items = [];
  for (const workspace of workspaces ?? []) {
    const wrappedKey = wrapByWorkspace.get(workspace.id);
    const role = roleByWorkspace.get(workspace.id);
    if (!wrappedKey || !role) {
      continue;
    }
    items.push({
      id: workspace.id,
      encryptedBlob: ciphertextEnvelopeSchema.parse(workspace.encrypted_blob),
      kind: workspaceKindSchema.parse(workspace.kind),
      role: workspaceRoleSchema.parse(role),
      wrappedKey: sealedKeyEnvelopeSchema.parse(wrappedKey),
      updatedAt: workspace.updated_at,
    });
  }

  return jsonOk(listWorkspacesResponseSchema.parse({ workspaces: items }));
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Request body must be JSON", 400);
  }

  const parsed = createWorkspaceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }
  const { id, encryptedBlob, kind, wrappedKey, asPro } = parsed.data;

  const limitResponse = await assertOwnedWorkspaceAllowed(supabase, user.id, {
    asPro: asPro === true,
  });
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

  const { error: workspaceError } = await supabase.from("workspaces").insert({
    id,
    created_by: user.id,
    encrypted_blob: encryptedBlob,
    kind,
  });
  if (workspaceError) {
    if (workspaceError.code === "23505") {
      return apiError("conflict", "Workspace already exists", 409);
    }
    return apiError("internal", workspaceError.message, 500);
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: id,
      user_id: user.id,
      role: "owner",
    });
  if (memberError) {
    return apiError("internal", memberError.message, 500);
  }

  const { error: wrapError } = await supabase.from("wrapped_keys").insert({
    subject_type: "workspace",
    subject_id: id,
    user_id: user.id,
    wrapped_key: wrappedKey,
  });
  if (wrapError) {
    return apiError("invalid_ciphertext", wrapError.message, 400);
  }

  return jsonOk(
    createWorkspaceResponseSchema.parse({ id, encryptedBlob, kind }),
    201,
  );
}
