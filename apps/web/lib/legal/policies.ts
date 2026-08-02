/**
 * Current product legal pack versions (P-legal2).
 * Live documents live on helvety.com. Bump a version when that document
 * (or its gated section) changes materially; users must re-accept.
 */

export const HELVETY_COM_ORIGIN = "https://helvety.com" as const;

export const SIGNUP_POLICY_IDS = [
  "tos",
  "privacy",
  "aup",
  "e2ee",
  "eligibility",
] as const;
export type SignupPolicyId = (typeof SIGNUP_POLICY_IDS)[number];

/** Current production versions. Must match UI offers and API acceptance. */
export const CURRENT_POLICY_VERSIONS: Record<SignupPolicyId, string> = {
  tos: "2026-07-28-v6",
  privacy: "2026-07-28-v8",
  aup: "2026-07-28-v3",
  e2ee: "2026-07-28-v4",
  eligibility: "2026-07-28-v1",
};

/** Absolute helvety.com legal URLs (open in a new tab from Cloud). */
export const LEGAL_EXTERNAL_HREFS = {
  impressum: `${HELVETY_COM_ORIGIN}/impressum`,
  terms: `${HELVETY_COM_ORIGIN}/terms`,
  privacy: `${HELVETY_COM_ORIGIN}/privacy`,
  aup: `${HELVETY_COM_ORIGIN}/terms#aup`,
  e2ee: `${HELVETY_COM_ORIGIN}/terms#e2ee`,
  billing: `${HELVETY_COM_ORIGIN}/terms#billing`,
  eligibility: `${HELVETY_COM_ORIGIN}/terms#eligibility`,
} as const;

/** Signup gate: policy id → helvety.com document URL. */
export const SIGNUP_POLICY_HREFS: Record<SignupPolicyId, string> = {
  tos: LEGAL_EXTERNAL_HREFS.terms,
  privacy: LEGAL_EXTERNAL_HREFS.privacy,
  aup: LEGAL_EXTERNAL_HREFS.aup,
  e2ee: LEGAL_EXTERNAL_HREFS.e2ee,
  eligibility: LEGAL_EXTERNAL_HREFS.eligibility,
};
