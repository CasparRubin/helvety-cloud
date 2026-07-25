# Helvety Cloud — Agent brief

Read [`docs/architecture/ROADMAP.md`](docs/architecture/ROADMAP.md) before implementing any phase. New chats: `@docs/architecture/ROADMAP.md` + “Implement **P\<n\>** only.”

## Non-negotiables

1. **Zero knowledge.** Helvety (staff, DB admins, service role) must not be able to decrypt vault content. No master key, escrow, or support recovery of content.
2. **No passwords.** Supabase Auth: email OTP + passkeys. Vault unlock via WebAuthn **PRF** (session ≠ decrypt).
3. **Greenfield.** Never copy UI/crypto/catalogs from `helvety` or `helvety-browser-extension-chromium`.
4. **Free-tier infra** — Prefer omit paid SaaS (Redis, Sentry, analytics, etc.). Stripe is allowed for customer billing (**P6f**).
5. **Public API** = `/api/v1` + Bearer JWT. Browser may use Supabase **Auth** SDK; must **not** use PostgREST `from('…')` for vault tables.
6. **Honesty.** Never claim Helvety can read or recover vault data. Live legal pack + acceptance gates (P-legal2); optional counsel is a business choice.
7. **Workspace-scoped vault.** All vault entities (projects, tasks, notes, contacts) live in a workspace. **Personal workspace** on first vault setup. No user-global contacts/notes store; no `workspace_id = null`.

## Stack (locked)

| Item | Value |
|------|--------|
| Repo | `helvety-cloud` only |
| Domain | helvety.cloud |
| Runtime | Bun + Next.js → Vercel Hobby |
| DB/Auth | Supabase project **helvety-cloud** · ref **`qnoeiurmyyyuawkcifmw`** · Zurich |
| Forbidden DB | Old `helvety` project `bkdzeihxzvrkndjvyzye` |
| Billing | Stripe in **P6f** only; no Clerk in foundation |
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
| P-legal | Legal pack (draft) | **Done** (superseded by P-legal2) |
| P-legal2 | Production legal + acceptance | **Done** |
| P6a | App shell + Personal workspace | **Done** |
| P6b | Projects + tasks (E2EE CRUD) | **Done** |
| P6c | TipTap editor | **Done** |
| P6d | Notes + contacts (workspace-scoped) | **Done** |
| P6e | Workspace sharing / invites | **Done** |
| P6f | Stripe billing + entitlements | **Done** |
| P7 | Task categorizations (label / stage / priority) | **Done** |
| P8a | Entity link graph | **Done** |
| P8b | Editor entity refs + create from selection | **Done** |
| P8c | Visual chips + colors + backlinks | **Done** |

Paste prompts: [`docs/architecture/prompts/`](docs/architecture/prompts/) (`P6a.md` … `P6f.md`, `P7.md`, `P8a.md` … `P8c.md` for product).

## Tooling

- Schema: `supabase/schemas` → diff → migrations → MCP `apply_migration` / `db push` → generate types → `get_advisors`
- Hosting: Vercel MCP/skills, Hobby only
- Prefer MCP over guessing live DB state
