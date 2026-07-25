# P8a — Entity link graph

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P8a.md @docs/architecture/DATA_MODEL.md

Implement P8a only: entity_links junction; migrate notes.task_id → links; note PUT links replace; reverse lookup API; multi-link UI on notes.
Keep notes.project_id. No TipTap EntityRef (P8b). No colors/badges (P8c).
```

**Done when:** Many-to-many note↔task links; task_id column gone; reverse lookup works.

**Don’t:** TipTap EntityRef; BubbleMenu; entity colors; cross-workspace links.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/DATA_MODEL.md @docs/architecture/prompts/P8a.md

P8a review only.

Check: junction + RLS; migrate drop task_id; no titles in links; API validates workspace IDs. PASS/FAIL.
```
