import type { LegalDocument } from "./types";

export const impressumDoc: LegalDocument = {
  slug: "impressum",
  title: "Impressum",
  versionLabel: "2026-07-24-v1",
  sections: [
    {
      heading: "Service provider",
      paragraphs: [
        "Provider of the Helvety Cloud service at helvety.cloud:",
        "Helvety by Rubin",
        "Owner: Caspar Camille Rubin",
        "Legal form: Swiss Einzelunternehmen (sole proprietorship)",
        "Registered address: Holeestrasse 116, 4054 Basel, Switzerland",
        "UID: CHE-356.266.592",
        "Commercial register: CH-270.1.021.985-7 (Basel-Stadt)",
        "Contact: contact@helvety.com",
      ],
    },
    {
      heading: "Responsibility for content",
      paragraphs: [
        "Account and service metadata are processed as described in the Privacy Policy. Vault content is end-to-end encrypted: Helvety cannot read, decrypt, or restore vault plaintext. This Impressum does not create any obligation or ability to recover encrypted user content.",
      ],
    },
  ],
};
