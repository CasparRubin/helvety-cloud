# Data model

Blind Postgres on Supabase project `qnoeiurmyyyuawkcifmw`. Schema source of truth: `supabase/schemas/` (from P1/P4). See [`SCHEMA_WORKFLOW.md`](SCHEMA_WORKFLOW.md).

## Plaintext (server-visible metadata)

| Table | Role |
|-------|------|
| `profiles` | `id` = `auth.users.id`; non-secret profile fields if any |
| `user_crypto` | `public_key`, wrapped user/private key blobs, `prf_salt`, `key_check`, versions |
| `workspaces` | Workspace ids, owner/timestamps |
| `workspace_members` | `workspace_id`, `user_id`, `role` |
| `projects` | `id`, `workspace_id`, sort, timestamps |
| `wrapped_keys` | `(subject_type, subject_id, user_id, wrapped_key)` for workspace/project keys |
| Sync helpers | `updated_at`, optional generation/cursor fields |
| Later billing | `subscriptions`, `billing_events` (P6+) |
| `policy_acceptances` | Plaintext signup gates: `user_id`, `policy` (`tos`/`privacy`/`aup`/`e2ee`), `version`, `accepted_at`; unique `(user_id, policy, version)`; append-only for clients |

## Ciphertext (never readable by server)

| Table | Content |
|-------|---------|
| `issues` | `encrypted_blob` holds title/description (and similar); plaintext FKs: `id`, `project_id`, optional status id, sort, `updated_at`, tombstone |
| Later | `notes`, `contacts`, `milestones`, label **names** encrypted; color/id metadata may stay plaintext |

## RLS

- Force RLS on all user data tables.  
- Policies: membership via `workspace_members` (or owner).  
- Auto-expose new tables is **OFF** — grant Data API roles explicitly in migrations.  
- Automatic RLS trigger is **ON** for new public tables.

## Extensibility

New entity = new table + encrypt under existing workspace/project key + membership RLS. No crypto redesign.

See [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md) and [`ROADMAP.md`](ROADMAP.md) P4.
