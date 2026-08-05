# Helvety Cloud: Locked decisions & status

> **Canonical** locked decisions and phase history. Product through **P18** is **done** (P15 i18n was **reverted**; English only). Do not re-implement done phases unless docs need fixes. Stripe billing: **P6f** + **P12** (see [`BILLING.md`](./BILLING.md)).
>
> AI contributors: see [`AGENTS.md`](../../AGENTS.md) and [`.cursor/rules/`](../../.cursor/rules/).

---

## 1. Product

**helvety.cloud**: greenfield E2EE workspace app (projects / tasks / notes / contacts / boards / databases / sharing / files / billing). Swiss product (Helvety, Einzelfirma). Domain: **helvety.cloud**. Repo: **helvety-cloud** only.

**Priorities (in order):**

1. **Privacy**: Helvety cannot decrypt user encrypted content (no master key, no escrow, no support recovery of content).
2. **Performance / UX**: Linear-like polish continues.
3. **Free base stack**: Supabase Free + Vercel Hobby + Stripe when charging; no paid Redis/Sentry/etc.

**ZK bar (P5 proof, still required):**

```text
email OTP → session → PRF passkey unlock → user keys
  → create workspace via /api/v1 → write encrypted task → reload → decrypt on device
```

**Still later (not shipped):** sync batch API, browser extension, Tauri, Outlook/Google send-to, deprecate old helvety.com apps, copy-contact-across-workspaces UX.

Product north star: [`docs/VISION.md`](../VISION.md).

---

## 2. Locked decisions

| Topic              | Decision                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repo               | `helvety-cloud` · GitHub `CasparRubin/helvety-cloud`                                                                                                                                                                                                                           |
| Legacy             | **Never** port UI/crypto/catalogs from `helvety` or Chromium extension                                                                                                                                                                                                         |
| Package manager    | **Bun** workspaces                                                                                                                                                                                                                                                             |
| Web                | **Next.js** App Router → **Vercel** Hobby                                                                                                                                                                                                                                      |
| DB                 | Supabase **`helvety-cloud`** · ref **`qnoeiurmyyyuawkcifmw`** · region **eu-central-2 (Zurich)**                                                                                                                                                                               |
| Forbidden DB       | Old project **`bkdzeihxzvrkndjvyzye`** (`helvety`); do not touch                                                                                                                                                                                                               |
| Auth               | **Supabase Auth**: email **OTP** only; **disable passwords**; **disable Auth passkeys**                                                                                                                                                                                        |
| Encryption unlock  | WebAuthn **PRF** → HKDF unlock key (auth session ≠ encryption decrypt)                                                                                                                                                                                                         |
| Crypto             | AES-256-GCM content; X25519 (or equivalent) key wrap; AAD bind table:record:field                                                                                                                                                                                              |
| Access model       | **Everything workspace-scoped**: projects/tasks/milestones/notes/contacts/boards/databases/tables/comments/attachments under a workspace; entity links as constrained plaintext metadata; no user-global contacts/notes; no `workspace_id = null`. See [`DATA_MODEL.md`](./DATA_MODEL.md) |
| Personal workspace | On first encryption setup, ensure one **Personal** workspace (home for “general” notes/contacts)                                                                                                                                                                               |
| Sharing model      | Bitwarden/Proton-style: invite = seal **`workspace_key`** to invitee → `wrapped_keys`; members decrypt **all** encrypted entities in that workspace (P6e). Equal peers only (`role = member`); no owner/admin; leave is wipe-or-go; `created_by` is free-slot attribution only |
| Public API         | **`/api/v1/*`** JSON + `Authorization: Bearer <access_token>`                                                                                                                                                                                                                  |
| Browser Supabase   | **Auth SDK OK**; **`from('…')` for encrypted entity tables NOT OK**. Go through API                                                                                                                                                                                            |
| Schema             | Declarative `supabase/schemas/*.sql` → `db diff` → `migrations/` → push / MCP `apply_migration`                                                                                                                                                                                |
| Types              | Generated TS committed under `packages/db` so the model is always visible in git                                                                                                                                                                                               |
| Billing            | **Stripe** workspace subscriptions (**P6f** + **P12** Free/Pro/addons); discounts via Stripe only; no Clerk                                                                                                                                                                    |
| UI foundation      | Minimal **dense shadcn/ui on Base UI** (current shadcn default; **not** Radix). Not helvety.com look                                                                                                                                                                           |
| Cost               | Prefer free-tier infra. Stripe is allowed for customer billing. See §2.1                                                                                                                                                                                                       |
| Legal              | **P-legal2 production pack** live + acceptance gates; optional counsel for risk; see §6                                                                                                                                                                                        |

### 2.1 Free-tier infra (omit paid SaaS)

**Allowed:** Supabase Free, Vercel Hobby, Stripe (pay when customers pay), Bun/Next/Vitest/ESLint locally, Supabase Auth email, `console` + Vercel logs, GitHub repo, local tests.

**Forbidden unless proven free AND necessary (default = omit):** Redis/KV/Upstash, Sentry/Datadog/analytics, Inngest/job platforms, paid email, Playwright clouds, mandatory heavy CI, Prisma/GraphQL/tRPC, Storybook/Chromatic.

Omit before you subscribe. Do not add paid SaaS “for best practice.”

### 2.2 Explicit non-contradictions

- Supabase Auth in browser ≠ PostgREST product API.
- Crypto library (`packages/crypto`) ≠ `user_crypto` table (schema via declarative SQL).
- Clerk is ZK-compatible but **out of this product**.
- Limitation of liability in ToS ≠ legal advice; optional Swiss counsel is a business risk choice, not a product gate after P-legal2.

---

## 3. Package / folder layout

```text
helvety-cloud/
  AGENTS.md
  apps/web/                 # Next.js
  packages/crypto/          # E2EE
  packages/api-contract/    # Zod /api/v1
  packages/db/              # generated Database types
  supabase/
    config.toml
    schemas/                # declarative source of truth
    migrations/
  docs/architecture/        # this file + deep docs
  docs/assets/              # brand design masters (KEEP icon.af)
  .cursor/rules|skills/
```

---

## 4. Phase status

| ID       | Name                                                                   | Status                                                              |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| P0       | Constitution (this tree)                                               | **Done**                                                            |
| P1       | Scaffold                                                               | **Done**                                                            |
| P2       | Auth                                                                   | **Done** · [`AUTH.md`](./AUTH.md)                                   |
| P3       | Crypto library                                                         | **Done** · [`KEY_HIERARCHY.md`](./KEY_HIERARCHY.md)                 |
| P4       | Schema + API                                                           | **Done** · [`DATA_MODEL.md`](./DATA_MODEL.md), [`API.md`](./API.md) |
| P5       | E2EE proof                                                             | **Done**                                                            |
| P-legal  | Legal pack (draft)                                                     | **Done** (superseded by P-legal2)                                   |
| P-legal2 | Production legal + acceptance                                          | **Done** · [`LEGAL_REQUIREMENTS.md`](./LEGAL_REQUIREMENTS.md)       |
| P6a      | App shell + Personal workspace                                         | **Done**                                                            |
| P6b      | Projects + tasks (E2EE CRUD)                                           | **Done**                                                            |
| P6c      | TipTap editor                                                          | **Done**                                                            |
| P6d      | Notes + contacts (workspace-scoped)                                    | **Done**                                                            |
| P6e      | Workspace sharing / invites                                            | **Done**                                                            |
| P6f      | Stripe billing + entitlements                                          | **Done** · [`BILLING.md`](./BILLING.md)                             |
| P7       | Task categorizations (label / stage / priority)                        | **Done**                                                            |
| P8a      | Entity link graph                                                      | **Done**                                                            |
| P8b      | Editor entity refs + create from selection                             | **Done**                                                            |
| P8c      | Visual chips + colors + backlinks                                      | **Done**                                                            |
| P8d      | Stage colors + universal entity links                                  | **Done**                                                            |
| P8e      | Categorization icons + polished task pickers                           | **Done**                                                            |
| P9       | Task stage board (DnD between stages)                                  | **Done**                                                            |
| P10      | Project descriptions + milestones                                      | **Done**                                                            |
| P11      | E2EE files & documents                                                 | **Done**                                                            |
| P12      | Billing Free / Pro / addons                                            | **Done** · [`BILLING.md`](./BILLING.md)                             |
| P13      | Clean baseline + constrained entity links                              | **Done**                                                            |
| P14      | Encrypted names + milestone dates + progress chart                     | **Done**                                                            |
| P15      | i18n (en/de/fr/it) via next-intl                                       | **Reverted** (English only; do not re-add next-intl)                |
| P16      | Encrypted comments on tasks/notes/contacts (+ Free/Pro/Capacity meter) | **Done**                                                            |
| P17      | Boards (React Flow BPMN-inspired E2EE canvas)                          | **Done**                                                            |
| P18      | Databases & tables (E2EE Dataverse-style models)                       | **Done**                                                            |

**P14** encrypts workspace names, milestone start/end dates, stage completion weights, and the project progress chart.

**P15 note:** i18n was attempted and reverted. Product copy stays English-only.

**P17 note:** Workspace-scoped encrypted boards store React Flow graph JSON (shapes by form: startEvent / endEvent / bpmnTask (Activity) / participant / exclusiveGateway / annotation / stencil / entityRef; optional `label`/`subtitle`/`showLabel`/`showSubtitle`/`textAnchor`/`icon`/`colors`; stencil nodes add `stencilId` from a curated Lucide library; labeled edges with optional `markerEnd: "arrow"`; plus placeable note/contact/task/project/database/table nodes). Legacy `userTask` / `serviceTask` still render as Activity. Canvas edges stay in ciphertext; placed entities sync to `entity_links`. Annotation shapes are board labels, not P16 entity comments.

**P18 note:** Workspace-scoped encrypted databases hold optional TipTap descriptions plus publisher prefix / display name. Child tables encrypt schema (columns, relationships, ownership, auditing) and up to 10 sample rows under the workspace key. Tables nest under `/databases/{id}/tables/{tableId}`. Entity links may target `database` and `table` from notes, tasks, contacts, and boards; databases and tables do not emit outgoing TipTap links.

---

## 5. Crypto & API (pointers)

Hierarchy and forbidden practices: [`KEY_HIERARCHY.md`](./KEY_HIERARCHY.md), [`THREAT_MODEL.md`](./THREAT_MODEL.md).

API hard rules and route table: [`API.md`](./API.md). Later sync batch (`sync/push` / `sync/pull`) must not change row ciphertext shape.

---

## 6. Legal (not legal advice)

**Live pack (P-legal2):** Unified Impressum, ToS, and Privacy on helvety.com (AUP, E2EE, billing, subprocessors, and EU/EEA eligibility as sections/anchors). Cloud stores acceptance versions in `apps/web/lib/legal/policies.ts` and links out; `/legal/*` redirects to helvety.com.

**Signup must accept (log versions):** ToS, Privacy, AUP, E2EE acknowledgment, EU/EEA eligibility.

**Honesty:** Never claim Helvety can read/recover encrypted content; never fake certifications; state free limits clearly.

**Risk note:** Text is product-authored, not Swiss-attorney certification. Optional counsel review can still reduce Einzelfirma risk; GmbH may be advisable later. Details: [`LEGAL_REQUIREMENTS.md`](./LEGAL_REQUIREMENTS.md).

---

## 7. Success criteria (still hold)

1. Passwords disabled; OTP session + encryption PRF unlock path works.
2. Service role cannot decrypt content.
3. No API returns plaintext content or raw private keys.
4. Encrypted entity I/O only via `/api/v1`.
5. `supabase/schemas` + migrations + committed types match remote (MCP verifiable).
6. Crypto tests reject wrong keys.
7. Recovery warning shown.
8. Legal pack live (P-legal2) with acceptance gates; Stripe entitlements live (**P6f** / **P12**).

---

## 8. Anti-patterns

- Copying old Helvety apps
- Studio-only schema without git
- Browser PostgREST for encrypted entities
- Paid SaaS “for best practice” (Stripe for customer billing is fine)
- Misleading E2EE/recovery copy
- Public launch without legal pack
- User-global contacts/notes store; notes with `workspace_id = null`
- Re-adding next-intl / multi-locale UI after P15 revert
- Deleting `docs/assets/icon.af` (brand Affinity master; see [`docs/assets/README.md`](../assets/README.md))
