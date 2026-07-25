import type { LegalDocument } from "./types";

export const billingDoc: LegalDocument = {
  slug: "billing",
  title: "Billing terms",
  versionLabel: "2026-07-25-v1",
  sections: [
    {
      heading: "Status",
      paragraphs: [
        "Helvety Cloud offers a free plan and a paid Pro plan per workspace, processed through Stripe. Nothing is charged unless a workspace owner explicitly starts a Pro subscription at checkout, where the price is shown before any charge.",
        "These terms do not themselves create an obligation to purchase. The free plan remains usable within its stated limits without a payment method.",
      ],
    },
    {
      heading: "Free plan",
      paragraphs: [
        "The free plan applies fair-use limits per workspace (for example counts of projects, members, tasks, notes, and contacts). Current limits are shown in the product where they apply — before a limit blocks an action, not after payment.",
        "Helvety may change free limits with notice in the product. Continued use after a change means you accept the updated limits.",
      ],
    },
    {
      heading: "Paid plans",
      paragraphs: [
        "Subscriptions are workspace-scoped: the workspace owner pays for that workspace’s Pro plan.",
        "Prices, billing intervals, renewals, and taxes are shown at Stripe Checkout. Unless stated otherwise, subscriptions renew automatically until cancelled.",
        "You may cancel renewal at any time in the Stripe billing portal (available from the workspace sharing dialog); access to Pro limits continues through the paid period already purchased unless stated otherwise. No cancellation fees, no retention tricks.",
        "Invoices and payment processing use Stripe (see Subprocessors). Helvety never needs vault plaintext or raw vault keys for billing. Meters use plaintext operational counts only (for example workspace or project counts).",
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
