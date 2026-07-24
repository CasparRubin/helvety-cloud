# Helvety Cloud — Agent brief

Read [`docs/architecture/ROADMAP.md`](docs/architecture/ROADMAP.md) before implementing any phase. New chats: `@docs/architecture/ROADMAP.md` + “Implement **P\<n\>** only.”

## Non-negotiables

1. **Zero knowledge.** Helvety (staff, DB admins, service role) must not be able to decrypt vault content. No master key, escrow, or support recovery of content.
2. **No passwords.** Supabase Auth: email OTP + passkeys. Vault unlock via WebAuthn **PRF** (session ≠ decrypt).
3. **Greenfield.** Never copy UI/crypto/catalogs from `helvety` or `helvety-browser-extension-chromium`.
4. **Free-tier only** in foundation (P0–P5). Omit Redis, Sentry, paid CI, analytics, etc. Prefer omit over subscribe.
5. **Public API** = `/api/v1` + Bearer JWT. Browser may use Supabase **Auth** SDK; must **not** use PostgREST `from('…')` for vault tables.
6. **Honesty.** Never claim Helvety can read or recover vault data. Legal pack + counsel before public signup/billing.

## Stack (locked)

| Item | Value |
|------|--------|
| Repo | `helvety-cloud` only |
| Domain | helvety.cloud |
| Runtime | Bun + Next.js → Vercel Hobby |
| DB/Auth | Supabase project **helvety-cloud** · ref **`qnoeiurmyyyuawkcifmw`** · Zurich |
| Forbidden DB | Old `helvety` project `bkdzeihxzvrkndjvyzye` |
| Billing | Stripe after P5 + P-legal; no Clerk in foundation |
| UI | shadcn/ui with **Base UI** primitives (`npx shadcn init` default). Do **not** init with `-b radix` |

## Phases

| ID | Name | Status |
|----|------|--------|
| P0 | Constitution (this tree) | **Done** |
| P1 | Scaffold | **Done** |
| P2 | Auth | **Done** |
| P3 | Crypto library | **Done** |
| P4 | Schema + API | **Done** |
| P5 | E2EE proof | **Done** |
| P-legal | Legal pack | **Next** (before public/billing) |
| P6+ | Product | After P5 + P-legal |

Paste prompts: [`docs/architecture/prompts/`](docs/architecture/prompts/).

## Tooling

- Schema: `supabase/schemas` → diff → migrations → MCP `apply_migration` / `db push` → generate types → `get_advisors`
- Hosting: Vercel MCP/skills, Hobby only
- Prefer MCP over guessing live DB state
