# Legal requirements checklist

**Not legal advice.** This file is the product checklist for Helvety Cloud’s live legal pack. Text was authored for the product (P-legal2) using public registry details for Helvety by Rubin; it is **not** a substitute for advice from a Swiss lawyer if you want attorney-certified documents.

## Why

- E2EE ⇒ Helvety **cannot** moderate or recover encrypted plaintext. Users must accept responsibility for content and keys.  
- Helvety is a Swiss **Einzelfirma** (Helvety by Rubin). Personal liability risk remains; counsel may later advise GmbH.  
- Honesty: never mislead about access, recovery, or certifications.

## Document pack (live, P-legal2)

| Document | Location | Must cover |
|----------|----------|------------|
| **Impressum** | `/legal/impressum` | Provider identity (Helvety by Rubin, Basel, UID, contact) |
| **Terms of Service** | `/legal/terms` | Account, license, AUP, suspension, liability limits, indemnity, CH governing law |
| **Privacy Policy** | `/legal/privacy` | Controller; account vs ciphertext; processors; rights; transfers |
| **Acceptable Use Policy** | `/legal/aup` | Illegal content, abuse; enforcement without reading encrypted |
| **E2EE / zero-access notice** | `/legal/e2ee` | No decrypt; no recovery; lost keys = permanent loss |
| **Billing terms** | `/legal/billing` | Free use now; paid plans when enabled; Stripe never sees encrypted plaintext |
| **Subprocessors list** | `/legal/subprocessors` | Living list with regions |
| **DPA / AVV** | Later | When selling B2B |

Source of truth: `apps/web/content/legal/*` + `apps/web/lib/legal/policies.ts` versions.

## Signup gates (engineering)

Before encryption setup completes, require active accept and **store versions + timestamps** (plaintext OK):

1. ToS  
2. Privacy Policy  
3. AUP  
4. E2EE acknowledgment  

Current versions: `2026-07-24-v1` (bump on material edits). `PUT /api/v1/me/crypto` rejects without current acceptances.

## Honesty rules (always)

- Do not claim Helvety can read or restore encrypted content.  
- Do not invent compliance badges.  
- Free limits stated clearly.  
- Marketing must match [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md).

## Regimes

Swiss FADP (nDSG); GDPR/UK GDPR principles when offering to those users; consumer digital-service rules where mandatory; DSA if applicable later.

## Status

**P-legal** = drafts + gates. **P-legal2** = production pack + acceptance (no draft banners). Stripe workspace billing landed in **P6f** (see [`BILLING.md`](BILLING.md)). Optional counsel review is recommended for risk reduction but is **not** a product gate after P-legal2.

See [`ROADMAP.md`](ROADMAP.md) §7 and P-legal2 playbook.
