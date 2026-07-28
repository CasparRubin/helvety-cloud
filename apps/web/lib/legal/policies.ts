/**
 * Current product legal pack versions (P-legal2).
 * Bump a version when that document changes materially; users must re-accept.
 */

export const SIGNUP_POLICY_IDS = ["tos", "privacy", "aup", "e2ee"] as const;
export type SignupPolicyId = (typeof SIGNUP_POLICY_IDS)[number];

/** Current production versions. Must match UI offers and API acceptance. */
export const CURRENT_POLICY_VERSIONS: Record<SignupPolicyId, string> = {
  tos: "2026-07-28-v5",
  privacy: "2026-07-28-v6",
  aup: "2026-07-26-v2",
  e2ee: "2026-07-27-v3",
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

export const LEGAL_DOC_META: Record<
  LegalDocSlug,
  { title: string; href: `/legal/${LegalDocSlug}`; signupPolicy?: SignupPolicyId }
> = {
  impressum: { title: "Impressum", href: "/legal/impressum" },
  terms: { title: "Terms of Service", href: "/legal/terms", signupPolicy: "tos" },
  privacy: {
    title: "Privacy Policy",
    href: "/legal/privacy",
    signupPolicy: "privacy",
  },
  aup: {
    title: "Acceptable Use Policy",
    href: "/legal/aup",
    signupPolicy: "aup",
  },
  e2ee: {
    title: "E2EE / zero-access notice",
    href: "/legal/e2ee",
    signupPolicy: "e2ee",
  },
  billing: { title: "Billing terms", href: "/legal/billing" },
  subprocessors: { title: "Subprocessors", href: "/legal/subprocessors" },
};
