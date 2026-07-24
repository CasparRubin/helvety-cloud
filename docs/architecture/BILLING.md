# Billing (deferred — after P5 + P-legal)

**Not in foundation implementation.** Machinery only when charging.

## Principles

- Billing never touches vault keys or content.  
- Meter **plaintext counts** only: workspaces, projects, members, row counts, attachment bytes.  
- Subscription belongs to the **workspace** (owner pays).  
- **Stripe** Checkout + Customer Portal + webhooks → `subscriptions` table.  
- Free plan = entitlements in code; no Stripe customer until upgrade.  
- Webhook uses service role only to upsert billing rows — never to decrypt.

## Stack

| Piece | Choice |
|-------|--------|
| Processor | Stripe (no monthly fee; % when paid) |
| Auth | Stay on Supabase Auth (no Clerk required for billing) |
| Entitlements | Gate `/api/v1` mutations server-side |

## Suggested starter limits (tune later)

| | Free | Pro |
|--|------|-----|
| Projects | low cap | higher |
| Members | 1–2 | higher / seats |
| Issues/notes/contacts | soft caps | higher |

## Docs / UX

Clear free limits before signup and at paywall. No dark patterns. Consumer withdrawal rules → Swiss counsel (see [`LEGAL_REQUIREMENTS.md`](LEGAL_REQUIREMENTS.md)).

## Forbidden in P0–P5

Implementing Stripe, paywalls, or paid SaaS “for metering.”
