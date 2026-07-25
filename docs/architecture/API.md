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
| Control | `PUT /api/v1/me/crypto`, `POST /api/v1/workspaces`, workspace invitations (P6e), billing/Checkout (P6f) |
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
| GET | `/api/v1/workspaces` | List workspaces the caller belongs to (id, name, kind, role, wrapped key) |
| POST | `/api/v1/workspaces` | Create workspace + owner wrapped key (`name`, `kind`, sealed key) |
| GET | `/api/v1/workspaces/:workspaceId` | Workspace id/name/kind + caller’s wrapped key |
| PATCH | `/api/v1/workspaces/:workspaceId` | Rename workspace (`name` only; `kind` immutable) |
| GET | `/api/v1/workspaces/:workspaceId/projects` | List projects (paginated; ciphertext-opaque) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId` | Project upsert / fetch |
| GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/tasks` | List tasks (paginated; ciphertext-opaque) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/tasks/:taskId` | Task upsert / fetch |
| GET | `/api/v1/workspaces/:workspaceId/notes` | List notes (paginated; optional `projectId` / `taskId` filters) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/notes/:noteId` | Note upsert / fetch (`projectId` / `taskId` optional plaintext FKs) |
| GET | `/api/v1/workspaces/:workspaceId/contacts` | List contacts (paginated; ciphertext-opaque) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/contacts/:contactId` | Contact upsert / fetch |
| GET | `/api/v1/workspaces/:workspaceId/members` | List members (`userId`, `role`) |
| GET/POST | `/api/v1/workspaces/:workspaceId/invitations` | List / create email invitations (owner/admin) |
| POST | `/api/v1/workspaces/:workspaceId/invitations/:invitationId/seal` | Owner/admin stores client-sealed workspace key for claimed invitee |
| POST | `/api/v1/workspaces/:workspaceId/invitations/:invitationId/cancel` | Cancel active invitation (owner/admin; clears any stored seal) |
| GET | `/api/v1/me/invitations` | Invitations addressed to the caller’s verified email |
| POST | `/api/v1/me/invitations/:invitationId/claim` | Invitee attaches vault `public_key` (must match their `user_crypto` row) |
| POST | `/api/v1/me/invitations/:invitationId/accept` | Atomic membership + `wrapped_keys` insert (seat-gated) |
| GET | `/api/v1/workspaces/:workspaceId/billing` | Plan, status, limits, plaintext usage counts (any member) |
| POST | `/api/v1/workspaces/:workspaceId/billing/checkout` | Owner-only: Stripe Checkout session for the Pro plan → `{ url }` |
| POST | `/api/v1/workspaces/:workspaceId/billing/portal` | Owner-only: Stripe Customer Portal session → `{ url }` |
| POST | `/api/webhooks/stripe` | Stripe webhook (signature-verified; outside `/api/v1` Bearer auth); service-role upserts of billing rows only |

**Invitation lifecycle (P6e):** `waiting_for_recipient` → `waiting_for_owner_seal` → `ready_to_accept` → `accepted` (or `cancelled`). Any email is invitable; invitee signs in with OTP, sets up vault, claims, then an owner/admin seals `workspace_key` to the claimed public key with AAD `wrapped_keys:{workspaceId}:wrapped_key`. Claim stores the caller’s registered `user_crypto.public_key`, so seals can only target the invitee’s own vault key. Cancelling drops the stored seal; a sealed key already opened by the invitee is not recoverable, so rotation stays a later concern. Server never sees plaintext keys.

**List query params:** `limit` (1–100, default 50), opaque `cursor` (keyset on `sort_order ASC, id ASC`), `includeDeleted=true` to include soft-deleted rows. Soft-delete = PUT with `deletedAt` ISO timestamp (schema `deleted_at`). Default lists omit tombstones. Notes list also accepts optional `projectId` / `taskId` (UUID) to filter without decrypting.

**Entitlement gates (P6f):** create mutations (new workspace/project/task/note/contact, invite create, invite accept) are gated by the workspace plan (`BILLING.md`) and return `limit_exceeded` (403) at the cap. Updates, soft-deletes, reads, seal/cancel are never gated. Meters are plaintext row counts only.

Exact paths nest under `/api/v1/workspaces/:workspaceId/...` — keep stable once shipped; breaking changes → `/api/v2`.

## Errors

Stable codes via `packages/api-contract`: `unauthorized`, `forbidden`, `limit_exceeded`, `conflict`, `invalid_ciphertext`, etc.

## Server DB access

Route handlers use Supabase client with the **user JWT**. Service role is used only by `/api/webhooks/stripe` (`apps/web/lib/supabase/service-role.ts`) to upsert `subscriptions` / `billing_events` — never to “helpfully” decrypt or touch vault tables.

**PostgREST / grants:** `authenticated` retains table GRANTs so API routes can query with the user JWT under RLS. The **browser must still never** call the Data API for vault tables — entitlement gates (P6f) live only on `/api/v1`. Closing Data API entirely would require a larger “service-role-only API” redesign; not done in this wave.

See [`ROADMAP.md`](ROADMAP.md) §6 and P4/P5 playbooks.
