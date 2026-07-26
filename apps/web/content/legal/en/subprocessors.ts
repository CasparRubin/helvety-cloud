import type { LegalDocument } from "../types";

export const subprocessorsDoc: LegalDocument = {
  slug: "subprocessors",
  title: "Subprocessors",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Living list",
      paragraphs: [
        "Helvety uses the following processors to operate Helvety Cloud. This list may change; material changes will be reflected here and, where required, communicated under the Privacy Policy.",
      ],
    },
    {
      heading: "Current processors",
      paragraphs: [
        "Supabase: authentication and Postgres database. Project helvety-cloud is in eu-central-2 (Zurich). Processes account email/auth metadata and ciphertext/metadata as described in the Privacy Policy.",
        "Vercel: application hosting. Processes HTTP traffic and hosting logs for the web app.",
        "Email delivery via Supabase Auth: OTP and auth emails. Region depends on Supabase Auth email configuration.",
        "Stripe: payment processing when billing is enabled. Processes billing identity and payment metadata only, never encrypted plaintext or raw encryption keys. Not charged until paid plans are turned on in the product.",
      ],
    },
    {
      heading: "Updates",
      paragraphs: [
        "We may update this list when vendors change. Continued use of the Service after publication constitutes notice of the updated list, subject to Privacy Policy requirements for material changes.",
      ],
    },
  ],
};
