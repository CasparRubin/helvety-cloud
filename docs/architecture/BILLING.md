# Billing (P6f — implemented)

Stripe workspace subscriptions with plaintext entitlements. Implemented in
P6f; charges only happen when a workspace owner completes Stripe Checkout.

## Principles (unchanged)

- Billing never touches vault keys or content.  
- Meter **plaintext counts** only: workspaces, projects, members, row counts.  
- Subscription belongs to the **workspace** (owner pays).  
- **Stripe** Checkout + Customer Portal + webhooks → `subscriptions` table.  
- Free plan = entitlements in code; no Stripe customer until upgrade.  
- Webhook uses service role only to upsert billing rows — never to decrypt.

## Stack

| Piece | Choice |
|-------|--------|
| Processor | Stripe (no monthly fee; % when paid) |
| Auth | Supabase Auth (no Clerk) |
| Entitlements | Gated in `/api/v1` create mutations, server-side |

## Implementation map

| Piece | Where |
|-------|-------|
| Tables | `subscriptions` (PK `workspace_id`, plan/status/Stripe ids), `billing_events` (webhook audit + idempotency) — `supabase/schemas/16_billing.sql` |
| Plans/limits in code | `apps/web/lib/billing/entitlements.ts` |
| API gates | `apps/web/lib/api/entitlements.ts` + create paths in `/api/v1` routes |
| Seat gate RPC | `public.workspace_seat_usage` (SECURITY DEFINER; members + active invitees; counts only) |
| Billing endpoints | `GET /api/v1/workspaces/:id/billing` (member), `POST …/billing/checkout` and `POST …/billing/portal` (owner only) |
| Webhook | `POST /api/webhooks/stripe` — signature-verified; the **only** service-role consumer (`apps/web/lib/supabase/service-role.ts`) |
| Upgrade UX | Workspace sharing dialog (plan, seats, Upgrade / Manage billing) |

## Plans and limits (tune in code)

| Per workspace | Free | Pro |
|---------------|------|-----|
| Owned workspaces (per user) | 2 | 10 |
| Projects | 5 | 100 |
| Members (incl. pending invites) | 2 | 25 |
| Issues | 100 | 10,000 |
| Notes | 50 | 5,000 |
| Contacts | 50 | 5,000 |

Gates apply to **creates only** (net-new rows / invites / accepts) and return
`limit_exceeded` (403). Updates, soft-deletes, reads, seal/cancel are never
gated. Missing `subscriptions` row or any non-`active`/`trialing` status
(`past_due`, `canceled`, `unpaid`, …) resolves to free — no silent paid plan.

## Stripe data hygiene

Stripe receives only: billing email, `workspace_id` in metadata /
`client_reference_id`, and subscription objects. Never vault keys,
ciphertext, titles, or any vault content.

## Environment (server-only unless NEXT_PUBLIC_)

| Var | Use |
|-----|-----|
| `STRIPE_SECRET_KEY` | Server Stripe client |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID of the "Helvety Pro" monthly price |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook billing upserts ONLY |
| `NEXT_PUBLIC_APP_URL` | Checkout success/cancel + portal return URLs |

## Ops checklist

1. Stripe Dashboard (test mode first): create Product "Helvety Pro" + monthly Price → set `STRIPE_PRICE_PRO_MONTHLY`.
2. Dev webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; prod: Dashboard endpoint for `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed` → set `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal (cancel + payment method update) in Stripe Dashboard.
4. Set all env vars on Vercel; keep service role + Stripe keys out of the client bundle.

## Docs / UX

Free limits are stated in the product before a gate blocks an action and in
`/legal/billing`. No dark patterns: cancel is one click in the Portal.
Consumer withdrawal rules → Swiss counsel (see
[`LEGAL_REQUIREMENTS.md`](LEGAL_REQUIREMENTS.md)).
