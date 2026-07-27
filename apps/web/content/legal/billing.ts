import type { LegalDocument } from "./types";

export const billingDoc: LegalDocument = {
  slug: "billing",
  title: "Billing terms",
  versionLabel: "2026-07-27-v6",
  sections: [
    {
      heading: "Status",
      paragraphs: [
        "Helvety Cloud offers a free plan and a paid Pro Workspace plan per workspace, processed through Stripe, plus an optional Capacity Increase add-on that raises all paid limits together. Nothing is charged unless a workspace owner explicitly starts Checkout (where the price is shown before any charge) or changes paid add-ons.",
        "Any discounts are applied through Stripe (for example a promotion code at Checkout). Helvety does not issue separate in-app discount or complimentary codes.",
        "These terms do not themselves create an obligation to purchase. The free plan remains usable within its stated limits without a payment method.",
      ],
    },
    {
      heading: "Free plan",
      paragraphs: [
        "The free plan applies fair-use limits per workspace (for example counts of projects, members, tasks per project, notes, and contacts). File uploads and document storage are not available on the free plan, including in free Personal workspaces. Current limits are shown in the product where they apply, before a limit blocks an action, not after payment.",
        "Each account may own one free-tier workspace (the Personal workspace). Additional owned workspaces require Pro Workspace access for that workspace.",
        "If a paid Pro Workspace ends and you would then own more than one free-tier workspace, Helvety may soft-lock the overflow workspace(s): existing encrypted content stays available to open, edit, download, export, and delete, but creating new resources in that workspace is paused until you upgrade it to Pro Workspace or reduce owned free workspaces back within the allowance. Helvety does not delete ciphertext or withhold wrapped keys solely because a workspace is soft-locked.",
        "Helvety may change free limits with notice in the product. Continued use after a change means you accept the updated limits. Lowered caps do not delete your data; new creates may be blocked until you are under the new cap or upgrade.",
      ],
    },
    {
      heading: "Paid plans and add-ons",
      paragraphs: [
        "Subscriptions are workspace-scoped: the workspace owner pays for that workspace’s Pro Workspace plan and any add-ons on that workspace.",
        "Pro Workspace includes higher operational limits and encrypted file and document storage for that workspace, within the storage, per-file size, and per-task file limits shown in the product. Uploaded files are end-to-end encrypted on your device; Helvety stores ciphertext and operational size meters only and cannot decrypt file contents.",
        "Capacity Increase adds one extra bundle of capacity each time you buy it. Each pack adds 10 projects, 500 tasks per project, 250 notes, 250 contacts, 10 members, and 2.5 GiB encrypted file storage. Capacity Increase requires an active Pro Workspace subscription on that workspace.",
        "Prices, billing intervals (including annual Pro billing when offered), renewals, taxes, and any Stripe-applied discount are shown at Stripe Checkout or in the billing portal. Unless stated otherwise, subscriptions renew automatically until cancelled.",
        "You may cancel renewal at any time in the Stripe billing portal (available from workspace billing settings); access to paid limits continues through the paid period already purchased unless stated otherwise. No cancellation fees, no retention tricks. Free limits and, where applicable, soft-lock create gates may then apply.",
        "Invoices and payment processing use Stripe (see Subprocessors). Helvety never needs encrypted plaintext or raw encryption keys for billing. Meters use plaintext operational counts and ciphertext byte sizes only.",
      ],
    },
    {
      heading: "Consumer withdrawal",
      paragraphs: [
        "If mandatory consumer law grants you a withdrawal right for digital services, Helvety will honor that right as required. Where you expressly request immediate performance of a digital service and acknowledge loss of withdrawal after performance begins, Helvety may rely on that acknowledgment where permitted by law.",
      ],
    },
    {
      heading: "Failed payments and soft-lock",
      paragraphs: [
        "If a paid plan is active and payment fails, Helvety may retry charges and may end paid entitlements after notice so free-plan limits apply. If that leaves you over the free owned-workspace allowance, overflow workspaces may be soft-locked as described under Free plan: existing content remains accessible; new creates are paused. Ciphertext may be retained or deleted according to account closure and retention practices in the Privacy Policy. Helvety still cannot decrypt it.",
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
