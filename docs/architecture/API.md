# API

## Hard rules

1. **Public contract** = versioned HTTP JSON under `/api/v1/*`.  
2. **Auth:** `Authorization: Bearer <Supabase access_token>`.  
3. **Ciphertext-opaque:** no plaintext titles/bodies on the wire to our servers.  
4. **Client-generated UUIDs** + idempotent upserts.  
5. **Workspace-scoped** resources.  
6. Browser **must not** use Supabase Data API (`from('issues')`) for vault tables. Supabase **Auth** SDK in the browser is OK.  
7. Do **not** make Next.js Server Actions the only mutation path (extension/native clients later).

## Surfaces

| Plane | Examples |
|-------|----------|
| Control | `PUT /api/v1/me/crypto`, `POST /api/v1/workspaces`, invites (later), Checkout (later) |
| Data | Issue/project upserts with `encrypted_blob`; later `POST /api/v1/sync/push`, `GET /api/v1/sync/pull?cursor=` |

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
| GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/issues` | List issues (paginated; ciphertext-opaque) |
| PUT/GET | `/api/v1/workspaces/:workspaceId/projects/:projectId/issues/:issueId` | Issue upsert / fetch |

**List query params:** `limit` (1–100, default 50), opaque `cursor` (keyset on `sort_order ASC, id ASC`), `includeDeleted=true` to include soft-deleted rows. Soft-delete = PUT with `deletedAt` ISO timestamp (schema `deleted_at`). Default lists omit tombstones.

Exact paths nest under `/api/v1/workspaces/:workspaceId/...` — keep stable once shipped; breaking changes → `/api/v2`.

## Errors

Stable codes via `packages/api-contract`: `unauthorized`, `forbidden`, `limit_exceeded`, `conflict`, `invalid_ciphertext`, etc.

## Server DB access

Route handlers use Supabase client with the **user JWT**. Service role only for justified server jobs (e.g. Stripe webhooks later) — never to “helpfully” decrypt.

See [`ROADMAP.md`](ROADMAP.md) §6 and P4/P5 playbooks.
