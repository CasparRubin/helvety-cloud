# Billing (P6f + P12)

Stripe workspace subscriptions with plaintext entitlements, one recurring
Capacity Increase add-on, and admin discount / complimentary codes. Charges
only happen when a workspace
owner completes Stripe Checkout (unless a **100%** code grants Pro with no card).

## Principles (unchanged)

- Billing never touches encryption keys or content.
- Meter **plaintext counts** only: workspaces, projects, members, row counts,
  ciphertext byte sizes, attachment link counts.
- Subscription belongs to the **workspace** (owner pays).
- **Stripe** Checkout + Customer Portal + webhooks → `subscriptions`.
- Free plan = entitlements in code; no Stripe customer until upgrade.
- **100% discount codes** = DB comp grants (`billing_source=comp`); no Stripe.
- Webhook / redeem API use service role only for billing rows, never to decrypt.

## Stack

| Piece | Choice |
|-------|--------|
| Processor | Stripe (no monthly fee; % when paid) |
| Auth | Supabase Auth (no Clerk) |
| Entitlements | Gated in `/api/v1` create mutations, server-side |
| Limit catalog | `apps/web/lib/billing/entitlements.ts` (tune + redeploy) |
| Discount codes | `discount_codes` table (Dashboard / SQL admin) |

## Implementation map

| Piece | Where |
|-------|-------|
| Tables | `subscriptions`, `billing_events`, `discount_codes` (`supabase/schemas/16_billing.sql`) |
| Plans/limits/addons | `apps/web/lib/billing/entitlements.ts` |
| Discount redeem | `apps/web/lib/billing/discount-codes.ts` + `POST …/billing/discount` |
| API gates | `apps/web/lib/api/entitlements.ts` + create paths in `/api/v1` |
| Seat gate RPC | `public.workspace_seat_usage` |
| Billing endpoints | `GET …/billing`, `POST …/checkout`, `POST …/portal`, `POST …/discount`, `PUT …/addons` |
| Webhook | `POST /api/webhooks/stripe` (never overwrites `billing_source=comp`) |

## Plans and limits (tune in code)

Defaults in `PLAN_LIMITS` (adjust anytime; lowering caps grandfather existing rows; create gates only):

| Meter | Free | Pro base |
|-------|-----:|---------:|
| Owned free-tier workspaces / user | 2 | n/a |
| Soft owned Pro ceiling / user | n/a | 50 |
| Projects / workspace | 1 | 25 |
| Members (incl. pending invites) | 4 | 25 |
| Tasks / **project** | 50 | 500 |
| Notes / workspace | 50 | 500 |
| Contacts / workspace | 50 | 500 |
| Files / task | 0 | 5 |
| File storage (ciphertext bytes) | 0 | 5 GiB |
| Max upload size | 0 | 25 MiB |

**3rd+ owned workspace:** only by creating/upgrading that workspace to Pro (Checkout) or redeeming a 100% code / admin comp. Each paid (or gifted) workspace stands alone. Owning one Pro does not silently raise free slots.

**Soft-lock overflow:** when Pro or complimentary access ends and the owner would then have more than two non-Pro workspaces, Helvety stamps `subscriptions.free_overflowed_at` on the lapsed workspace and soft-locks overflow workspaces (newest tags first; lock count = `nonProOwned − 2`). Soft-locked workspaces keep read/edit/delete/export/decrypt; only net-new creates (projects, tasks, notes, contacts, invites, accept, uploads, new attachment links, further free workspace creation) return `limit_exceeded`. Ciphertext and wrapped keys are never deleted or withheld. Locks clear automatically when the workspace returns to Pro or the owner is back within two free workspaces.

**Capacity Increase (Pro + Stripe only):** add-on quantity lives on the same
subscription. Effective limit =

```text
catalog[plan][meter] + (capacity_quantity × pack_delta)
```

Complimentary (`unmetered`) workspaces skip countable caps (upload max size still uses Pro catalog).

## Discount codes

Admin inserts rows into `discount_codes` (service role / Dashboard only; no client SELECT of the catalog):

| Column | Meaning |
|--------|---------|
| `code` | Uppercase unique token (long / unguessable) |
| `percent_off` | 1–100 |
| `active` / `expires_at` / `max_redemptions` | Validity |
| `note` | Admin memo |
| `stripe_coupon_id` | Cached Stripe Coupon for 1–99% |

**Redeem** (`POST …/billing/discount`, owner-only):

- **1–99%**: snapshot percent onto `subscriptions`, ensure Stripe Coupon, start Checkout with discount (Pro + future addon line items inherit subscription coupon).
- **100%**: upsert `plan=pro`, `status=active`, `billing_source=comp`, `unmetered=true`, Stripe ids null. No card.

**Remove** (`DELETE …/billing/discount`, owner-only): clears `discount_code_id` / percent. Complimentary grants return the workspace to Free (unmetered off). Decrements `redemption_count` so the code can be reused. One code at a time per workspace via the API; admins may also gift by editing `subscriptions` in SQL.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook + redeem writes ONLY |
| `NEXT_PUBLIC_APP_URL` | Checkout success/cancel + portal return URLs |

## Ops checklist

1. Stripe Dashboard: Product `Helvety Cloud - Pro Workspace` + **yearly** Price → `STRIPE_PRICE_PRO_WORKSPACE_YEARLY`.
2. Product `Helvety Cloud - Pro Workspace - Capacity Increase` + **yearly** Price → `STRIPE_PRICE_PRO_WORKSPACE_CAPACITY_INCREASE_YEARLY`.
3. Webhooks: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`.
4. Enable Customer Portal (cancel + payment method).
5. Create discount codes in Supabase SQL, e.g.

```sql
insert into public.discount_codes (code, percent_off, note)
values ('JDKFLJK3LJE2JKL', 20, 'Pilot 20%');

insert into public.discount_codes (code, percent_off, note)
values ('COMPANION100GIFT', 100, 'Full complimentary Pro');
```

## Docs / UX

Free limits are stated in the product before a gate blocks an action and in
`/legal/billing`. Complimentary workspaces show as Pro without a Stripe portal.
Cancel is one click in the Portal for paid subs. No dark patterns.

## Capacity Increase bundle

Each purchased Capacity Increase pack adds:

- 10 projects
- 100 tasks per project
- 100 notes
- 100 contacts
- 5 seats
- 5 GiB encrypted file storage
- 5 files per task
