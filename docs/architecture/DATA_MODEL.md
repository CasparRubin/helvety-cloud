# Data model

Blind Postgres on Supabase project `qnoeiurmyyyuawkcifmw`. Schema source of truth: `supabase/schemas/` (from P1/P4). See [`SCHEMA_WORKFLOW.md`](SCHEMA_WORKFLOW.md).

## Access model (locked)

All vault entities are **workspace-scoped**. There is no user-global contacts/notes store.

```text
Workspace  (members + per-member wrapped_keys)
  ├── projects → issues
  ├── notes     (required workspace_id; optional project/issue FKs; dynamic encrypted JSON)
  └── contacts  (workspace address book; no global dedupe)
```

- **Personal workspace** — created/ensured on first vault setup (P6a); home for “general” notes/contacts.  
- Invite (P6e) = email invitation → invitee claims with vault `public_key` → owner seals `workspace_key` (AAD `wrapped_keys:{workspaceId}:wrapped_key`) → accept inserts membership + wrap. Members decrypt **all** ciphertext in that workspace.
- Same person in two workspaces ⇒ **two contact rows**. Later softener: copy-to-workspace (client re-encrypts).  
- **Reject:** user-global contact graph; notes with `workspace_id = null`; project-level key ACLs for contacts.

See [`ROADMAP.md`](ROADMAP.md) §4 access model + P6a–P6f.

## Plaintext (server-visible metadata)

| Table | Role |
|-------|------|
| `profiles` | `id` = `auth.users.id`; non-secret profile fields if any |
| `user_crypto` | `public_key`, wrapped user/private key blobs, `prf_salt`, `key_check`, versions |
| `workspaces` | Workspace ids, plaintext `name`, `kind` (`personal` \| `standard`), owner/timestamps; at most one Personal per owner |
| `workspace_members` | `workspace_id`, `user_id`, `role` |
| `workspace_invitations` | Email-targeted invites: normalized `email`, invited role (`admin`\|`member`), claim (`claimed_by`, `claimed_public_key` — always the claimer’s `user_crypto.public_key`), owner-produced `sealed_workspace_key` (cleared on cancel), accept/cancel timestamps |
| `projects` | `id`, `workspace_id`, sort, timestamps, tombstone |
| `notes` | `id`, `workspace_id`, optional `project_id` / `issue_id`, sort, timestamps, tombstone |
| `contacts` | `id`, `workspace_id`, sort, timestamps, tombstone |
| `wrapped_keys` | `(subject_type, subject_id, user_id, wrapped_key)` for workspace/project keys |
| Sync helpers | `updated_at`, optional generation/cursor fields |
| `subscriptions` (P6f) | PK `workspace_id`; `plan` (`free`\|`pro`), Stripe `status`, `stripe_customer_id` / `stripe_subscription_id` / `stripe_price_id`, `current_period_end`, `cancel_at_period_end`. Members SELECT only; writes via service-role webhook |
| `billing_events` (P6f) | Webhook audit + idempotency: unique `stripe_event_id`, `type`, nullable `workspace_id`, raw event `payload` (billing metadata only). No client grants; service-role only |
| `policy_acceptances` | Plaintext signup gates: `user_id`, `policy` (`tos`/`privacy`/`aup`/`e2ee`), `version`, `accepted_at`; unique `(user_id, policy, version)`; append-only for clients |

## Ciphertext (never readable by server)

| Table | Content |
|-------|---------|
| `projects` | `encrypted_blob` holds `{ name }`; plaintext FKs: `id`, `workspace_id`, sort, timestamps, tombstone |
| `issues` | `encrypted_blob` holds `{ version: 1, title, body }` where `body` is TipTap JSON (`{ type: "doc", content: [...] }`); legacy unversioned `{ title, body: string }` is normalized on decrypt; plaintext FKs: `id`, `project_id`, optional status id, sort, `updated_at`, tombstone |
| `notes` (P6d) | Required `workspace_id`; `encrypted_blob` = `{ version: 1, title, body, tags }` where `body` is TipTap JSON (`{ type: "doc", content: [...] }`) and `tags` is `string[]`; optional nullable plaintext `project_id` / `issue_id` for filtered lists without decrypting all notes |
| `contacts` (P6d) | Required `workspace_id`; `encrypted_blob` = `{ version: 1, displayName, emails, phones, notes }` under **workspace_key**; duplicates across workspaces OK |
| Later | `milestones`, label **names** encrypted; color/id metadata may stay plaintext |

## RLS

- Force RLS on all user data tables.  
- Policies: membership via `workspace_members` (or owner).  
- Auto-expose new tables is **OFF** — grant Data API roles explicitly in migrations.  
- Automatic RLS trigger is **ON** for new public tables.

## Extensibility

New entity = new table + encrypt under existing **workspace_key** (or project key when needed) + membership RLS. No crypto redesign. No orphan entities outside a workspace.

See [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md) and [`ROADMAP.md`](ROADMAP.md) P4 / P6a–P6f.
