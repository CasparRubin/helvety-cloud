# P6c — TipTap editor

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6c.md

Implement P6c only. TipTap (or equivalent) for task body; serialize into encrypted blob (versioned plaintext JSON inside ciphertext); autosave via existing PUT. No paid CRDT/Yjs SaaS. No sharing, notes tables, Stripe.
```

**Done when:** Rich body round-trips encrypt → API → decrypt; no plaintext body on server.

**Don’t:** Paid CRDT/Yjs SaaS; sharing; notes tables; Stripe.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6c.md

P6c review only — do not start P6d.

Check: rich body round-trips E2EE; no plaintext body on server; free-tier OK; no scope creep. PASS/FAIL + fix-before-P6d.
```
