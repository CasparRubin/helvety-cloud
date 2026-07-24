# P6a — App shell + workspaces

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6a.md @docs/architecture/AUTH.md @docs/architecture/KEY_HIERARCHY.md

Implement P6a only. Replace the P5 proof card with an app shell: policy gate → PRF unlock → /app chrome with workspace switcher. List/create workspaces via /api/v1 (add list endpoint if missing). On first vault setup, ensure a Personal workspace. Keys in memory only. Dense shadcn Base UI. Free-tier/greenfield.

Do not implement issue lists, TipTap, notes/contacts tables, sharing, or Stripe.
```

**Done when:** Signed-in user accepts policies → unlocks → has Personal workspace (and can create more) → navigates `/app` without the P5 proof card as primary UX.

**Don’t:** Issue lists, TipTap, notes/contacts schema, sharing, Stripe.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6a.md

P6a review only — do not start P6b.

Check: unlock/session separation; Personal workspace; workspace switcher; no browser from('…') for vault; no P6b+ scope; free-tier OK. PASS/FAIL + fix-before-P6b.
```
