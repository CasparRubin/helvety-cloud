import type { LegalDocument } from "./types";

export const privacyDoc: LegalDocument = {
  slug: "privacy",
  title: "Privacy Policy",
  versionLabel: "2026-07-26-v1",
  sections: [
    {
      heading: "Controller",
      paragraphs: [
        "Controller of personal data processed for Helvety Cloud: Helvety by Rubin (Caspar Camille Rubin), Holeestrasse 116, 4054 Basel, Switzerland. UID CHE-356.266.592.",
        "Contact for privacy requests: contact@helvety.com.",
      ],
    },
    {
      heading: "Scope",
      paragraphs: [
        "This Privacy Policy explains how Helvety processes personal data when you use helvety.cloud. It applies under the Swiss Federal Act on Data Protection (FADP / nDSG). If you are in the EEA/UK and Helvety offers the Service to you, Helvety also aims to respect applicable GDPR/UK GDPR principles for the personal data Helvety actually processes.",
        "Vault ciphertext is opaque to Helvety. Helvety is not a controller of vault plaintext it cannot access.",
      ],
    },
    {
      heading: "Data Helvety processes (account / metadata)",
      paragraphs: [
        "Email address and authentication metadata (for example OTP delivery via Supabase Auth).",
        "Profile and membership records (user id, workspace membership roles, timestamps).",
        "Public cryptographic material needed for the product (for example user public keys) and wrapped or encrypted blobs that Helvety cannot decrypt.",
        "Policy acceptance records (which policy versions you accepted and when).",
        "Technical logs reasonably needed to operate and secure the Service (for example IP addresses in hosting/auth logs, request metadata).",
        "Billing metadata when paid plans are enabled (for example subscription status and meter counts). Billing never includes vault plaintext or raw vault keys.",
      ],
    },
    {
      heading: "Data Helvety cannot access",
      paragraphs: [
        "Vault content ciphertext is opaque to Helvety. Staff, database administrators, and privileged database roles cannot decrypt titles, bodies, or other vault plaintext.",
        "Helvety does not receive PRF output, unlock keys, recovery key plaintext, or raw private keys. Helvety cannot restore vault content if you lose unlock or recovery material.",
      ],
    },
    {
      heading: "Purposes and legal bases",
      paragraphs: [
        "Provide and secure the Service (contract / contract preparation; legitimate interests in secure operation).",
        "Authenticate you and manage your account (contract).",
        "Record policy acceptances (legal obligation / contract / legitimate interests in proving consent and terms acceptance).",
        "Communicate service-related notices (contract / legitimate interests).",
        "Comply with law and respond to lawful requests limited to data Helvety holds (legal obligation).",
        "Billing and accounting when paid plans apply (contract / legal obligation).",
      ],
    },
    {
      heading: "Processors",
      paragraphs: [
        "Helvety uses processors listed in the Subprocessors page (including Supabase for auth/database in Zurich, Vercel for hosting, email delivery used for auth OTPs, and Stripe when billing is enabled). Processors act on Helvety’s instructions for the Service.",
      ],
    },
    {
      heading: "International transfers",
      paragraphs: [
        "Primary database and auth for this Service are hosted in the EU (Zurich / eu-central-2). Hosting and email tooling may involve processing in other regions depending on vendor configuration. Where required, Helvety relies on appropriate transfer mechanisms offered by those vendors (for example standard contractual clauses) and contractual safeguards.",
      ],
    },
    {
      heading: "Retention",
      paragraphs: [
        "Account and membership data are kept while your account is active and for a reasonable period afterward as needed for security, dispute handling, and legal retention.",
        "Ciphertext and related vault metadata are kept while associated with your account/workspaces or until deleted via the Service or account closure processes.",
        "Policy acceptance records are retained to evidence which terms applied.",
        "Logs are retained for a limited operational period unless a longer period is required for security or legal reasons.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Depending on applicable law, you may have rights to access, rectification, erasure, restriction, objection, and data portability for personal data Helvety processes about you.",
        "To exercise rights, email contact@helvety.com. Helvety may need to verify your identity. Helvety cannot produce vault plaintext it never held.",
        "Erasure of account data does not recreate lost vault keys. Deleting ciphertext removes stored blobs; it does not mean Helvety ever held plaintext.",
        "You may lodge a complaint with the Swiss FDPIC or another competent supervisory authority where applicable.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "The Service is not directed to children under 16. Do not use the Service if you are below the age required to consent to data processing and contracts in your jurisdiction.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update this Privacy Policy by publishing a new version. Material changes that affect signup-gated acceptance will use a new version string you must accept before continued vault setup or use where gated.",
      ],
    },
  ],
};
