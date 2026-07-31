# Vision: helvety.cloud

Swiss (Helvety, Einzelfirma) E2EE workspace product on **helvety.cloud**. Greenfield repo **helvety-cloud**. Older helvety.com apps and the Chromium extension are prototypes to deprecate later. **Do not copy them**.

## Priorities

1. Privacy / zero-knowledge encrypted content  
2. Performance & UX (Linear-like polish continues)  
3. Free base stack (Supabase Free, Vercel Hobby) + Stripe when charging

## Want / don’t / later

| Shipped | Don’t | Later |
|---------|--------|--------|
| Passwordless auth (email OTP) | Passwords; company master key / escrow; Supabase Auth passkeys | Sync push/pull batch API |
| Client E2EE; Helvety cannot decrypt | Copying old Helvety apps/UI/crypto | Extension, Tauri, calendar send-to |
| Workspace-scoped projects/tasks/notes/contacts/boards/comments/milestones/files | Browser PostgREST for encrypted data | Deprecate old helvety.com apps |
| `/api/v1` + TipTap + workspace sharing | Paid Redis/Sentry/analytics | Copy-contact-across-workspaces UX |
| Recovery key (user-held) + Personal workspace | “Email reset restores encrypted data” | Optional Swiss counsel; GmbH if desired |
| Legal pack + acceptance; Stripe Free/Pro Workspace/Capacity Increase | Misleading E2EE marketing | Further Linear-like polish |
| Labels/stages/priorities + entity links + stage board + BPMN boards | Radix shadcn; unused SaaS | |
| Encrypted workspace names, milestone dates, progress chart | Multi-locale UI (attempted, reverted; English only) | |
| Dense shadcn + Base UI | | |

## Foundation proof: still the ZK bar

```text
email OTP → session → PRF passkey → user keys
  → create workspace via /api/v1 → encrypted task → reload → decrypt on device
```

Locked decisions and phase history: [`architecture/ROADMAP.md`](architecture/ROADMAP.md).
