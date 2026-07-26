/**
 * Current product legal pack versions (P-legal2).
 * Bump a version when that document changes materially; users must re-accept.
 */

export const SIGNUP_POLICY_IDS = ["tos", "privacy", "aup", "e2ee"] as const;
export type SignupPolicyId = (typeof SIGNUP_POLICY_IDS)[number];

/** Current production versions. Must match UI offers and API acceptance. */
export const CURRENT_POLICY_VERSIONS: Record<SignupPolicyId, string> = {
  tos: "2026-07-26-v2",
  privacy: "2026-07-26-v2",
  aup: "2026-07-26-v2",
  e2ee: "2026-07-26-v2",
};

export const LEGAL_DOC_SLUGS = [
  "impressum",
  "terms",
  "privacy",
  "aup",
  "e2ee",
  "billing",
  "subprocessors",
] as const;
export type LegalDocSlug = (typeof LEGAL_DOC_SLUGS)[number];

/** Locale-agnostic hrefs and signup mapping. Display titles live in i18n `legalChrome`. */
export const LEGAL_DOC_META: Record<
  LegalDocSlug,
  { href: `/legal/${LegalDocSlug}`; signupPolicy?: SignupPolicyId }
> = {
  impressum: { href: "/legal/impressum" },
  terms: { href: "/legal/terms", signupPolicy: "tos" },
  privacy: { href: "/legal/privacy", signupPolicy: "privacy" },
  aup: { href: "/legal/aup", signupPolicy: "aup" },
  e2ee: { href: "/legal/e2ee", signupPolicy: "e2ee" },
  billing: { href: "/legal/billing" },
  subprocessors: { href: "/legal/subprocessors" },
};
