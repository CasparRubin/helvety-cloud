import {
  getMePolicyAcceptancesResponseSchema,
  putMePolicyAcceptancesRequestSchema,
  putMePolicyAcceptancesResponseSchema,
  signupPolicyIds,
  type SignupPolicyId,
} from "@helvety-cloud/api-contract";

import { apiError, jsonOk } from "@/lib/api/errors";
import {
  CURRENT_POLICY_VERSIONS,
  SIGNUP_POLICY_IDS,
} from "@/lib/legal/policies";
import { loadPolicyAcceptances } from "@/lib/legal/policy-acceptances";
import { isAuthedApi, requireUser } from "@/lib/supabase/api";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!isAuthedApi(auth)) {
    return auth;
  }
  const { supabase, user } = auth;

  try {
    const status = await loadPolicyAcceptances(supabase, user.id);
    return jsonOk(
      getMePolicyAcceptancesResponseSchema.parse({
        currentVersions: CURRENT_POLICY_VERSIONS,
        acceptances: status.acceptances,
        missingPolicies: status.missingPolicies,
        allCurrentAccepted: status.allCurrentAccepted,
      }),
    );
  } catch (err) {
    return apiError(
      "internal",
      err instanceof Error ? err.message : "Failed to load policy acceptances",
      500,
    );
  }
}

export async function PUT(request: Request) {
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

  const parsed = putMePolicyAcceptancesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.message, 400);
  }

  const byPolicy = new Map<SignupPolicyId, string>();
  for (const item of parsed.data.acceptances) {
    if (byPolicy.has(item.policy)) {
      return apiError(
        "invalid_body",
        `Duplicate policy in request: ${item.policy}`,
        400,
      );
    }
    byPolicy.set(item.policy, item.version);
  }

  for (const id of SIGNUP_POLICY_IDS) {
    const version = byPolicy.get(id);
    if (!version) {
      return apiError(
        "invalid_body",
        `Missing required policy acceptance: ${id}`,
        400,
      );
    }
    if (version !== CURRENT_POLICY_VERSIONS[id]) {
      return apiError(
        "invalid_body",
        `Stale or unknown version for ${id}: expected ${CURRENT_POLICY_VERSIONS[id]}`,
        400,
      );
    }
  }

  const rows = signupPolicyIds.map((policy) => ({
    user_id: user.id,
    policy,
    version: CURRENT_POLICY_VERSIONS[policy],
  }));

  const { error: insertError } = await supabase
    .from("policy_acceptances")
    .upsert(rows, {
      onConflict: "user_id,policy,version",
      ignoreDuplicates: true,
    });

  if (insertError) {
    return apiError("internal", insertError.message, 500);
  }

  try {
    const status = await loadPolicyAcceptances(supabase, user.id);
    if (!status.allCurrentAccepted) {
      return apiError(
        "internal",
        "Policy acceptances were not recorded for all current versions",
        500,
      );
    }
    return jsonOk(
      putMePolicyAcceptancesResponseSchema.parse({
        acceptances: status.acceptances,
        allCurrentAccepted: true as const,
      }),
    );
  } catch (err) {
    return apiError(
      "internal",
      err instanceof Error
        ? err.message
        : "Failed to verify policy acceptances",
      500,
    );
  }
}
