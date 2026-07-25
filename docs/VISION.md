# Vision — helvety.cloud

Swiss (Helvety, Einzelfirma) E2EE workspace product on **helvety.cloud**. Greenfield repo **helvety-cloud**. Old helvety.com apps and the Chromium extension are prototypes to deprecate later — **do not copy them**.

## Priorities

1. Privacy / zero-knowledge vault content  
2. Performance & UX (Linear-like polish continues)  
3. Free base stack (Supabase Free, Vercel Hobby) + Stripe when charging

## Want / don’t / later

| Shipped (P0–P6f) | Don’t | Later |
|------------------|--------|--------|
| Passwordless auth (OTP + passkey) | Passwords; company master key / escrow | Milestone diagrams, custom labels |
| Client E2EE; Helvety cannot decrypt | Copying old Helvety apps/UI/crypto | Sync push/pull batch API |
| Workspace-scoped projects/tasks/notes/contacts | Browser PostgREST for vault data | Extension, Tauri, calendar send-to |
| `/api/v1` + TipTap + workspace sharing | Paid Redis/Sentry/analytics | Deprecate old helvety.com apps |
| Recovery key (user-held) + Personal workspace | “Email reset restores vault” | Copy-contact-across-workspaces UX |
| Legal pack + acceptance; Stripe entitlements | Misleading E2EE marketing | Optional Swiss counsel; GmbH if desired |
| Dense shadcn + Base UI | Radix shadcn; unused SaaS | Further Linear-like polish |

## Foundation proof (P5) — still the ZK bar

```text
email OTP → session → PRF passkey → user keys
  → create workspace via /api/v1 → encrypted task → reload → decrypt on device
```

See [`architecture/ROADMAP.md`](architecture/ROADMAP.md) for phase playbooks.
