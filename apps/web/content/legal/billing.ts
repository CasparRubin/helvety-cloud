import type { LegalDocument } from "./types";

export const billingDoc: LegalDocument = {
  slug: "billing",
  title: "Billing terms",
  versionLabel: "2026-07-24-v1",
  sections: [
    {
      heading: "Status",
      paragraphs: [
        "Helvety Cloud currently operates without paid Stripe charges. These Billing terms describe how free use works now and how paid plans will work when enabled.",
        "These terms do not themselves create an obligation to purchase. Paid plans, if offered, will be activated in the product with clear prices before any charge.",
      ],
    },
    {
      heading: "Free use",
      paragraphs: [
        "While no paid plan is required, Helvety may apply fair-use and technical limits (for example rate limits, storage, or workspace counts) to protect the Service. Limits will be stated in the product when applied.",
        "Helvety may change free limits with notice in the product. Continued use after a change means you accept the updated limits.",
      ],
    },
    {
      heading: "Paid plans (when enabled)",
      paragraphs: [
        "Subscriptions are expected to be workspace-scoped: the workspace owner (or designated billing party) pays for that workspace’s plan.",
        "Prices, billing intervals, renewals, and taxes will be shown at checkout. Unless stated otherwise, subscriptions renew automatically until cancelled.",
        "You may cancel renewal in the billing portal or account settings when available; access continues through the paid period already purchased unless stated otherwise.",
        "Invoices and payment processing will use Stripe (or a successor listed under Subprocessors). Helvety never needs vault plaintext or raw vault keys for billing. Meters use plaintext operational counts only (for example workspace or project counts).",
      ],
    },
    {
      heading: "Consumer withdrawal",
      paragraphs: [
        "If mandatory consumer law grants you a withdrawal right for digital services, Helvety will honor that right as required. Where you expressly request immediate performance of a digital service and acknowledge loss of withdrawal after performance begins, Helvety may rely on that acknowledgment where permitted by law.",
      ],
    },
    {
      heading: "Failed payments and suspension",
      paragraphs: [
        "If a paid plan is active and payment fails, Helvety may retry charges and may suspend paid features or the workspace after notice. Ciphertext may be retained or deleted according to account closure and retention practices in the Privacy Policy — Helvety still cannot decrypt it.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Billing questions: contact@helvety.com. Provider details: see Impressum.",
      ],
    },
  ],
};
