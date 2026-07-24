# P5-fix — Post-review blockers

```text
@AGENTS.md @docs/architecture/ROADMAP.md @docs/architecture/KEY_HIERARCHY.md @docs/architecture/SCHEMA_WORKFLOW.md @docs/architecture/prompts/P5.md

P5-fix only (from P5 review FAIL). Do not start P6, P-legal, or billing.
```

**Must fix:**

1. AAD on `sealToPublicKey` / `openSealedKey`; wire `wrapped_keys:{workspaceId}:wrapped_key` in vault client.  
2. Recovery export UX: show/download recovery key **and** `recoveryWrappedUserKey`; never POST either.  
3. Reconcile migration `20260724170000` vs remote `20260724150017`; commit schemas + migration + P5 app code.  
4. Revoke or redesign `is_workspace_member` client EXECUTE (advisor WARN).

**Don’t:** P6 features, Stripe, sharing UI, redesigning green P5 paths.
