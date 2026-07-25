# P8b — Editor entity refs + create from selection

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P8b.md @docs/architecture/DATA_MODEL.md

Implement P8b only: TipTap EntityRef atom in note bodies; BubbleMenu create task/contact + link existing; extract refs on save → entity_links.
Project for new tasks = note.project_id or picker. No entity colors / rich badges (P8c).
```

**Done when:** Select text → create task/contact chip; links sync; labels from decrypted cache.

**Don’t:** Colors/badges UI (P8c); AI extract; CRDT; server plaintext search.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P8b.md

P8b review only.

Check: EntityRef in ciphertext only; extract→replace links; create-from-selection; ZK intact. PASS/FAIL.
```
