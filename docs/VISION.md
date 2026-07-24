# Vision — helvety.cloud

Swiss (Helvety, Einzelfirma) E2EE workspace product on **helvety.cloud**. Greenfield repo **helvety-cloud**. Old helvety.com apps and the Chromium extension are prototypes to deprecate later — **do not copy them**.

## Priorities

1. Privacy / zero-knowledge vault content  
2. Performance & UX (Linear-like later)  
3. Free base stack (Supabase Free, Vercel Hobby)

## Want / don’t / later

| Want now (foundation P0–P5) | Don’t | Later (P6+ / P-legal) |
|-----------------------------|--------|------------------------|
| Passwordless auth (OTP + passkey) | Passwords; company master key / escrow | Stripe paywalls |
| Client E2EE; Helvety cannot decrypt | Copying old Helvety apps/UI/crypto | Invite/share (key wrap) |
| Extensible workspace/project schema | Browser PostgREST for vault data | Notes, contacts, custom labels |
| `/api/v1` multi-client ready | Paid Redis/Sentry/analytics in foundation | Linear TipTap UX, milestone diagrams |
| Recovery key / 2nd passkey (user-held) | “Email reset restores vault” | Extension, Tauri, calendar send-to |
| Plain-language legal checklist | Misleading E2EE marketing | Counsel-reviewed ToS/Privacy before public |
| Dense clean UI (shadcn + Base UI) as needed for proof | Overengineering / unused SaaS; Radix shadcn | Full product surface |

## Foundation proof (P5)

```text
email OTP → session → PRF passkey → user keys
  → create workspace via /api/v1 → encrypted issue → reload → decrypt on device
```

See [`architecture/ROADMAP.md`](architecture/ROADMAP.md) for phase playbooks.
