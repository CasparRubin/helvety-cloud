# Helvety Cloud: Agent brief

Read [`docs/architecture/ROADMAP.md`](docs/architecture/ROADMAP.md) for locked decisions and phase status. New chats: one scoped change against those decisions (prefer omit over add).

## Non-negotiables

1. **Zero knowledge.** Helvety (staff, DB admins, service role) must not be able to decrypt your data. No master key, escrow, or support recovery of content.
2. **No passwords.** Supabase Auth: email OTP only. Encryption unlock via WebAuthn **PRF** (session ≠ decrypt).
3. **Greenfield.** Never copy UI/crypto/catalogs from `helvety` or `helvety-browser-extension-chromium`.
4. **Free-tier infra**: Prefer omit paid SaaS (Redis, Sentry, analytics, etc.). Stripe is allowed for customer billing (**P6f** / **P12**).
5. **Public API** = `/api/v1` + Bearer JWT. Browser may use Supabase **Auth** SDK; must **not** use PostgREST `from('…')` for encrypted entity tables.
6. **Honesty.** Never claim Helvety can read or recover encrypted data. Live legal pack + acceptance gates (P-legal2); optional counsel is a business choice.
7. **Workspace-scoped encryption.** All encrypted entities (projects, tasks, notes, contacts, boards, databases, tables, comments) live in a workspace. **Personal workspace** on first encryption setup. No user-global contacts/notes store; no `workspace_id = null`.
8. **Keep brand design masters.** Never delete [`docs/assets/icon.af`](docs/assets/icon.af) on cleanup (see [`docs/assets/README.md`](docs/assets/README.md)).

## Stack (locked)

| Item | Value |
|------|--------|
| Repo | `helvety-cloud` only |
| Domain | helvety.cloud |
| Runtime | Bun + Next.js → Vercel Hobby |
| DB/Auth | Supabase project **helvety-cloud** · ref **`qnoeiurmyyyuawkcifmw`** · Zurich |
| Forbidden DB | Old `helvety` project `bkdzeihxzvrkndjvyzye` |
| Billing | Stripe workspace subscriptions (**P6f** / **P12**); no Clerk |
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
| P8d | Stage colors + universal entity links | **Done** |
| P8e | Categorization icons + polished task pickers | **Done** |
| P9 | Task stage board (DnD between stages) | **Done** |
| P10 | Project descriptions + milestones | **Done** |
| P11 | E2EE files & documents | **Done** |
| P12 | Billing Free / Pro / addons | **Done** |
| P13 | Clean baseline + constrained entity links | **Done** |
| P14 | Encrypted names + milestone dates + progress chart | **Done** |
| P15 | i18n (en/de/fr/it) via next-intl | **Reverted** (English only) |
| P16 | Encrypted comments on tasks/notes/contacts | **Done** |
| P17 | Boards (React Flow BPMN-inspired E2EE canvas) | **Done** |
| P18 | Databases & tables (E2EE Dataverse-style models) | **Done** |

## Tooling

- Schema: `supabase/schemas` → diff → migrations → MCP `apply_migration` / `db push` → generate types → `get_advisors`
- Hosting: Vercel MCP/skills, Hobby only
- Prefer MCP over guessing live DB state
- Extend schema/API/crypto: [`.cursor/skills/helvety-cloud-foundation/SKILL.md`](.cursor/skills/helvety-cloud-foundation/SKILL.md)
