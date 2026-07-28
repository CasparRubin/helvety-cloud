# Legal requirements checklist

**Not legal advice.** This file is the product checklist for Helvety Cloud’s live legal pack and acceptance gates. Text was authored for the product (P-legal2) using public registry details for Helvety by Rubin; it is **not** a substitute for advice from a Swiss lawyer if you want attorney-certified documents.

## Why

- E2EE ⇒ Helvety **cannot** moderate or recover encrypted plaintext. Users must accept responsibility for content and keys.
- Helvety is a Swiss **Einzelfirma** (Helvety by Rubin). Personal liability risk remains; counsel may later advise GmbH.
- Honesty: never mislead about access, recovery, or certifications.
- Helvety does **not** offer the Services in the EU/EEA (no EU letterbox / Art. 27 representative). Users must acknowledge geographic eligibility before encryption setup.

## Document pack (live on helvety.com)

Shared Helvety legal pages cover Cloud and all other Helvety products:

| Document             | Location                      | Must cover                                                                                                 |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Impressum**        | https://helvety.com/impressum | Provider identity (Helvety by Rubin, Basel, UID, contact); abuse at `#abuse`                               |
| **Terms of Service** | https://helvety.com/terms     | All products; Cloud account/E2EE/workspaces; `#eligibility`, `#aup`, `#e2ee`, `#billing`; CH governing law |
| **Privacy Policy**   | https://helvety.com/privacy   | Controller; public tools vs Cloud account/ciphertext; `#subprocessors`; Swiss nDSG                         |

Source of truth for **body copy**: helvety monorepo `apps/web/app/{privacy,terms,impressum}/page.tsx`.

Source of truth for **Cloud gated versions**: `apps/web/lib/legal/policies.ts` (`CURRENT_POLICY_VERSIONS`, `LEGAL_EXTERNAL_HREFS`). Bump versions when helvety.com gated sections change materially.

Old Cloud routes `/legal/*` redirect permanently to the matching helvety.com URLs.

## Signup gates (engineering)

Before encryption setup completes, require active accept and **store versions + timestamps** (plaintext OK):

1. ToS
2. Privacy Policy
3. AUP (`/terms#aup`)
4. E2EE acknowledgment (`/terms#e2ee`)
5. Geographic eligibility (`/terms#eligibility`; not located in EU/EEA)

Current gated versions live in `apps/web/lib/legal/policies.ts`. `PUT /api/v1/me/crypto` rejects without current acceptances. Linked documents open on helvety.com in a new tab.

## Honesty rules (always)

- Do not claim Helvety can read or restore encrypted content.
- Do not invent compliance badges.
- Free limits stated clearly.
- Marketing must match [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md).
- Legal pack must not imply account closure wipes shared workspaces for remaining members (solo-member wipe; soft-leave shared memberships).

## Regimes

Swiss FADP (nDSG) primary. Services not offered in the EU/EEA. Where mandatory law elsewhere applies in a specific case, follow those obligations. Consumer digital-service rules where mandatory; DSA if applicable later.

## Status

**P-legal2** production pack + acceptance gates are live (P-legal drafts superseded). Legal body copy is unified on helvety.com. Stripe Free/Pro Workspace/Capacity Increase live (**P6f** / **P12**; see [`BILLING.md`](BILLING.md)). Optional counsel review is recommended for risk reduction but is **not** a product gate.

See [`ROADMAP.md`](ROADMAP.md).
