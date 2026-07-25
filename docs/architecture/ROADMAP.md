# Helvety Cloud — Master Roadmap

> **Canonical master plan:** this file (`docs/architecture/ROADMAP.md`).  
> **New chats:** `@docs/architecture/ROADMAP.md` + “Implement **P\<n\>** only” (or use `docs/architecture/prompts/P\<n\>.md`).  
> **P0–P5 + P-legal + P-legal2 + P6a + P6b + P6c + P6d + P6e + P6f + P7 are done**. Do not re-implement them unless docs need fixes. Do not implement multiple P\* phases in the same chat. Product wave (P6a–P6f) complete; **P7** adds task categorizations. Stripe billing landed in **P6f** (see [`BILLING.md`](./BILLING.md)).

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

**helvety.cloud** — greenfield E2EE workspace app (projects / tasks / notes / contacts / sharing). Swiss product (Helvety, Einzelfirma). Domain: **helvety.cloud**. Repo: **helvety-cloud** only.

**Priorities (in order):**

1. **Privacy** — Helvety cannot decrypt user vault content (no master key, no escrow, no support recovery of content).  
2. **Performance / UX** — later Linear-like speed; not required until after E2EE proof.  
3. **Free base stack** — Supabase Free + Vercel Hobby + Stripe when charging (P6f); no paid Redis/Sentry/etc. in foundation.

**Foundation proof (end of P5):**

```text
email OTP → session → PRF passkey unlock → user keys
  → create workspace via /api/v1 → write encrypted task → reload → decrypt on device
```

**Product wave (P6a→P6f, one phase per chat):** app shell + Personal workspace → projects/tasks CRUD → TipTap → notes/contacts → workspace sharing → Stripe entitlements. See §4.

**Out of this wave:** milestone diagrams, sync batch API, browser extension, Tauri, Outlook/Google send-to, deprecate old helvety.com apps. (Task categorizations / custom labels: **P7**.)

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
| Access model | **Everything workspace-scoped** — projects/tasks/notes/contacts under a workspace; no user-global contacts/notes; no `workspace_id = null`. See §4 access model |
| Personal workspace | On first vault setup, ensure one **Personal** workspace (home for “general” notes/contacts) |
| Sharing model | Bitwarden/Proton-style: invite = seal **`workspace_key`** to invitee → `wrapped_keys`; members decrypt **all** vault entities in that workspace (P6e) |
| Public API | **`/api/v1/*`** JSON + `Authorization: Bearer <access_token>` |
| Browser Supabase | **Auth SDK OK**; **`from('…')` for vault tables NOT OK** — go through API |
| Schema | Declarative `supabase/schemas/*.sql` → `db diff` → `migrations/` → push / MCP `apply_migration` |
| Types | Generated TS committed under `packages/db` (or equiv.) so agents always see the model |
| Billing | **Stripe** workspace subscriptions — **P6f only**; no Clerk in foundation |
| UI foundation | Minimal new **dense shadcn/ui on Base UI** (current shadcn default; **not** Radix). Not helvety.com look |
| Cost | **Free-tier only** in P0–P5 and product phases until P6f Stripe — see §2.1 |
| Legal | **P-legal2 production pack** live + acceptance gates; optional counsel for risk; see §7 |

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
| `docs/architecture/prompts/P1.md` … `P5.md`, `P-legal*.md`, `P6a.md` … `P6f.md`, `P7.md` | Copy-paste prompts (same as below) |
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

**Don’t:** PRF vault crypto persistence, encrypting tasks, PostgREST vault CRUD from client, **Radix-based shadcn**.

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
- `tasks` (ids, project_id, encrypted_blob, updated_at, soft-delete/tombstone fields as needed)  
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
  - `PUT/GET` project + task with **ciphertext only**  
- Server uses user JWT Supabase client; service role only where justified later (webhooks)

**Don’t:** Full Linear UI, Stripe, browser `from('tasks')`, sharing invites UI.

**Done when:** Migrations on remote; types committed; wrap/key_check AAD bound; health + crypto/workspace stubs work with auth.

**Paste prompt:**  
`@docs/architecture/ROADMAP.md — Implement P4 Schema+API only. Before persisting wraps: AAD on wrapKey/unwrapKey + real userId for key_check. Declarative supabase schemas, migrations, types, /api/v1 stubs. Use Supabase MCP. Project qnoeiurmyyyuawkcifmw only.`

---

### P5 — E2EE proof

**Goal:** Vertical slice proving zero-knowledge end-to-end. **Landed** (incl. post-review fix: seal AAD, recovery key+wrap export, migration sync, inline RLS membership / drop `is_workspace_member` RPC).

**Done (historical brief):**

- P4 fix-before-P5 grants/RPC harden + commit.  
- PRF unlock → user_crypto via API → workspace seal with AAD `wrapped_keys:{workspaceId}:wrapped_key` → encrypt task → PUT/GET → decrypt.  
- Recovery UI: key **and** wrap offline once; never log/POST.  
- Honest lose-unlock = data-gone copy.

**Don’t reopen** unless regressions. Next = P-legal.

**Paste prompt (only if re-doing):**  
`@docs/architecture/ROADMAP.md — Implement P5 E2EE proof only. Wire P2–P4 for one encrypted task via /api/v1. Seal/wrap AAD; recovery = key + wrap offline once — never log/POST.`

---

### P-legal — Draft pack + gates (historical)

**Goal:** Engineering legal pack + signup gates.

**Status:** **Done** (superseded by P-legal2 production pack). Drafts + `policy_acceptances` landed first; see P-legal2 for live text.

---

### P-legal2 — Production legal pack

**Goal:** Replace drafts/placeholders with the live product legal pack and keep acceptance gates on current versions.

**Do:**

- Fill Impressum from public registry (Helvety by Rubin, Basel, UID CHE-356.266.592).  
- Write production ToS, Privacy, AUP, E2EE notice, Billing terms, Subprocessors — no “NEED SWISS COUNSEL REVIEW” / draft banners on `/legal/*`.  
- Bump `CURRENT_POLICY_VERSIONS` (users must re-accept).  
- Keep vault gated on ToS/Privacy/AUP/E2EE acceptances.  
- Honesty vs KEY_HIERARCHY (no decrypt/recovery claims).  
- Optional attorney review remains a business choice, not a product gate.

**Don’t:** Enable Stripe charges here; redesign crypto; start sharing/TipTap P6 work unless separately planned.

**Done when:** `/legal/*` shows production versions; gate copy is non-draft; versions `2026-07-24-v1` (or later) accepted via API.

**Paste prompt:**  
`@docs/architecture/prompts/P-legal2.md @docs/architecture/LEGAL_REQUIREMENTS.md — Implement P-legal2 only.`

---

### Access model (locked) — product wave

All vault data is **workspace-scoped**. Invite = seal `workspace_key` → members decrypt everything in that workspace.

```text
Workspace  (members + per-member wrapped_keys)
  ├── projects → tasks
  ├── notes     (required workspace_id; optional project/task links; dynamic encrypted JSON)
  └── contacts  (workspace address book; no global dedupe)
```

- **Personal workspace** created on first vault setup — home for “general” notes/contacts.  
- Same person in two workspaces ⇒ two contact rows. Later: copy-to-workspace (re-encrypt). No user-global contacts.  
- No `workspace_id = null` notes. No project-level key ACLs for contacts.

**Sequence:** P6a → P6b → P6c → P6d → P6e → P6f (one chat each).  
**Out of this wave:** milestones, labels, sync batch API, extension, Tauri, calendar send-to, deprecate old apps.

---

### P6a — App shell + vault session + workspaces

**Goal:** Replace proof card with a real signed-in app chrome; unlock once; manage workspaces.

**Do:**

- Layout: sidebar/nav, workspace switcher, unlock gate (reuse PRF + policy acceptance).  
- Routes e.g. `/app`, `/app/w/[workspaceId]`.  
- List/create/rename workspaces via existing `/api/v1/workspaces*` (extend list endpoint if missing).  
- **Personal workspace:** on first vault setup, create (or ensure) one Personal workspace so notes/contacts always have a home.  
- Client cache of unlocked keys in memory only (idle lock later OK).  
- Dense shadcn/Base UI; no helvety.com port.

**Don’t:** Task list polish, TipTap, sharing, Stripe, notes/contacts tables.

**Done when:** User signs in → accepts policies → unlocks → has Personal (and can create more) → navigates without the P5 proof card as primary UX.

**Status:** **Done** (app shell + Personal workspace + list/create/rename).

**Paste prompt:** [`docs/architecture/prompts/P6a.md`](./prompts/P6a.md)

---

### P6b — Projects + tasks (minimal E2EE product)

**Goal:** Usable project/task CRUD, all ciphertext-opaque.

**Do:**

- Project list under workspace; create/reorder.  
- Task list + detail: title/body as encrypted JSON (same envelope as P5); status/sort as plaintext metadata if already in schema (else keep minimal).  
- API: list endpoints (paginate) for projects/tasks; keep PUT/GET by id.  
- Decrypt only on device with workspace key from `wrapped_keys` + AAD.  
- Soft-delete/tombstone if schema supports it.

**Don’t:** Rich editor, mentions, labels UI, sharing, attachments, notes/contacts, Stripe.

**Done when:** Create/edit/list/reload tasks across sessions; DB still only envelopes.

**Status:** **Done** (post-review: `projects.encrypted_blob` NOT NULL; PUT requires envelope — no omit→null wipe).

**Paste prompt:** [`docs/architecture/prompts/P6b.md`](./prompts/P6b.md)

---

### P6c — Editor (TipTap-style)

**Status:** **Done**

**Goal:** Linear-like body editing without breaking E2EE.

**Do:**

- TipTap (or similar) in task detail; serialize to encrypted blob (version field in plaintext JSON inside ciphertext).  
- Autosave via existing PUT; conflict = last-write or generation if present.  
- Keep free-tier: no paid collaboration SaaS.

**Don’t:** Realtime CRDT/Yjs paid stack; sharing; notes tables; Stripe.

**Done when:** Rich body round-trips encrypt → API → decrypt.

**Paste prompt:** [`docs/architecture/prompts/P6c.md`](./prompts/P6c.md)

---

### P6d — Notes + contacts (workspace-scoped)

**Goal:** New entity types under the locked access model (everything in a workspace).

**Do:**

- Schema: `notes` and `contacts` with required `workspace_id`, `encrypted_blob`; RLS via membership; optional nullable `project_id` / `task_id` on notes for filters.  
- Notes: flexible encrypted JSON (dynamic links/tags/body); can link to project, task, both, or neither.  
- Contacts: encrypted identity fields under **workspace_key**; same person in two workspaces = two rows (no global dedupe). Optional later: copy-to-workspace.  
- `/api/v1` list/detail + UI in app shell (Personal + team workspaces).  
- AAD `table:recordId:field`; migrate `qnoeiurmyyyuawkcifmw` only.

**Don’t:** User-global contacts; null-workspace notes; custom labels/milestones; sharing UI (P6e); Stripe.

**Done when:** Notes and contacts CRUD under a workspace via `/api/v1`; ciphertext-opaque; Personal + team UIs work.

**Status:** **Done**

**Paste prompt:** [`docs/architecture/prompts/P6d.md`](./prompts/P6d.md)

---

### P6e — Sharing workspaces

**Goal:** Multi-member via sealed keys (Bitwarden-style).

**Do:**

- Invite by email (OTP account must exist or signup); role on `workspace_members`.  
- Seal `workspace_key` to invitee `user_public_key` → `wrapped_keys` row with AAD.  
- Accept invite UI; member decrypts **all** workspace ciphertext (tasks, notes, contacts) after unlock — no separate contact share path.  
- AUP/ToS already cover abuse; no server-side content scan.

**Don’t:** Project-level ACL complexity; MLS; cross-workspace contact sync; Stripe.

**Done when:** Owner invites second user; both decrypt same task (and contact/note) ciphertext in that workspace.

**Status:** **Done** (email invite → claim → owner seal with AAD → accept; members decrypt all workspace ciphertext).

**Paste prompt:** [`docs/architecture/prompts/P6e.md`](./prompts/P6e.md)

---

### P6f — Billing setup

**Status:** **Done**

**Goal:** Stripe workspace subscriptions per [`BILLING.md`](./BILLING.md) — after a usable product (P6a–P6b at least; preferably after P6e if seats matter).

**Do:**

- Stripe Checkout + Customer Portal + webhooks → `subscriptions` (plaintext entitlements only).  
- Gate create-project / member limits in `/api/v1` from entitlements.  
- Free plan in code; no vault keys/content in Stripe.  
- Service role only for webhook billing rows.

**Don’t:** Paid Redis/Sentry; Clerk; redesign crypto/sharing UX beyond entitlement gates.

**Done when:** Checkout/Portal/webhooks land entitlements; API enforces free/paid limits; meters are plaintext counts only.

**Paste prompt:** [`docs/architecture/prompts/P6f.md`](./prompts/P6f.md)

---

### P7 — Task categorizations

**Status:** **Done**

**Goal:** Project-scoped labels, stages, and priorities for tasks — hybrid ZK (encrypted option names in project blob; plaintext option ids on tasks for filtering).

**Do:**

- Seed defaults on project create (labels: bug / new feature / change request; stages: backlog → cancelled; priorities: low → urgent).  
- Label optional; stage + priority required (defaults backlog / normal).  
- Project settings: edit lists, set defaults, copy categorizations from another project (remap tasks by name).  
- Task detail pickers + list meta / stage filter.  
- Delete in-use stage/priority remaps to default; delete label clears `label_id`.

**Don’t:** Separate options table; kanban; multi-label; workspace-global taxonomies; server-enforced “id must exist in defs.”

**Done when:** Defaults seeded; settings + copy work; tasks filter by stage id without decrypting names.

**Paste prompt:** [`docs/architecture/prompts/P7.md`](./prompts/P7.md)

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

**Live pack (P-legal2):** Impressum, ToS, Privacy, AUP, E2EE notice, billing terms, subprocessors under `/legal/*` (`apps/web/content/legal/`).

**Signup must accept (log versions):** ToS, Privacy, AUP, E2EE acknowledgment.

**Honesty:** Never claim Helvety can read/recover vault content; never fake certifications; state free limits clearly.

**Risk note:** Text is product-authored (AI-assisted), not Swiss-attorney certification. Optional counsel review can still reduce Einzelfirma risk; GmbH may be advisable later. Stripe charges land in **P6f**.

---

## 8. Success criteria (foundation = P5 green)

1. Passwords disabled; OTP + passkey/PRF path works.  
2. Service role cannot decrypt vault content.  
3. No API returns plaintext content or raw private keys.  
4. Vault I/O only via `/api/v1`.  
5. `supabase/schemas` + migrations + committed types match remote (MCP verifiable).  
6. Crypto tests reject wrong keys.  
7. Recovery warning shown.  
8. Legal pack live (P-legal2) with acceptance gates; Stripe entitlements live (**P6f**).

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
- Paid SaaS in foundation (or before P6f Stripe)  
- Misleading E2EE/recovery copy  
- Public launch without legal pack  
- User-global contacts/notes store; notes with `workspace_id = null`

---

## Status

**P0–P5 + P-legal + P-legal2 + P6a + P6b + P6c + P6d + P6e + P6f + P7 done.** Billing: [`BILLING.md`](./BILLING.md). Auth: [`AUTH.md`](./AUTH.md). Crypto: [`KEY_HIERARCHY.md`](./KEY_HIERARCHY.md). Data model: [`DATA_MODEL.md`](./DATA_MODEL.md). Legal: [`LEGAL_REQUIREMENTS.md`](./LEGAL_REQUIREMENTS.md).
