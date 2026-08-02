# Billing (P6f + P12)

Stripe workspace subscriptions with plaintext entitlements and one recurring
Capacity Increase add-on. Charges only happen when a workspace member completes
Stripe Checkout or changes paid add-ons. Discounts (including 100% off) are
owned by Stripe coupons / promotion codes, not by Helvety app tables.

## Principles

- Billing never touches encryption keys or content.
- Meter **plaintext counts** only: workspaces, projects, members, row counts
  (including boards), ciphertext byte sizes, attachment link counts.
  Shapes per board are catalogued for honesty and enforced in the client
  (node graphs live in ciphertext).
- Subscription belongs to the **workspace** (any member may manage billing).
- Free-tier “owned workspace” slots are attributed via `workspaces.created_by` (not a privilege).
- **Stripe** Checkout + Customer Portal + webhooks → `subscriptions`.
- Free plan = entitlements in code; no Stripe customer until upgrade.
- Webhook uses service role only for billing rows, never to decrypt.

## Stack

| Piece         | Choice                                                   |
| ------------- | -------------------------------------------------------- |
| Processor     | Stripe (no monthly fee; % when paid)                     |
| Auth          | Supabase Auth (no Clerk)                                 |
| Entitlements  | Gated in `/api/v1` create mutations, server-side         |
| Limit catalog | `apps/web/lib/billing/entitlements.ts` (tune + redeploy) |
| Discounts     | Stripe coupons / promotion codes (Dashboard)             |

## Implementation map

| Piece               | Where                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| Tables              | `subscriptions`, `billing_events` (`supabase/schemas/16_billing.sql`)              |
| Plans/limits/addons | `apps/web/lib/billing/entitlements.ts`                                             |
| API gates           | `apps/web/lib/api/entitlements.ts` + create paths in `/api/v1`                     |
| Member-cap RPC      | `public.workspace_seat_usage`                                                      |
| Billing endpoints   | `GET …/billing`, `POST …/checkout`, `POST …/sync`, `POST …/portal`, `PUT …/addons` |
| Webhook             | `POST /api/webhooks/stripe`                                                        |

## Plans and limits (tune in code)

Defaults in `PLAN_LIMITS` (adjust anytime; lowering caps grandfather existing rows; create gates only):

| Meter                             | Free | Pro base |
| --------------------------------- | ---: | -------: |
| Owned free-tier workspaces / user |    1 |      n/a |
| Soft owned Pro ceiling / user     |  n/a |       50 |
| Projects / workspace              |    2 |       25 |
| Members (incl. pending invites)   |    3 |       25 |
| Tasks / **project**               |   50 |     1000 |
| Notes / workspace                 |   25 |      500 |
| Contacts / workspace              |   25 |      500 |
| Comments + replies / workspace    |   50 |     1000 |
| Boards / workspace                |    1 |       25 |
| Shapes (nodes) / **board**        |   20 |      400 |
| Files / task                      |    0 |        5 |
| File storage (ciphertext bytes)   |    0 |    5 GiB |
| Max upload size                   |    0 |   25 MiB |

**Boards:** board **row** creates are server-gated like notes (`boards` meter +
soft-lock). **Shapes per board** (React Flow nodes, not edges) are catalogued
for pricing honesty and enforced **client-side only**, because node graphs live
in `encrypted_blob` and billing meters plaintext counts only.

**2nd+ owned workspace:** create from the app switcher (New Pro workspace). The
workspace is created with Pro intent, then Stripe Checkout opens for that
workspace. You can also upgrade an existing free workspace from Workspace
settings → Billing. Stripe promotion codes (including 100% off) can be entered
at Checkout. Each paid workspace stands alone. Owning one Pro does not silently
raise free slots.

**Soft-lock overflow:** when Pro ends and the account attributed via `created_by` would then have more than one non-Pro workspace, Helvety stamps `subscriptions.free_overflowed_at` on the lapsed workspace and soft-locks overflow workspaces (newest tags first; lock count = `nonProOwned − 1`). Soft-lock evaluation loads the full creator-owned set via service role after membership proof (user JWT alone cannot see sibling owned workspaces). Soft-locked workspaces keep read/edit/delete/export/decrypt; only net-new creates return `limit_exceeded`. Locks clear automatically when the workspace returns to Pro or the attributed account is back within one free workspace.

**Capacity Increase (Pro + Stripe only):** add-on quantity lives on the same
subscription. Effective limit =

```text
catalog[plan][meter] + (capacity_quantity × pack_delta)
```

## Display prices

Marketing amounts on `/pricing` come from `DISPLAY_PRICES` in
`entitlements.ts` (must match live Stripe Prices):

| Offering | Amount | Interval |
| -------- | ------ | -------- |
| Free Workspace | CHF 0 | n/a |
| Pro Workspace | CHF **250** | yearly |
| Capacity Increase | CHF **99** | yearly |

## Stripe discounts

Create coupons and promotion codes in the Stripe Dashboard. Checkout enables
`allow_promotion_codes`, so members can enter a code during upgrade. A 100% off
coupon still creates a normal Pro subscription at zero cost. It is not an
app-defined unlimited mode. Prefer finite `max_redemptions` and/or expiry on
live promotion codes; do not leave unlimited forever codes active.

## Stripe shape

- One subscription per workspace.
- Line items: Pro Workspace base (qty 1) + zero or more Capacity Increase packs (qty ≥ 1).
- Use `STRIPE_PRICE_PRO_WORKSPACE_YEARLY`.
- Capacity Increase env var: `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY`.

### Live catalog (helvety-cloud Stripe account)

| Item | ID | Notes |
| ---- | -- | ----- |
| Product Pro Workspace | `prod_UxgHstlS4NRbqH` | Yearly |
| Price Pro Workspace | `price_1TxkusKB4gmrwRzWBXSg80gl` | CHF 250 / year · lookup `pro_workspace_yearly` |
| Product Capacity Increase | `prod_UxgQNtZZ2d74Jv` | Yearly add-on |
| Price Capacity Increase | `price_1Txl3hKB4gmrwRzWwSNDqHGJ` | CHF 99 / year · lookup `capacity_increase_yearly` |
| Portal configuration | `bpc_1TxndqKB4gmrwRzWocwv77pt` | Default |
| Webhook | `we_1TxnKTKB4gmrwRzW8Cfps8uq` | `https://helvety.cloud/api/webhooks/stripe` |

## Environment (server-only unless NEXT_PUBLIC_)

| Var                                                   | Use                                            |
| ----------------------------------------------------- | ---------------------------------------------- |
| `STRIPE_SECRET_KEY`                                   | Server Stripe client                           |
| `STRIPE_WEBHOOK_SECRET`                               | Webhook signature verification                 |
| `STRIPE_PRICE_PRO_WORKSPACE_YEARLY`                   | Pro Workspace yearly Price                     |
| `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY` | Capacity Increase yearly Price                 |
| `SUPABASE_SERVICE_ROLE_KEY`                           | Webhook, account deletion, attachment Storage ONLY |
| `NEXT_PUBLIC_APP_URL`                                 | Checkout success/cancel + portal return URLs   |

## Ops checklist

1. Stripe Dashboard: Product `Helvety Cloud - Pro Workspace` + **yearly** Price → set `STRIPE_PRICE_PRO_WORKSPACE_YEARLY` (live: `price_1TxkusKB4gmrwRzWBXSg80gl`).
2. Product `Helvety Cloud - Pro Workspace - Capacity Increase` + **yearly** Price → set `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY` (live: `price_1Txl3hKB4gmrwRzWwSNDqHGJ`).
3. Webhook endpoint: `https://helvety.cloud/api/webhooks/stripe` with `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`. Save the endpoint secret as `STRIPE_WEBHOOK_SECRET`. Use a dedicated Cloud endpoint; do not reuse another product’s Stripe webhook.
   - **Must not redirect.** Stripe does not follow 308/301 on webhook delivery. Keep Vercel primary on apex `helvety.cloud` (www → apex). Point the webhook at **apex**, never at a host that 308s. After Checkout, the app also calls `POST …/billing/sync` on `?billing=success` so a missed webhook cannot leave a paid workspace on Free.
4. Customer Portal: cancel at period end, payment method update, invoice history.
   Set business profile ToS/privacy URLs in the Dashboard. Capacity packs are set
   in-app (`PUT …/addons`); Portal may also list Capacity for quantity edits.
5. Vercel: set env vars from `.env.example` (Supabase + Stripe + `NEXT_PUBLIC_APP_URL=https://helvety.cloud`). Confirm Price IDs match the live catalog table above.
6. Optional: create Stripe coupons / promotion codes for testing or offers (finite redemptions).

## Docs / UX

Free limits are stated in the product before a gate blocks an action and in
`https://helvety.com/terms#billing`. Cancel is one click in the Portal for paid
subs. No dark patterns. **Capacity Increase:** Workspace settings → Billing →
Add-ons → set pack quantity → **Update** (`PUT …/billing/addons`, prorated on
Stripe). **Manage billing** opens the Customer Portal for cancel, payment
method, and invoices.

## Capacity Increase bundle

Each purchased Capacity Increase pack adds:

- 10 projects
- 500 tasks per project
- 250 notes
- 250 contacts
- 500 comments and replies
- 10 boards
- 200 shapes per board
- 10 members
- 2.5 GiB encrypted file storage
