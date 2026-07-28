import type { LegalDocument } from "./types";

export const termsDoc: LegalDocument = {
  slug: "terms",
  title: "Terms of Service",
  versionLabel: "2026-07-28-v4",
  sections: [
    {
      heading: "Agreement",
      paragraphs: [
        "These Terms of Service (“Terms”) govern access to and use of Helvety Cloud at helvety.cloud (the “Service”), provided by Helvety by Rubin, Basel, Switzerland (“Helvety”, “we”, “us”).",
        "By creating an account, accepting these Terms in the product, or using the Service, you agree to these Terms, the Acceptable Use Policy (AUP), the Privacy Policy, and the E2EE / zero-access notice. If you do not agree, do not use the Service.",
      ],
    },
    {
      heading: "The service",
      paragraphs: [
        "Helvety Cloud is a passwordless, end-to-end encrypted (E2EE) workspace service. Authentication creates an account session via email one-time codes. Encryption unlock and decryption happen only on your device using keys derived from your unlock passkey (WebAuthn PRF) and related client-held material.",
        "Helvety does not hold master keys, does not escrow encryption keys, and cannot decrypt or restore your data. Lost unlock credentials or recovery material can mean permanent loss of your data.",
        "The Service may change over time. We may add, modify, or discontinue features. Material changes to these Terms will be reflected by a new policy version that you may need to accept again before continued use of encrypted features.",
      ],
    },
    {
      heading: "Account",
      paragraphs: [
        "Access requires a valid email and one-time codes. Helvety Cloud does not use account passwords. Encryption unlock uses a separate passkey on your device and is not the same as signing in.",
        "You must be able to enter into binding contracts under applicable law. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization.",
        "You are responsible for keeping access to your email, unlock passkey, devices, and any recovery export under your control. Helvety cannot reset encryption access for you and will not ask you to send recovery keys or unlock material to Helvety.",
      ],
    },
    {
      heading: "Workspaces",
      paragraphs: [
        "Encrypted content lives in workspaces. A workspace has an owner and may have admins and members. Owners and admins can invite people and manage membership as shown in the product.",
        "Leaving a workspace as a non-owner, or being removed, drops your membership and wrapped keys for that workspace. Content stays for remaining members. Helvety does not rotate workspace keys when someone leaves or is removed.",
        "If you are the only member and leave, or if the owner deletes the workspace, its ciphertext is permanently deleted for everyone. Your Personal workspace cannot be left or deleted except by deleting your account.",
        "Deleting your account permanently removes your account data and solo-owned workspaces (including Personal). If you still own a workspace with other members, you must transfer ownership and leave, or delete that workspace, before account deletion. Support cannot restore access or keys.",
      ],
    },
    {
      heading: "License and acceptable use",
      paragraphs: [
        "Subject to these Terms and the AUP (incorporated by reference), Helvety grants you a limited, non-exclusive, non-transferable, revocable right to use the Service for lawful purposes.",
        "Helvety may suspend or terminate accounts for AUP violations, abuse, non-payment (when billing applies), legal risk, or to protect the Service. Because your data is end-to-end encrypted, enforcement for encrypted content is limited to account-level and ciphertext-level measures (for example suspending access or deleting encrypted blobs). Helvety cannot read plaintext to moderate it.",
      ],
    },
    {
      heading: "Your content and responsibility",
      paragraphs: [
        "You retain ownership of content you create. You grant Helvety only the rights needed to store and transmit ciphertext and related metadata to operate the Service.",
        "You are solely responsible for the lawfulness of content you encrypt and for complying with applicable law. Helvety’s inability to read your data does not authorize illegal use.",
      ],
    },
    {
      heading: "What the service is not",
      paragraphs: [
        "Helvety Cloud is not a plaintext backup of your data, not a key-recovery or forensic recovery service, and not a content host that can inspect or restore your encrypted workspace content.",
        "Free-tier limits are stated in the product and in the Billing terms. Paid Pro Workspace plans and add-ons are governed by the Billing terms and these Terms.",
      ],
    },
    {
      heading: "Availability and support",
      paragraphs: [
        "We aim for reliable availability but do not guarantee uninterrupted or error-free operation. Planned maintenance, third-party outages (for example hosting or auth providers), and force majeure may affect access.",
        "Support is limited to account and Service operation. Support cannot decrypt your data or restore lost keys.",
      ],
    },
    {
      heading: "Disclaimers",
      paragraphs: [
        "To the fullest extent permitted by mandatory law, the Service is provided “as is” and “as available”, without warranties of merchantability, fitness for a particular purpose, or non-infringement.",
        "Helvety does not warrant that encrypted data will remain recoverable if you lose unlock or recovery material, or that third-party browsers, OS passkey stores, or devices will always remain compatible.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by mandatory applicable law, Helvety and Caspar Camille Rubin (as sole proprietor) are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, goodwill, or business opportunities, arising from or related to the Service or these Terms, including permanent loss of your data due to lost keys or recovery material.",
        "To the fullest extent permitted by mandatory law, Helvety’s total aggregate liability for all claims arising out of or related to the Service or these Terms is limited to the greater of (a) CHF 100 or (b) the amounts you paid Helvety for the Service in the twelve (12) months before the claim (or CHF 0 if you used only a free offering).",
        "Nothing in these Terms excludes or limits liability that cannot be excluded or limited under mandatory Swiss law (or other mandatory consumer protections that apply to you), including liability for death or personal injury caused by negligence where such limitation is prohibited, or for fraud or willful misconduct.",
      ],
    },
    {
      heading: "Indemnity",
      paragraphs: [
        "You will defend and indemnify Helvety against claims, damages, and reasonable costs arising from your unlawful use of the Service, your encrypted content, or your breach of these Terms or the AUP, except to the extent caused by Helvety’s willful misconduct.",
      ],
    },
    {
      heading: "Governing law and disputes",
      paragraphs: [
        "These Terms are governed by the substantive laws of Switzerland, excluding conflict-of-law rules. Subject to mandatory consumer protections that may grant you other venues, exclusive jurisdiction lies with the courts of Basel-Stadt, Switzerland.",
        "Mandatory consumer rights that cannot be waived under applicable law remain unaffected.",
      ],
    },
    {
      heading: "Changes and contact",
      paragraphs: [
        "We may update these Terms by publishing a new version and requiring acceptance of the new version where required for continued use of encrypted features. Continued use after required acceptance constitutes agreement to the updated Terms.",
        "Contact: contact@helvety.com. Provider details: see Impressum.",
      ],
    },
  ],
};
