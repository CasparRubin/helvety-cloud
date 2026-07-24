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
| PUT | `/api/v1/me/crypto` | Public key + wrapped user key material |
| POST | `/api/v1/workspaces` | Create workspace + owner wrapped key |
| PUT/GET | workspace/project/issue paths | Ciphertext upsert/fetch |

Exact paths may nest under `/api/v1/workspaces/:workspaceId/...` — keep stable once shipped; breaking changes → `/api/v2`.

## Errors

Stable codes via `packages/api-contract`: `unauthorized`, `forbidden`, `limit_exceeded`, `conflict`, `invalid_ciphertext`, etc.

## Server DB access

Route handlers use Supabase client with the **user JWT**. Service role only for justified server jobs (e.g. Stripe webhooks later) — never to “helpfully” decrypt.

See [`ROADMAP.md`](ROADMAP.md) §6 and P4/P5 playbooks.
