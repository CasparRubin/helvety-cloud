import type { LegalDocument } from "./types";

export const e2eeDoc: LegalDocument = {
  slug: "e2ee",
  title: "E2EE / zero-access notice",
  versionLabel: "2026-07-26-v1",
  sections: [
    {
      heading: "Acknowledgment required",
      paragraphs: [
        "You must acknowledge this notice before vault setup. It is a core part of how Helvety Cloud works.",
      ],
    },
    {
      heading: "Zero knowledge for vault content",
      paragraphs: [
        "Helvety cannot decrypt your vault content. There is no company master key, no key escrow, and no support workflow that restores vault plaintext.",
        "Authentication (email OTP for session) is separate from vault unlock. A signed-in session does not mean Helvety can read encrypted workspace data.",
      ],
    },
    {
      heading: "No recovery by Helvety",
      paragraphs: [
        "If you lose your unlock passkey/PRF capability and any recovery export you were shown, Helvety cannot recover your vault data. Lost keys mean permanent loss of that encrypted content.",
        "Any recovery key and wrap shown during setup must be stored offline by you. Never email them to Helvety or paste them into support channels with an expectation of restoration.",
      ],
    },
    {
      heading: "What Helvety may still hold",
      paragraphs: [
        "Helvety may hold account identifiers (for example email), membership metadata, public keys, ciphertext blobs, sizes, timestamps, and (when enabled) billing counters. Compelled disclosure, if any, can only cover what Helvety actually stores — not vault plaintext Helvety cannot produce.",
      ],
    },
    {
      heading: "Your acknowledgment",
      paragraphs: [
        "By accepting this notice you confirm that you understand Helvety cannot read or restore vault content, that you are responsible for your content and keys, and that permanent data loss is possible if unlock or recovery material is lost.",
      ],
    },
  ],
};
