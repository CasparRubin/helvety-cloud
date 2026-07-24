import {
  createWorkspaceRequestSchema,
  createWorkspaceResponseSchema,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

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
  const { id, wrappedKey } = parsed.data;

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

  return jsonOk(createWorkspaceResponseSchema.parse({ id }), 201);
}
