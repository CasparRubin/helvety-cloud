# P6b — Projects + tasks (E2EE)

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6b.md @docs/architecture/API.md @docs/architecture/KEY_HIERARCHY.md @docs/architecture/DATA_MODEL.md

Implement P6b only. Projects + tasks under a workspace: list/create/reorder projects; task list + detail with encrypted title/body (AES-GCM + AAD); list/paginate /api/v1 endpoints; decrypt with workspace_key from wrapped_keys. Soft-delete if schema supports. Free-tier/greenfield.

No TipTap, notes/contacts, sharing, Stripe.
```

**Done when:** Create/edit/list/reload tasks across sessions; API/DB stay ciphertext-opaque.

**Don’t:** TipTap, notes/contacts, sharing, Stripe, labels/attachments polish.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/THREAT_MODEL.md @docs/architecture/prompts/P6b.md

P6b review only — do not start P6c.

Check: ciphertext-opaque API; AAD correct; reload decrypt works; no plaintext titles in DB/API; no scope creep. PASS/FAIL + fix-before-P6c. Prefer a manual create→reload→decrypt check.
```
