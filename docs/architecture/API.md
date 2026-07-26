# API

## Hard rules

1. **Public contract** = versioned HTTP JSON under `/api/v1/*`.  
2. **Auth:** `Authorization: Bearer <Supabase access_token>`.  
3. **Ciphertext-opaque:** no plaintext titles/bodies on the wire to our servers.  
4. **Client-generated UUIDs** + idempotent upserts.  
5. **Workspace-scoped** resources.  
6. Browser **must not** use Supabase Data API (`from('tasks')`) for vault tables. Supabase **Auth** SDK in the browser is OK.  
7. Do **not** make Next.js Server Actions the only mutation path (extension/native clients later).

## Surfaces

| Plane | Examples |
|-------|----------|
| Control | `PUT /api/v1/me/crypto`, `DELETE /api/v1/me`, `POST /api/v1/workspaces`, workspace invitations (P6e), billing/Checkout (P6f) |
| Data | Task/project/note/contact upserts with `encrypted_blob`; later `POST /api/v1/sync/push`, `GET /api/v1/sync/pull?cursor=` |

Realtime (optional later) = wake-up only, not a second write API.

## Foundation routes (P4–P5)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | Liveness |
| GET | `/api/v1/me/policy-acceptances` | Current policy versions + whether accepted |
| PUT | `/api/v1/me/policy-acceptances` | Record ToS/Privacy/AUP/E2EE version acceptances |
| GET | `/api/v1/me/crypto` | Load public key + wrapped user key material |
| PUT | `/api/v1/me/crypto` | Upsert public key + wrapped user key material (requires current policy acceptances) |
| GET | `/api/v1/me` | Account deletion preview (solo / leaving / blocking workspaces) |
| DELETE | `/api/v1/me` | Hard-delete account (cancels solo-owned Stripe subs; blocks if owns shared workspaces; then `auth.admin.deleteUser`) |
| GET | `/api/v1/workspaces` | List workspaces the caller belongs to (id, name, kind, role, wrapped key) |
| POST | `/api/v1/workspaces` | Create workspace + owner wrapped key (`name`, `kind`, sealed key) |
| GET | `/api/v1/workspaces/:workspaceId` | Workspace id/name/kind + caller’s wrapped key |
| PATCH | `/api/v1/workspaces/:workspaceId` | Rename workspace (`name` only; `kind` immutable) |
| GET | `/api/v1/workspaces/:workspaceId/projects` | List projects (paginated; ciphertext-opaque) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId` | Project upsert / fetch |
| GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/tasks` | List tasks (paginated; ciphertext-opaque; optional `labelId` / `stageId` / `priorityId` / `milestoneId` filters) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/tasks/:taskId` | Task upsert / fetch (`labelId` / `stageId` / `priorityId` soft refs; `milestoneId` FK; `links` replace outgoing edges) |
| GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/milestones` | List milestones (paginated; ciphertext-opaque) |
| PUT/GET/DELETE | `/api/v1/workspaces/:workspaceId/projects/:projectId/milestones/:milestoneId` | Milestone upsert / fetch / delete |
| GET | `/api/v1/workspaces/:workspaceId/notes` | List notes (paginated; optional `projectId` / `taskId` filters — `taskId` via `entity_links`) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/notes/:noteId` | Note upsert / fetch (`projectId` filing FK; `links: [{ kind, id }]` replace outgoing edges) |
| GET | `/api/v1/workspaces/:workspaceId/links` | List entity link edges (`sourceKind`/`sourceId` and/or `targetKind`/`targetId`) |
| GET | `/api/v1/workspaces/:workspaceId/contacts` | List contacts (paginated; ciphertext-opaque; includes `links`) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/contacts/:contactId` | Contact upsert / fetch (`links` replace outgoing edges) |
| GET | `/api/v1/workspaces/:workspaceId/members` | List members (`userId`, `role`) |
| GET/POST | `/api/v1/workspaces/:workspaceId/invitations` | List / create email invitations (owner/admin) |
| POST | `/api/v1/workspaces/:workspaceId/invitations/:invitationId/seal` | Owner/admin stores client-sealed workspace key for claimed invitee |
| POST | `/api/v1/workspaces/:workspaceId/invitations/:invitationId/cancel` | Cancel active invitation (owner/admin; clears any stored seal) |
| GET | `/api/v1/me/invitations` | Invitations addressed to the caller’s verified email |
| POST | `/api/v1/me/invitations/:invitationId/claim` | Invitee attaches vault `public_key` (must match their `user_crypto` row) |
| POST | `/api/v1/me/invitations/:invitationId/accept` | Atomic membership + `wrapped_keys` insert (seat-gated) |
| GET | `/api/v1/workspaces/:workspaceId/billing` | Plan, status, effective limits (null = unlimited), usage, addons, `freeOverflowLocked` (any member) |
| POST | `/api/v1/workspaces/:workspaceId/billing/checkout` | Owner-only: Stripe Checkout for Pro → `{ url }` |
| POST | `/api/v1/workspaces/:workspaceId/billing/portal` | Owner-only: Stripe Customer Portal → `{ url }` |
| POST | `/api/v1/workspaces/:workspaceId/billing/discount` | Owner-only: redeem discount / complimentary code |
| DELETE | `/api/v1/workspaces/:workspaceId/billing/discount` | Owner-only: remove applied discount / complimentary grant |
| PUT | `/api/v1/workspaces/:workspaceId/billing/addons` | Owner-only: set addon pack quantities on Pro Stripe sub |
| POST | `/api/webhooks/stripe` | Stripe webhook (signature-verified); service-role upserts; never overwrites comps |

**Invitation lifecycle (P6e):** `waiting_for_recipient` → `waiting_for_owner_seal` → `ready_to_accept` → `accepted` (or `cancelled`). Any email is invitable; invitee signs in with OTP, sets up vault, claims, then an owner/admin seals `workspace_key` to the claimed public key with AAD `wrapped_keys:{workspaceId}:wrapped_key`. Claim stores the caller’s registered `user_crypto.public_key`, so seals can only target the invitee’s own vault key. Cancelling drops the stored seal; a sealed key already opened by the invitee is not recoverable, so rotation stays a later concern. Server never sees plaintext keys.

**List query params:** `limit` (1–100, default 50), opaque `cursor` (keyset on `sort_order ASC, id ASC`), `includeDeleted=true` to include soft-deleted rows. Soft-delete = PUT with `deletedAt` ISO timestamp (schema `deleted_at`). Default lists omit tombstones. Notes list also accepts optional `projectId` / `taskId` (UUID) to filter without decrypting (`taskId` resolved via `entity_links`). Task list accepts optional `labelId` / `stageId` / `priorityId` (UUID) — option **names** live in project ciphertext; these ids are intentional plaintext metadata for filtering.

**Task categorizations (P7/P8d/P8e):** Project `encrypted_blob` includes `categorizations` (encrypted names, optional stage `color`, optional option `icon`). Tasks store `labelId` (nullable), `stageId`, `priorityId` as plaintext soft refs. No separate categorization API — defs ride on project PUT/GET.

**Entity links (P8a–P8d):** Note / task / contact PUT may include `links: [{ kind: "task"|"contact"|"project"|"note", id }]` — server validates ids belong to the workspace, then **replaces** that source’s outgoing `entity_links` rows. Responses include the current `links` array. `GET …/links` supports reverse lookup for backlinks UI. Link graph is intentional metadata (UUIDs only); titles and colors stay in ciphertext. Inline TipTap `entityRef` nodes live inside note/task/contact body ciphertext; client extracts them on save to sync the junction. Task chip color comes from the stage option’s `EntityColor` (P8d), not a per-task accent.

**Entitlement gates (P6f / P12):** create mutations (new workspace/project/task/note/contact, invite create, invite accept, attachment upload / new attachment links) are gated by **effective** workspace limits (`BILLING.md`) and return `limit_exceeded` (403) at the cap. Tasks are per-project; complimentary (`unmetered`) workspaces skip countable caps. Soft-locked free-overflow workspaces (`freeOverflowLocked` on GET billing) also block those creates while leaving reads/updates/deletes/export available. Updates, soft-deletes, reads, seal/cancel, and billing actions are never gated by overflow. Meters are plaintext row counts only.

Exact paths nest under `/api/v1/workspaces/:workspaceId/...` — keep stable once shipped; breaking changes → `/api/v2`.

## Errors

Stable codes via `packages/api-contract`: `unauthorized`, `forbidden`, `limit_exceeded`, `conflict`, `invalid_ciphertext`, etc.

## Server DB access

Route handlers use Supabase client with the **user JWT**. Service role is used by `/api/webhooks/stripe` and discount redeem (`apps/web/lib/supabase/service-role.ts`) to upsert `subscriptions` / `billing_events` / `discount_codes` redemption counters, and by `DELETE /api/v1/me` for `auth.admin.deleteUser` — never to “helpfully” decrypt or touch vault tables.

**PostgREST / grants:** `authenticated` retains table GRANTs so API routes can query with the user JWT under RLS. The **browser must still never** call the Data API for vault tables — entitlement gates (P6f) live only on `/api/v1`. Closing Data API entirely would require a larger “service-role-only API” redesign; not done in this wave.

**Advisor lint `0029_authenticated_security_definer_function_executable`:** expected WARN for invitation / delete / membership / seat `SECURITY DEFINER` RPCs that `/api/v1` calls with the user JWT. Do **not** “fix” by revoking `authenticated` EXECUTE — that breaks those routes. Trigger helpers and `increment_discount_redemption` correctly revoke EXECUTE from `authenticated` (service-role or trigger-only).

See [`ROADMAP.md`](ROADMAP.md) §6 and P4/P5 playbooks.
