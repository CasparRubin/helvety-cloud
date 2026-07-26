import type { LegalDocument } from "./types";

export const aupDoc: LegalDocument = {
  slug: "aup",
  title: "Acceptable Use Policy",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Purpose",
      paragraphs: [
        "This Acceptable Use Policy (“AUP”) sets rules for using Helvety Cloud. It forms part of the Terms of Service.",
      ],
    },
    {
      heading: "Prohibited use",
      paragraphs: [
        "You must not use Helvety Cloud for illegal activity, including storage or distribution of illegal content, child sexual abuse material, terrorism content where prohibited, harassment, fraud, malware distribution, unauthorized access to systems, or infringement of others’ intellectual property or privacy rights.",
        "You must not attempt to disrupt the Service, overload infrastructure beyond ordinary use, scrape or harvest accounts without authorization, probe systems except through coordinated responsible disclosure to Helvety, or circumvent technical or account limits.",
        "You must not misrepresent affiliation with Helvety or use the Service to send spam or deceptive communications.",
      ],
    },
    {
      heading: "Enforcement without reading encrypted content",
      paragraphs: [
        "Because your data is end-to-end encrypted, Helvety cannot moderate plaintext. Enforcement options are limited to account-level and ciphertext-level measures (for example suspending accounts, deleting encrypted blobs or workspaces, or blocking access) based on signals Helvety can see, such as abuse of APIs, illegal account activity, or lawful requests relating to metadata Helvety holds.",
        "Helvety does not claim the ability to inspect or “clean” encrypted content.",
      ],
    },
    {
      heading: "Your responsibility",
      paragraphs: [
        "You are responsible for the lawfulness of content you encrypt and for compliance with applicable law. Helvety’s inability to read your data does not authorize illegal use.",
        "If Helvety reasonably believes your use creates legal risk or harms the Service or others, Helvety may suspend or terminate access without prior notice when urgency reasonably requires it.",
      ],
    },
    {
      heading: "Reporting",
      paragraphs: [
        "Abuse or legal notices regarding account/metadata Helvety can act on: contact@helvety.com. Reports that require Helvety to read encrypted plaintext cannot be fulfilled; Helvety can only act on what it stores.",
      ],
    },
  ],
};
