# P6d — Notes + contacts

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6d.md @docs/architecture/DATA_MODEL.md @docs/architecture/SCHEMA_WORKFLOW.md @docs/architecture/KEY_HIERARCHY.md

Implement P6d only. Workspace-scoped notes + contacts: declarative schema (required workspace_id, encrypted_blob; notes may have nullable project_id/issue_id); RLS + grants; migrate qnoeiurmyyyuawkcifmw only; /api/v1 + UI. Notes = dynamic encrypted JSON. Contacts under workspace_key (duplicates across workspaces OK). AAD bound. Free-tier/greenfield.

No user-global contacts; no null workspace; no sharing UI; no Stripe.
```

**Done when:** Notes/contacts schema + migrations + types + `/api/v1` + UI; workspace-only; ciphertext-opaque.

**Don’t:** User-global contacts; `workspace_id = null`; sharing UI; Stripe; milestones/labels.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/DATA_MODEL.md @docs/architecture/prompts/P6d.md

P6d review only — do not start P6e.

Check: schema/migrations/types; workspace-only; ciphertext-opaque; advisors OK; no global contacts; no sharing/Stripe creep. Use Supabase MCP if useful. PASS/FAIL + fix-before-P6e.
```
