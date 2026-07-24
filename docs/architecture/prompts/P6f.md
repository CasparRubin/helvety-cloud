# P6f — Billing

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6f.md @docs/architecture/BILLING.md

Implement P6f only per BILLING.md. Stripe Checkout + Customer Portal + webhooks → subscriptions (plaintext entitlements). Gate /api/v1 by workspace plan; free plan in code; meters = plaintext counts only. Never send vault keys/content to Stripe. Service role only for webhook billing rows.

No redesign of crypto/sharing UX beyond entitlement gates.
```

**Done when:** Checkout/Portal/webhooks land entitlements; API enforces free/paid limits; vault keys never touch Stripe.

**Don’t:** Send vault keys/content to Stripe; paid Redis/Sentry; Clerk; crypto redesign beyond entitlement gates.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/BILLING.md @docs/architecture/prompts/P6f.md

P6f review only.

Check: billing isolated from vault keys; webhook scoped; entitlements enforced; free limits clear; no dark patterns; free-tier infra still respected. PASS/FAIL + counsel/ops checklist if any.
```
