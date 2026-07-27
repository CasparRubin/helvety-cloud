# Billing (P6f + P12)

Stripe workspace subscriptions with plaintext entitlements and one recurring
Capacity Increase add-on. Charges only happen when a workspace owner completes
Stripe Checkout or changes paid add-ons. Discounts (including 100% off) are
owned by Stripe coupons / promotion codes, not by Helvety app tables.

## Principles

- Billing never touches encryption keys or content.
- Meter **plaintext counts** only: workspaces, projects, members, row counts,
  ciphertext byte sizes, attachment link counts.
- Subscription belongs to the **workspace** (owner pays).
- **Stripe** Checkout + Customer Portal + webhooks → `subscriptions`.
- Free plan = entitlements in code; no Stripe customer until upgrade.
- Webhook uses service role only for billing rows, never to decrypt.

## Stack

| Piece | Choice |
|-------|--------|
| Processor | Stripe (no monthly fee; % when paid) |
| Auth | Supabase Auth (no Clerk) |
| Entitlements | Gated in `/api/v1` create mutations, server-side |
| Limit catalog | `apps/web/lib/billing/entitlements.ts` (tune + redeploy) |
| Discounts | Stripe coupons / promotion codes (Dashboard) |

## Implementation map

| Piece | Where |
|-------|-------|
| Tables | `subscriptions`, `billing_events` (`supabase/schemas/16_billing.sql`) |
| Plans/limits/addons | `apps/web/lib/billing/entitlements.ts` |
| API gates | `apps/web/lib/api/entitlements.ts` + create paths in `/api/v1` |
| Seat gate RPC | `public.workspace_seat_usage` |
| Billing endpoints | `GET …/billing`, `POST …/checkout`, `POST …/portal`, `PUT …/addons` |
| Webhook | `POST /api/webhooks/stripe` |

## Plans and limits (tune in code)

Defaults in `PLAN_LIMITS` (adjust anytime; lowering caps grandfather existing rows; create gates only):

| Meter | Free | Pro base |
|-------|-----:|---------:|
| Owned free-tier workspaces / user | 1 | n/a |
| Soft owned Pro ceiling / user | n/a | 50 |
| Projects / workspace | 2 | 25 |
| Members (incl. pending invites) | 3 | 25 |
| Tasks / **project** | 50 | 1000 |
| Notes / workspace | 25 | 500 |
| Contacts / workspace | 25 | 500 |
| Files / task | 0 | 5 |
| File storage (ciphertext bytes) | 0 | 5 GiB |
| Max upload size | 0 | 25 MiB |

**2nd+ owned workspace:** only by creating/upgrading that workspace to Pro (Checkout). Each paid workspace stands alone. Owning one Pro does not silently raise free slots.

**Soft-lock overflow:** when Pro ends and the owner would then have more than one non-Pro workspace, Helvety stamps `subscriptions.free_overflowed_at` on the lapsed workspace and soft-locks overflow workspaces (newest tags first; lock count = `nonProOwned − 1`). Soft-locked workspaces keep read/edit/delete/export/decrypt; only net-new creates return `limit_exceeded`. Locks clear automatically when the workspace returns to Pro or the owner is back within one free workspace.

**Capacity Increase (Pro + Stripe only):** add-on quantity lives on the same
subscription. Effective limit =

```text
catalog[plan][meter] + (capacity_quantity × pack_delta)
```

## Stripe discounts

Create coupons and promotion codes in the Stripe Dashboard. Checkout enables
`allow_promotion_codes`, so owners can enter a code during upgrade. A 100% off
coupon still creates a normal Pro subscription at zero cost. It is not an
app-defined unlimited mode.

## Stripe shape

- One subscription per workspace.
- Line items: Pro Workspace base (qty 1) + zero or more Capacity Increase packs (qty ≥ 1).
- Use `STRIPE_PRICE_PRO_WORKSPACE_YEARLY`.
- Capacity Increase env var: `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY`.

## Environment (server-only unless NEXT_PUBLIC_)

| Var | Use |
|-----|-----|
| `STRIPE_SECRET_KEY` | Server Stripe client |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_PRO_WORKSPACE_YEARLY` | Preferred Pro Workspace price |
| `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY` | Capacity Increase yearly Price |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook, account deletion, attachment Storage ONLY |
| `NEXT_PUBLIC_APP_URL` | Checkout success/cancel + portal return URLs |

## Ops checklist

1. Stripe Dashboard: Product `Helvety Cloud - Pro Workspace` + **yearly** Price → `STRIPE_PRICE_PRO_WORKSPACE_YEARLY`.
2. Product `Helvety Cloud - Pro Workspace - Capacity Increase` + **yearly** Price → `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY`.
3. Webhooks: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`.
4. Enable Customer Portal (cancel + payment method).
5. Optional: create Stripe coupons / promotion codes for testing or offers.

## Docs / UX

Free limits are stated in the product before a gate blocks an action and in
`/legal/billing`. Cancel is one click in the Portal for paid subs. No dark patterns.

## Capacity Increase bundle

Each purchased Capacity Increase pack adds:

- 10 projects
- 500 tasks per project
- 250 notes
- 250 contacts
- 10 members
- 2.5 GiB encrypted file storage
