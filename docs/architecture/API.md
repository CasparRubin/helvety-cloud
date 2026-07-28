# API

## Hard rules

1. **Public contract** = versioned HTTP JSON under `/api/v1/*`.  
2. **Auth:** `Authorization: Bearer <Supabase access_token>`.  
3. **Ciphertext-opaque:** no plaintext titles/bodies on the wire to our servers.  
4. **Client-generated UUIDs** + idempotent upserts.  
5. **Workspace-scoped** resources.  
6. Browser **must not** use Supabase Data API (`from('tasks')`) for encrypted entity tables. Supabase **Auth** SDK in the browser is OK.  
7. Do **not** make Next.js Server Actions the only mutation path (extension/native clients later).

## Surfaces

| Plane | Examples |
|-------|----------|
| Control | `PUT /api/v1/me/crypto`, `DELETE /api/v1/me`, `POST /api/v1/workspaces`, workspace invitations, billing/Checkout/portal/addons (see [`BILLING.md`](./BILLING.md)) |
| Data | Task/project/note/contact/milestone/attachment upserts with ciphertext envelopes; later `POST /api/v1/sync/push`, `GET /api/v1/sync/pull?cursor=` |

Realtime (optional later) = wake-up only, not a second write API.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | Liveness |
| GET | `/api/v1/me/policy-acceptances` | Current policy versions + whether accepted |
| PUT | `/api/v1/me/policy-acceptances` | Record ToS/Privacy/AUP/E2EE version acceptances |
| GET | `/api/v1/me/crypto` | Load public key + wrapped user key material |
| PUT | `/api/v1/me/crypto` | Upsert public key + wrapped user key material (requires current policy acceptances) |
| GET | `/api/v1/me` | Account deletion preview (solo / leaving / blocking workspace **ids**; names resolve client-side after unlock) |
| DELETE | `/api/v1/me` | Hard-delete account (cancels solo-owned Stripe subs; blocks if owns shared workspaces; then `auth.admin.deleteUser`) |
| GET | `/api/v1/workspaces` | List workspaces the caller belongs to (id, `encryptedBlob`, kind, role, wrapped key, resolved `plan`) |
| POST | `/api/v1/workspaces` | Create workspace + owner wrapped key (`encryptedBlob`, `kind`, sealed key) |
| GET | `/api/v1/workspaces/:workspaceId` | Workspace id/`encryptedBlob`/kind + caller’s wrapped key |
| PATCH | `/api/v1/workspaces/:workspaceId` | Update workspace ciphertext (`encryptedBlob` only; `kind` immutable) |
| GET | `/api/v1/workspaces/:workspaceId/projects` | List projects (paginated; ciphertext-opaque) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId` | Project upsert / fetch |
| GET | `/api/v1/workspaces/:workspaceId/tasks` | List tasks across the workspace (paginated; ciphertext-opaque; optional `projectId` / `labelId` / `stageId` / `priorityId` / `milestoneId` filters) |
| GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/tasks` | List tasks (paginated; ciphertext-opaque; optional `labelId` / `stageId` / `priorityId` / `milestoneId` filters) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/tasks/:taskId` | Task upsert / fetch (`labelId` / `stageId` / `priorityId` soft refs; `milestoneId` FK; `links` replace outgoing edges) |
| GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/milestones` | List milestones (paginated; ciphertext-opaque) |
| PUT/GET/DELETE | `/api/v1/workspaces/:workspaceId/projects/:projectId/milestones/:milestoneId` | Milestone upsert / fetch / delete |
| GET | `/api/v1/workspaces/:workspaceId/notes` | List notes (paginated; optional `projectId` / `taskId` filters via `entity_links`) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/notes/:noteId` | Note upsert / fetch (`links` replace non-project outgoing edges; optional `projectIds` replace project affiliations) |
| GET | `/api/v1/workspaces/:workspaceId/links` | List entity link edges (`sourceKind`/`sourceId` and/or `targetKind`/`targetId`) |
| GET | `/api/v1/workspaces/:workspaceId/contacts` | List contacts (paginated; ciphertext-opaque; includes `links`) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/contacts/:contactId` | Contact upsert / fetch (`links` replace non-project outgoing edges; optional `projectIds` replace project affiliations) |
| GET | `/api/v1/workspaces/:workspaceId/comments` | List comments for a parent (`parentKind` + `parentId` required; ciphertext-opaque) |
| PUT/DELETE | `/api/v1/workspaces/:workspaceId/comments/:commentId` | Comment upsert / delete (`parentKind`, `parentId`, optional `parentCommentId`; create gated) |
| GET | `/api/v1/workspaces/:workspaceId/members` | List members (`userId`, `role`) |
| GET/POST | `/api/v1/workspaces/:workspaceId/invitations` | List / create email invitations (owner/admin) |
| POST | `/api/v1/workspaces/:workspaceId/invitations/:invitationId/seal` | Owner/admin stores client-sealed workspace key for claimed invitee |
| POST | `/api/v1/workspaces/:workspaceId/invitations/:invitationId/cancel` | Cancel active invitation (owner/admin; clears any stored seal) |
| GET | `/api/v1/me/invitations` | Invitations addressed to the caller’s verified email |
| POST | `/api/v1/me/invitations/:invitationId/claim` | Invitee attaches their `public_key` (must match their `user_crypto` row) |
| POST | `/api/v1/me/invitations/:invitationId/accept` | Atomic membership + `wrapped_keys` insert (member-gated) |
| GET | `/api/v1/workspaces/:workspaceId/billing` | Plan, status, effective limits, usage, Capacity Increase quantity, `freeOverflowLocked` (any member) |
| POST | `/api/v1/workspaces/:workspaceId/billing/checkout` | Owner-only: Stripe Checkout for Pro Workspace (`allow_promotion_codes`) → `{ url }` |
| POST | `/api/v1/workspaces/:workspaceId/billing/sync` | Owner-only: reconcile `subscriptions` from Stripe (post-Checkout self-heal) → same body as GET billing |
| POST | `/api/v1/workspaces/:workspaceId/billing/portal` | Owner-only: Stripe Customer Portal → `{ url }` |
| PUT | `/api/v1/workspaces/:workspaceId/billing/addons` | Owner-only: set Capacity Increase quantity on a Pro Workspace Stripe subscription |
| GET | `/api/v1/workspaces/:workspaceId/attachments` | List attachments (optional `parentKind` + `parentId` filter via `attachment_links`) |
| POST | `/api/v1/workspaces/:workspaceId/attachments` | Create pending attachment + signed upload URL (`encryptedMeta`, `wrappedDek`, `byteSize`) |
| GET | `/api/v1/workspaces/:workspaceId/attachments/:attachmentId` | Fetch attachment metadata envelopes |
| DELETE | `/api/v1/workspaces/:workspaceId/attachments/:attachmentId` | Soft-delete attachment + Storage cleanup |
| POST | `/api/v1/workspaces/:workspaceId/attachments/:attachmentId/complete` | Mark upload ready (or failed) after client PUT to signed URL |
| POST | `/api/v1/workspaces/:workspaceId/attachments/:attachmentId/download` | Signed download URL + meta/DEK envelopes |
| POST | `/api/webhooks/stripe` | Stripe webhook (signature-verified); service-role upserts `subscriptions` / `billing_events` |

**Attachments (P11):** Client encrypts file bytes with a per-file DEK, wraps the DEK under `workspace_key`, and stores filename/mime in `encryptedMeta`. Server stores opaque envelopes + Storage ciphertext only. TipTap `fileAttachment` atoms and `attachment_links` join notes/tasks/contacts to attachment ids without decrypting bodies. Upload/create is entitlement-gated (storage + attachment counts); see [`BILLING.md`](./BILLING.md).

**Invitation lifecycle (P6e):** `waiting_for_recipient` → `waiting_for_owner_seal` → `ready_to_accept` → `accepted` (or `cancelled`). Any email is invitable; invitee signs in with OTP, sets up encryption, claims, then an owner/admin seals `workspace_key` to the claimed public key with AAD `wrapped_keys:{workspaceId}:wrapped_key`. Claim stores the caller’s registered `user_crypto.public_key`, so seals can only target the invitee’s own encryption key. Invitation payloads expose `workspaceEncryptedBlob` (not a plaintext workspace name); the invitee decrypts the name after seal when they hold the workspace key. Cancelling drops the stored seal; a sealed key already opened by the invitee is not recoverable, so rotation stays a later concern. Server never sees plaintext keys.

**List query params:** `limit` (1–100, default 50), opaque `cursor`, `includeDeleted=true` to include soft-deleted rows. Soft-delete = PUT with `deletedAt` ISO timestamp (schema `deleted_at`). Default lists omit tombstones. Most entity lists keyset on `sort_order ASC, id ASC`. Notes list keysets on `created_at DESC, id DESC` (newest first). Notes list also accepts optional `projectId` / `taskId` (UUID) to filter without decrypting (both resolved via `entity_links`). Workspace task list also accepts optional `projectId`. Task lists accept optional `labelId` / `stageId` / `priorityId` (UUID). Option **names** live in workspace ciphertext; these ids are intentional plaintext metadata for filtering.

**Task categorizations (P7/P8d/P8e/P14):** Workspace `encrypted_blob` includes `categorizations` (encrypted names, optional stage `color`, optional option `icon`, optional stage `completionPercent` 0–100). Tasks store `labelId` (nullable), `stageId`, `priorityId` as plaintext soft refs. No separate categorization API; defs ride on workspace PATCH/GET. Client-side weighted progress averages stage weights over non-Cancelled tasks.

**Entity links:** Note / task / contact PUT may include `links: [{ kind, id }]`. Allowed body pairs are note–task/contact and contact–note/task; project affiliations for notes and contacts use optional `projectIds: uuid[]` (0..n) and are stored as `entity_links` with `target_kind = project`. When `links` is provided, the server replaces **non-project** outgoing edges only. When `projectIds` is provided, it replaces **project** outgoing edges only. The server validates pair rules and workspace ownership. Responses include all outgoing links, and `GET …/links` supports backlinks. UUID edges are intentional metadata; titles and colors stay in ciphertext. Inline TipTap `entityRef` nodes remain inside note/task/contact body ciphertext and are extracted on save (project refs are not written from the body).

**Entitlement gates (P6f / P12 / P16):** create mutations (new workspace/project/task/note/contact/comment, invite create, invite accept, attachment upload / new attachment links) are gated by **effective** workspace limits (`BILLING.md`) and return `limit_exceeded` (403) at the cap. Tasks are per-project. Comments + replies share one workspace meter. Soft-locked free-overflow workspaces (`freeOverflowLocked` on GET billing) also block those creates while leaving reads/updates/deletes/export available. Updates, soft-deletes, reads, seal/cancel, and billing actions are never gated by overflow. Meters are plaintext row counts only.

Exact paths nest under `/api/v1/workspaces/:workspaceId/...`. Keep stable once shipped; breaking changes → `/api/v2`.

## Errors

Stable codes via `packages/api-contract`: `unauthorized`, `forbidden`, `limit_exceeded`, `conflict`, `invalid_ciphertext`, etc.

## Server DB access

Route handlers use Supabase client with the **user JWT**. Service role is used by `/api/webhooks/stripe` (`apps/web/lib/supabase/service-role.ts`) to upsert `subscriptions` / `billing_events`, by attachment Storage admin helpers, and by `DELETE /api/v1/me` for `auth.admin.deleteUser`, never to “helpfully” decrypt or touch encrypted entity tables.

**PostgREST / grants:** `authenticated` retains table GRANTs so API routes can query with the user JWT under RLS. The **browser must still never** call the Data API for encrypted entity tables. Entitlement gates (P6f) live only on `/api/v1`. Closing Data API entirely would require a larger “service-role-only API” redesign; not done in this wave.

**Advisor lint `0029_authenticated_security_definer_function_executable`:** expected WARN for invitation / delete / membership / member-cap `SECURITY DEFINER` RPCs that `/api/v1` calls with the user JWT. Do **not** “fix” by revoking `authenticated` EXECUTE; that breaks those routes. Trigger helpers correctly revoke EXECUTE from `authenticated` (service-role or trigger-only).

See [`ROADMAP.md`](ROADMAP.md) and [`BILLING.md`](BILLING.md).
