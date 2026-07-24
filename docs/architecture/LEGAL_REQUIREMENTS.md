# Legal requirements checklist

**Not legal advice.** Final ToS / Privacy / AUP / billing text must be **reviewed by a Swiss lawyer** before public signup or billing. This file lists what product and counsel must cover.

## Why

- E2EE ⇒ Helvety **cannot** moderate or recover vault plaintext. Users must accept responsibility for content and keys.  
- Helvety is a Swiss **Einzelfirma** — personal liability risk; contracts help but counsel may advise GmbH later.  
- Honesty: never mislead about access, recovery, or certifications.

## Document pack (P-legal)

| Document | Must cover |
|----------|------------|
| **Impressum** | Provider identity (name, address, contact, UID if any) |
| **Terms of Service** | Account, license, AUP reference, suspension, liability limits (as enforceable), indemnity, governing law (typically CH), what service is / is not |
| **Privacy Policy** | Controller ID; data Helvety **does** process (email, auth, membership, billing metadata) vs **cannot** access (vault ciphertext); processors (Supabase, Vercel, Stripe, email); rights; transfers |
| **Acceptable Use Policy** | Illegal content, abuse; enforcement = account/ciphertext deletion without reading content |
| **E2EE / zero-access notice** | No decrypt; no recovery; lost keys = permanent loss; compelled disclosure limited to metadata/ciphertext held |
| **Billing terms** | Plans, renewals, cancel, taxes; digital service withdrawal per counsel |
| **Subprocessors list** | Living list with regions |
| **DPA / AVV** | When selling B2B |

## Signup gates (engineering)

Before vault setup completes, require active accept and **store versions + timestamps** (plaintext OK):

1. ToS  
2. Privacy Policy  
3. AUP  
4. E2EE acknowledgment  

## Honesty rules (always)

- Do not claim Helvety can read or restore vault content.  
- Do not invent compliance badges.  
- Free limits stated clearly.  
- Marketing must match [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md).

## Regimes (counsel tracks)

Swiss FADP (nDSG), GDPR if EU users, EU consumer digital service rules, DSA if applicable, future CH/EU platform rules.

## Blockers

No public marketing signup and no Stripe charges until P-legal docs are live and gated.

See [`ROADMAP.md`](ROADMAP.md) §7 and P-legal playbook.
