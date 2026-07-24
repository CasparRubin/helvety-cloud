# P6e — Workspace sharing

## Build

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/prompts/P6e.md @docs/architecture/KEY_HIERARCHY.md @docs/architecture/THREAT_MODEL.md

Implement P6e only. Invite member by email; workspace_members role; seal workspace_key to invitee user_public_key → wrapped_keys with AAD; accept-invite UX. Member decrypts all workspace ciphertext (issues/notes/contacts). No project-level ACL, MLS, or Stripe.
```

**Done when:** Owner invites second user; both decrypt same issue/note/contact ciphertext in that workspace.

**Don’t:** Project-level ACL; MLS; cross-workspace contact sync; Stripe.

## Review

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/THREAT_MODEL.md @docs/architecture/KEY_HIERARCHY.md @docs/architecture/prompts/P6e.md

P6e review only — do not start P6f.

Check: invitee gets wrapped_keys only; cannot access other workspaces; server never sees plaintext keys; AAD on seals; no scope creep. PASS/FAIL + fix-before-P6f.
```
