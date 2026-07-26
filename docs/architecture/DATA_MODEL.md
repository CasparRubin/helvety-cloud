# Data model

Blind Postgres on Supabase project `qnoeiurmyyyuawkcifmw`. Schema source of truth: `supabase/schemas/` (from P1/P4). See [`SCHEMA_WORKFLOW.md`](SCHEMA_WORKFLOW.md).

## Access model (locked)

All encrypted entities are **workspace-scoped**. There is no user-global contacts/notes store.

```text
Workspace  (members + per-member wrapped_keys)
  ├── projects → milestones → tasks
  ├── notes     (required workspace_id; TipTap body may embed EntityRef + fileAttachment; project affiliation via entity_links)
  ├── contacts  (workspace address book; no global dedupe; project affiliation via entity_links)
  ├── entity_links  (constrained plaintext cross-entity links; intentional metadata)
  └── attachments + attachment_links  (E2EE files in Storage; TipTap fileAttachment atoms)
```

- **Personal workspace**: created/ensured on first encryption setup (P6a); home for “general” notes/contacts.  
- Invite (P6e) = email invitation → invitee claims with their `public_key` → owner seals `workspace_key` (AAD `wrapped_keys:{workspaceId}:wrapped_key`) → accept inserts membership + wrap. Members decrypt **all** ciphertext in that workspace.
- Same person in two workspaces ⇒ **two contact rows**. Later softener: copy-to-workspace (client re-encrypts).  
- **Reject:** user-global contact graph; notes with `workspace_id = null`; project-level key ACLs for contacts.
- Structural relationships use FKs: project → tasks/milestones, milestone → tasks.
- Cross-entity links are limited to note ↔ task/contact/project and contact ↔ note/project/task. Other entity pairs are rejected. Notes and contacts may link to **0..n projects** via `entity_links` (managed separately from TipTap body refs).

See [`ROADMAP.md`](ROADMAP.md) §4 access model + P6a–P6f.

## Plaintext (server-visible metadata)

| Table | Role |
|-------|------|
| `profiles` | `id` = `auth.users.id`; non-secret profile fields if any |
| `user_crypto` | `public_key`, wrapped user/private key blobs, `prf_salt`, `key_check`, versions |
| `workspaces` | Workspace ids, `kind` (`personal` \| `standard`), owner/timestamps; at most one Personal per owner. Display **name** is ciphertext (`encrypted_blob`), not plaintext. |
| `workspace_members` | `workspace_id`, `user_id`, `role` |
| `workspace_invitations` | Email-targeted invites: normalized `email`, invited role (`admin`\|`member`), claim (`claimed_by`, `claimed_public_key`; always the claimer’s `user_crypto.public_key`), owner-produced `sealed_workspace_key` (cleared on cancel), accept/cancel timestamps |
| `projects` | `id`, `workspace_id`, sort, timestamps, tombstone |
| `milestones` (P10) | `id`, `project_id`, sort, timestamps, tombstone |
| `notes` | `id`, `workspace_id`, sort, timestamps, tombstone |
| `contacts` | `id`, `workspace_id`, sort, timestamps, tombstone |
| `entity_links` | Constrained UUID edges: `workspace_id`, `source_kind`/`source_id`, `target_kind`/`target_id`; unique per edge. Allowed pairs are note–task/contact/project and contact–note/project/task. Note/contact → project edges are multi-project affiliations (0..n). **Intentional metadata**: Helvety sees which ids are linked, never titles/colors. |
| `wrapped_keys` | `(subject_type, subject_id, user_id, wrapped_key)` for workspace/project keys |
| Sync helpers | `updated_at`, optional generation/cursor fields |
| `subscriptions` (P6f/P12) | PK `workspace_id`; `plan` (`free`\|`pro`), Stripe `status`, `billing_source` (`stripe`\|`comp`), discount snapshot + `unmetered`, `addon_quantities` jsonb, Stripe ids, period fields. Members SELECT only; writes via service-role webhook / redeem |
| `discount_codes` (P12) | Admin catalog: `code`, `percent_off` (1–100), validity, `redemption_count`, optional `stripe_coupon_id`. No client grants |
| `billing_events` (P6f) | Webhook audit + idempotency: unique `stripe_event_id`, `type`, nullable `workspace_id`, raw event `payload` (billing metadata only). No client grants; service-role only |
| `attachments` (P11) | Workspace-scoped file ciphertext in Storage: plaintext `byte_size`, `storage_path`, `status` (`pending`\|`ready`\|`failed`), timestamps, tombstone; ciphertext `encrypted_meta` + `wrapped_dek` envelopes |
| `attachment_links` (P11) | Plaintext junction: `parent_kind`/`parent_id` (`note`\|`task`\|`contact`) → `attachment_id` for reverse lookup + cascade cleanup without decrypting TipTap bodies |
| `policy_acceptances` | Plaintext signup gates: `user_id`, `policy` (`tos`/`privacy`/`aup`/`e2ee`), `version`, `accepted_at`; unique `(user_id, policy, version)`; append-only for clients |

## Ciphertext (never readable by server)

| Table | Content |
|-------|---------|
| `projects` | `encrypted_blob` holds `{ name, description, categorizations, color? }` where `description` is TipTap JSON; `categorizations` has `labels` / `stages` / `priorities` arrays of `{ id, name, sortOrder, color?, icon?, isDefault?, maxVisibleTasks?, completionPercent? }` (names + colors + icons + stage weights encrypted); stage `color` is an `EntityColor` palette token; option `icon` is an allowlisted Lucide token; stages may store `completionPercent` (0–100) for weighted progress; optional top-level `color` is a palette token; plaintext FKs: `id`, `workspace_id`, sort, timestamps, tombstone |
| `milestones` (P10/P14) | `encrypted_blob` holds `{ version: 1, title, description, startDate, endDate }` where `description` is TipTap JSON and dates are `YYYY-MM-DD` or null (encrypted for ZK; Helvety cannot see schedules); plaintext FKs: `id`, `project_id`, sort, timestamps, tombstone |
| `tasks` | `encrypted_blob` holds `{ version: 1, title, body, dueDate }` where `body` is TipTap JSON that may include allowed `entityRef` atoms; **no per-task accent**; chip color comes from the task’s stage option color; plaintext FKs: `id`, `project_id`, optional `label_id`, `stage_id`, `priority_id` (soft refs to option UUIDs in project ciphertext; **intentional metadata**: Helvety can see workflow structure/clustering, not option names), optional `milestone_id` FK → `milestones` ON DELETE SET NULL (intentional clustering metadata), sort, `updated_at`, tombstone. |
| `notes` (P6d/P8) | Required `workspace_id`; `encrypted_blob` = `{ version: 1, title, body }` where `body` is TipTap JSON that may include `entityRef` atoms `{ type: "entityRef", attrs: { kind, id } }` (P8b). Task/contact/project associations live in `entity_links` (project edges are affiliations, not body refs). Note chips use the kind fallback color (no per-note accent). |
| `contacts` | Required `workspace_id`; `encrypted_blob` = `{ version: 1, firstName, lastName, jobTitle, emails, phones, notes, color? }` under **workspace_key**; `notes` is TipTap JSON and may include allowed `entityRef` atoms; optional `color` palette token; duplicates across workspaces OK. |
| `attachments` (P11) | `encrypted_meta` = `{ filename, mimeType }` envelope; `wrapped_dek` under workspace_key; raw file ciphertext in Storage (`encrypted-attachments/{workspaceId}/{attachmentId}`) as packed binary AES-GCM. TipTap `fileAttachment` atoms + `attachment_links` junction. |
| `workspaces` (P14) | `encrypted_blob` = `{ version: 1, name }` under **workspace_key** (AAD `workspaces:{id}:encrypted_blob`). `kind` stays plaintext. |

## RLS

- Force RLS on all user data tables.  
- Policies: membership via `workspace_members` (or owner).  
- Auto-expose new tables is **OFF**. Grant Data API roles explicitly in migrations.  
- Automatic RLS trigger is **ON** for new public tables.

## Extensibility

New entity = new table + encrypt under existing **workspace_key** (or project key when needed) + membership RLS. No crypto redesign. No orphan entities outside a workspace.

See [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md) and [`ROADMAP.md`](ROADMAP.md) P4 / P6a–P6f.
