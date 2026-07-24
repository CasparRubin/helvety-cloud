import {
  CURRENT_POLICY_VERSIONS,
  SIGNUP_POLICY_IDS,
  type SignupPolicyId,
} from "@/lib/legal/policies";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@helvety-cloud/db";

type AuthedClient = SupabaseClient<Database>;

export type PolicyAcceptanceRow = {
  policy: SignupPolicyId;
  version: string;
  acceptedAt: string;
};

function isSignupPolicyId(value: string): value is SignupPolicyId {
  return (SIGNUP_POLICY_IDS as readonly string[]).includes(value);
}

export async function loadPolicyAcceptances(
  supabase: AuthedClient,
  userId: string,
): Promise<{
  acceptances: PolicyAcceptanceRow[];
  missingPolicies: SignupPolicyId[];
  allCurrentAccepted: boolean;
}> {
  const { data, error } = await supabase
    .from("policy_acceptances")
    .select("policy, version, accepted_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  const acceptances: PolicyAcceptanceRow[] = [];
  for (const row of data ?? []) {
    if (!isSignupPolicyId(row.policy)) continue;
    if (row.version !== CURRENT_POLICY_VERSIONS[row.policy]) continue;
    acceptances.push({
      policy: row.policy,
      version: row.version,
      acceptedAt: row.accepted_at,
    });
  }

  const accepted = new Set(acceptances.map((a) => a.policy));
  const missingPolicies = SIGNUP_POLICY_IDS.filter((id) => !accepted.has(id));

  return {
    acceptances,
    missingPolicies,
    allCurrentAccepted: missingPolicies.length === 0,
  };
}
