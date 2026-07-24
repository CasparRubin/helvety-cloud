# Helvety Cloud — Master Roadmap

> **Canonical master plan:** this file (`docs/architecture/ROADMAP.md`).  
> **New chats:** `@docs/architecture/ROADMAP.md` + “Implement **P\<n\>** only” (or use `docs/architecture/prompts/P\<n\>.md`).  
> **P0–P4 are done** in-repo. Do not re-implement them unless docs/scaffold need fixes. Do not implement multiple P\* phases in the same chat. **Next = P5 E2EE proof.**

---

## 0. How new agents should use this file

1. Read **§1 Product** and **§2 Locked decisions** first.  
2. Find your phase under **§4 Phase playbooks** — that section is the full brief.  
3. Follow **Out of scope** strictly. Prefer omit over add.  
4. Use **Paste prompt** at the end of each phase to start work.  
5. Prefer **Supabase MCP** / **Vercel MCP** / project skills over guessing.  
6. Never copy from sibling repos `helvety` or `helvety-browser-extension-chromium`.

---

## 1. Product (what we are building)

**helvety.cloud** — greenfield E2EE workspace app (projects / issues / later notes, contacts, sharing). Swiss product (Helvety, Einzelfirma). Domain: **helvety.cloud**. Repo: **helvety-cloud** only.

**Priorities (in order):**

1. **Privacy** — Helvety cannot decrypt user vault content (no master key, no escrow, no support recovery of content).  
2. **Performance / UX** — later Linear-like speed; not required until after E2EE proof.  
3. **Free base stack** — Supabase Free + Vercel Hobby + Stripe when charging; no paid Redis/Sentry/etc. in foundation.

**Foundation proof (end of P5):**

```text
email OTP → session → PRF passkey unlock → user keys
  → create workspace via /api/v1 → write encrypted issue → reload → decrypt on device
```

**Not now (P6+):** Linear invisible editor, milestone diagrams, notes/contacts, email invites/sharing, Stripe paywalls, browser extension, Tauri, Outlook/Google send-to, deprecate old helvety.com apps.

---

## 2. Locked decisions

| Topic | Decision |
|-------|----------|
| Repo | `/Users/caspar/Repos/helvety-cloud` · GitHub `CasparRubin/helvety-cloud` |
| Legacy | **Never** port UI/crypto/catalogs from `helvety` or Chromium extension |
| Package manager | **Bun** workspaces |
| Web | **Next.js** App Router → **Vercel** Hobby |
| DB | Supabase **`helvety-cloud`** · ref **`qnoeiurmyyyuawkcifmw`** · region **eu-central-2 (Zurich)** |
| Forbidden DB | Old project **`bkdzeihxzvrkndjvyzye`** (`helvety`) — do not touch |
| Auth | **Supabase Auth** — email **OTP** + passkeys; **disable passwords** |
| Vault unlock | WebAuthn **PRF** → HKDF unlock key (auth session ≠ vault decrypt) |
| Crypto | AES-256-GCM content; X25519 (or equivalent) key wrap; AAD bind table:record:field |
| Sharing model (later) | Bitwarden/Proton-style **wrapped workspace/project keys** per member — table `wrapped_keys` from P4 |
| Public API | **`/api/v1/*`** JSON + `Authorization: Bearer <access_token>` |
| Browser Supabase | **Auth SDK OK**; **`from('…')` for vault tables NOT OK** — go through API |
| Schema | Declarative `supabase/schemas/*.sql` → `db diff` → `migrations/` → push / MCP `apply_migration` |
| Types | Generated TS committed under `packages/db` (or equiv.) so agents always see the model |
| Billing | **Stripe** workspace subscriptions — **after P5 + P-legal**; no Clerk in foundation |
| UI foundation | Minimal new **dense shadcn/ui on Base UI** (current shadcn default; **not** Radix). Not helvety.com look |
| Cost | **Free-tier only** in P0–P5 — see §2.1 |
| Legal | Counsel-reviewed pack **before public signup/billing** — see §7 |

### 2.1 Free-tier only (no exceptions in foundation)

**Allowed:** Supabase Free, Vercel Hobby, Stripe (pay when customers pay), Bun/Next/Vitest/ESLint locally, Supabase Auth email, `console` + Vercel logs, GitHub repo, local tests.

**Forbidden unless proven free AND necessary (default = omit):** Redis/KV/Upstash, Sentry/Datadog/analytics, Inngest/job platforms, paid email, Playwright clouds, mandatory heavy CI, Prisma/GraphQL/tRPC, Storybook/Chromatic.

**Rule for agents:** omit before you subscribe. Do not add “best practice” SaaS that costs money.

### 2.2 Explicit non-contradictions

- Supabase Auth in browser ≠ PostgREST product API.  
- P3 = crypto **library + tests only**; `user_crypto` **table in P4**.  
- Clerk is ZK-compatible but **out of foundation**.  
- Limitation of liability in ToS ≠ legal advice; **Swiss lawyer** required for real docs.

---

## 3. Package / folder target (from P1)

```text
helvety-cloud/
  AGENTS.md
  apps/web/                 # Next.js
  packages/crypto/          # E2EE (P3)
  packages/api-contract/    # Zod /api/v1 (P4)
  packages/db/              # generated Database types (P4)
  supabase/
    config.toml
    schemas/                # declarative source of truth
    migrations/
  docs/architecture/        # ROADMAP + deep docs (P0)
  .cursor/rules|skills/     # P0
```

---

## 4. Phase playbooks

### P0 — Constitution (THIS plan’s implementation)

**Goal:** Durable memory so any new chat can build without the original strategy thread.

**Deliverables (create in `helvety-cloud`; no application runtime):**

| Path | Content |
|------|---------|
| `AGENTS.md` | Short always-read: ZK, greenfield, free-tier, `/api/v1`, Supabase ref, point to ROADMAP |
| `docs/VISION.md` | Want / don’t / later table |
| `docs/architecture/ROADMAP.md` | **This entire master roadmap** (keep in sync with strategy) |
| `docs/architecture/THREAT_MODEL.md` | Honest server, stolen DB, staff, lost device; no backdoor |
| `docs/architecture/KEY_HIERARCHY.md` | PRF → user keys → workspace keys → wrapped_keys |
| `docs/architecture/API.md` | `/api/v1` rules, proof routes, sync-ready shape |
| `docs/architecture/DATA_MODEL.md` | Tables plaintext vs ciphertext |
| `docs/architecture/SCHEMA_WORKFLOW.md` | schemas → diff → migrate → types → MCP advisors |
| `docs/architecture/BILLING.md` | Stripe later; meter metadata only |
| `docs/architecture/LEGAL_REQUIREMENTS.md` | Checklist §7; not final ToS text |
| `docs/architecture/prompts/P1.md` … `P5.md` | Copy-paste prompts (same as below) |
| `.cursor/rules/helvety-cloud-constitution.mdc` | `alwaysApply: true` |
| `.cursor/rules/helvety-cloud-crypto.mdc` | globs crypto |
| `.cursor/rules/helvety-cloud-api.mdc` | globs api |
| `.cursor/rules/helvety-cloud-supabase.mdc` | schema-as-code + MCP |
| `.cursor/rules/helvety-cloud-legal-copy.mdc` | no false recovery/E2EE claims |
| `.cursor/skills/helvety-cloud-foundation/SKILL.md` | How to extend schema/API/crypto safely |
| `.gitignore` | env, node_modules, .next, etc. |
| `README.md` | One paragraph + link to ROADMAP |

**Out of scope:** Next.js app, dependencies beyond docs, migrations applied remotely, Vercel deploy.

**Done when:** Files exist; a fresh agent reading only `AGENTS.md` + `ROADMAP.md` can state ZK rules, stack, and P1 next steps.

**Paste prompt:**  
`Implement P0 only per @docs/architecture/ROADMAP.md (or this Cursor plan). Write constitution docs into helvety-cloud. No app code.`

---

### P1 — Scaffold

**Goal:** Empty but runnable monorepo wired for later phases.

**Do:**

- Bun workspace: `apps/web` Next.js App Router (latest stable), minimal page “Helvety Cloud”.  
- Stub packages: `packages/crypto`, `packages/api-contract`, `packages/db` (empty/index exports).  
- `supabase/config.toml` + empty `supabase/schemas/.gitkeep`, `migrations/.gitkeep`.  
- Env templates: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no secrets committed). Document project ref `qnoeiurmyyyuawkcifmw`.  
- ESLint + TypeScript + Vitest smoke test.  
- Optional: create/link Vercel project via MCP (Hobby) — no paid add-ons.

**Don’t:** Auth UI, real crypto, real SQL schema, Stripe, Redis, Sentry, copy helvety.com UI, shadcn (defer to P2).

**Done when:** `bun install` && web app starts locally; README points to ROADMAP.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md — Implement P1 Scaffold only. Bun + Next.js + package stubs + supabase folder. No auth/crypto/migrations.`

---

### P2 — Auth (passwordless)

**Goal:** Sign-in without passwords; session ready; vault still locked/empty.

**Do:**

- Init **shadcn/ui with Base UI** (current shadcn default as of July 2026). Do **not** use `shadcn init -b radix`. Dense tokens OK; wire `components.json` for Base UI.  
- Disable Supabase password provider (dashboard).  
- Email OTP flow (`signInWithOtp` / `verifyOtp`); email template with `{{ .Token }}`.  
- Passkey register + `signInWithPasskey` where supported (Supabase Auth passkeys).  
- Minimal auth pages (email → code → session) on shadcn/Base UI.  
- Gate app shell: signed-in vs signed-out.  
- RP ID / origins for **helvety.cloud** (+ localhost for dev) documented.

**Don’t:** PRF vault crypto persistence, encrypting issues, PostgREST vault CRUD from client, **Radix-based shadcn**.

**Done when:** User can create session via OTP (+ passkey sign-in); shadcn is Base UI; no content decryption yet.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md — Implement P2 Auth only. Init shadcn Base UI (not Radix). Supabase email OTP + passkeys; passwords off. No vault crypto.`

---

### P3 — Crypto library

**Goal:** Correct client crypto with tests; still no DB tables required.

**Do in `packages/crypto`:**

- PRF → HKDF unlock key.  
- Generate `user_symmetric_key` + X25519 keypair; wrap private material with unlock key.  
- AES-256-GCM encrypt/decrypt with versioned envelope + AAD.  
- Recovery key wraps user key (export once).  
- Unit tests: wrong key fails; round-trip OK; document “Helvety cannot decrypt.”

**Don’t:** HTTP routes, SQL migrations, UI beyond optional tiny harness.

**Done when:** Tests pass; KEY_HIERARCHY.md matches code.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md — Implement P3 Crypto only in packages/crypto with tests. No DB/API.`

---

### P4 — Schema + API

**Goal:** Blind DB + versioned API stubs; types in git.

**Crypto hardening before first wrap persistence (from P3 review — do here, not a P3 rework):**

- Extend `wrapKey` / `unwrapKey` with **AAD** (same `table:recordId:field` binding as content), e.g. `user_crypto:{userId}:wrapped_user_key`, `user_crypto:{userId}:wrapped_private_key`, `wrapped_keys:{subjectId}:wrapped_key`. Content already binds AAD; wraps currently omit it → column-swap of wrapped blobs at rest is possible. Prefer fixing in `packages/crypto` **before** migrations that store wraps (or wrap via `encrypt` with that AAD).  
- `createKeyCheck` / `verifyKeyCheck` today use `recordId: "self"` — replace with the **real user id** when wiring `PUT /api/v1/me/crypto`.

**Schema (declarative then migrate):**

- `profiles` (id = auth.users)  
- `user_crypto` (public_key, wrapped keys, prf_salt, key_check, versions)  
- `workspaces`, `workspace_members` (role)  
- `projects`  
- `wrapped_keys` (subject_type/id, user_id, wrapped_key)  
- `issues` (ids, project_id, encrypted_blob, updated_at, soft-delete/tombstone fields as needed)  
- RLS: membership-based; **explicit GRANTs** (auto-expose is OFF)  
- Apply via CLI and/or MCP `apply_migration` to **`qnoeiurmyyyuawkcifmw` only**  
- MCP `generate_typescript_types` → commit `packages/db`  
- MCP `get_advisors` — fix critical RLS issues  

**API:**

- `packages/api-contract` Zod for envelopes + errors  
- Routes (stubs OK if authenticated + validated):  
  - `GET /api/v1/health`  
  - `PUT /api/v1/me/crypto`  
  - `POST /api/v1/workspaces`  
  - `PUT/GET` project + issue with **ciphertext only**  
- Server uses user JWT Supabase client; service role only where justified later (webhooks)

**Don’t:** Full Linear UI, Stripe, browser `from('issues')`, sharing invites UI.

**Done when:** Migrations on remote; types committed; wrap/key_check AAD bound; health + crypto/workspace stubs work with auth.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md — Implement P4 Schema+API only. Before persisting wraps: AAD on wrapKey/unwrapKey + real userId for key_check. Declarative supabase schemas, migrations, types, /api/v1 stubs. Use Supabase MCP. Project qnoeiurmyyyuawkcifmw only.`

---

### P5 — E2EE proof

**Goal:** Vertical slice proving zero-knowledge end-to-end.

**Before E2EE wiring (P4 review fix-before-P5 — do first if not already landed):**

- Ensure P4 artifacts are committed (`supabase/`, `packages/db`, `packages/api-contract`, API routes, crypto AAD).  
- Revoke `EXECUTE` on `public.rls_auto_enable()` and `public.set_updated_at()` from `PUBLIC` / `anon` / `authenticated` (triggers keep working). Schema + new migration via `SCHEMA_WORKFLOW.md`; apply to **`qnoeiurmyyyuawkcifmw` only**.  
- Tighten table grants: match `11_grants.sql` intent — drop `TRUNCATE` / `REFERENCES` / `TRIGGER` for `authenticated` on vault tables.  
- Optional: index `workspaces(created_by)` (perf INFO — defer OK).  
- Re-check MCP `get_advisors` after grant fixes.

**Do (E2EE proof):**

- After login: PRF unlock → load/create user_crypto via API.  
- Create workspace + wrap workspace key for owner.  
- Create/edit one issue: encrypt client-side → `PUT /api/v1/...` → `GET` → decrypt.  
- Show clear “if you lose unlock methods, data is gone” copy (aligned with LEGAL_REQUIREMENTS).  
- Recovery export (`exportRecoveryKey`): **one-shot offline secret** in UI — never log, never POST to Helvety; library cannot enforce this.  
- Optional: second browser same user.

**Don’t:** Sharing, billing, notes/contacts, sync batch protocol (row model already OK for later). Don’t reopen P4 schema design beyond the grant/RPC fixes above.

**Done when:** Grant/RPC fixes applied (or already on remote); round-trip works; with service role you still only see ciphertext; checklist in §8.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md — Implement P5 E2EE proof only. First: P4 fix-before-P5 (commit if needed; revoke EXECUTE on rls_auto_enable + set_updated_at; tighten grants). Then wire P2–P4 for one encrypted issue via /api/v1. Recovery export = one-shot offline — never log/POST.`

---

### P-legal — Before public users / billing

**Goal:** Legally sound, plain-language docs + signup gates (Swiss Einzelfirma + E2EE).

**Do:** Documents in §7; counsel review; Impressum; signup checkboxes storing policy versions; no misleading claims.

**Don’t:** Ship Stripe or open marketing signup without this.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md §7 — Draft legal pack stubs + signup acceptance wiring; flag all text for Swiss counsel review. Do not invent final legal wording as “approved.”`

---

### P6+ — Product (separate plans later)

Sharing (wrap keys to invitees), Stripe entitlements, Linear-like TipTap UX, milestones/viz, notes/contacts/custom labels, extension, Tauri, calendar send-to, deprecate old apps. Each feature = its own plan after P5 + P-legal.

---

## 5. Crypto & E2EE (reference)

```text
Passkey PRF → unlock_key (HKDF)
  wraps → user_symmetric_key
    wraps → user_private_key
  user_public_key → server (plaintext) for future invites

workspace_key / project_key (random)
  sealed to each member via wrapped_keys
  encrypts all user-authored content (AES-256-GCM + AAD)
```

**Server may store:** user id, email (auth), public keys, wrapped blobs, membership, ids, timestamps, sizes, billing counters.  
**Server must never have:** raw user/workspace keys, PRF output, recovery plaintext, titles/bodies.

**Forbidden:** company recovery, escrow, “email reset restores vault,” MLS in foundation.

---

## 6. API (reference)

- Version path `/api/v1`; break → `/api/v2`.  
- Ciphertext-opaque; client-generated UUIDs; workspace-scoped; idempotent upserts.  
- Later: `sync/push` + `sync/pull` without changing row ciphertext shape.  
- Realtime = optional notify only.  
- Not Server-Actions-only; not GraphQL for vault.

---

## 7. Legal (reference — not legal advice)

**Required before public/billing:** Impressum, ToS, Privacy Policy, AUP, E2EE/no-recovery notice, billing terms, subprocessors list; Swiss counsel review.

**Signup must accept (log versions):** ToS, Privacy, AUP, E2EE acknowledgment (no recovery; user responsible for content + keys).

**Honesty:** Never claim Helvety can read/recover vault content; never fake certifications; state free limits clearly.

**Regimes to track with counsel:** Swiss FADP, GDPR if EU users, EU consumer digital service withdrawal, DSA if applicable. Einzelfirma = personal liability risk — counsel may advise GmbH later.

---

## 8. Success criteria (foundation = P5 green)

1. Passwords disabled; OTP + passkey/PRF path works.  
2. Service role cannot decrypt vault content.  
3. No API returns plaintext content or raw private keys.  
4. Vault I/O only via `/api/v1`.  
5. `supabase/schemas` + migrations + committed types match remote (MCP verifiable).  
6. Crypto tests reject wrong keys.  
7. Recovery warning shown.  
8. Public/billing blocked until P-legal green.

---

## 9. Agent tooling cheatsheet

| Need | Use |
|------|-----|
| Schema change | Edit `supabase/schemas` → diff → migration → MCP `apply_migration` / `db push` → `generate_typescript_types` → `get_advisors` |
| Inspect DB | MCP `list_tables`, `list_migrations` on `qnoeiurmyyyuawkcifmw` |
| Hosting | Vercel MCP / skills — Hobby only |
| Auth config | Supabase dashboard + docs; passwords off |

---

## 10. Anti-patterns

- Implementing multiple P\* in one chat  
- Copying old Helvety apps  
- Studio-only schema without git  
- Browser PostgREST for vault  
- Paid SaaS in foundation  
- Misleading E2EE/recovery copy  
- Public launch without legal pack  

---

## Status

**P0–P4 (constitution, scaffold, auth, crypto, schema+API) are done.** Next chat = **P5 E2EE proof** only (start with P4 fix-before-P5 grants/RPC if not already applied). Auth: [`AUTH.md`](./AUTH.md). Crypto: [`KEY_HIERARCHY.md`](./KEY_HIERARCHY.md).
