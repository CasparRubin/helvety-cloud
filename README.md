# Helvety Cloud

End-to-end encrypted workspace product for **[helvety.cloud](https://helvety.cloud)**.

This repository is open source so users and auditors can **verify** our security and privacy claims (zero-knowledge encryption, no server-side decrypt). Licensed under **AGPL-3.0**: see [LICENSE](LICENSE).

## Verify claims

1. [`docs/architecture/THREAT_MODEL.md`](docs/architecture/THREAT_MODEL.md): assets, adversaries, non-goals  
2. [`docs/architecture/KEY_HIERARCHY.md`](docs/architecture/KEY_HIERARCHY.md): client crypto hierarchy  
3. [`docs/architecture/AUTH.md`](docs/architecture/AUTH.md): email OTP session vs WebAuthn PRF unlock  
4. [`docs/architecture/API.md`](docs/architecture/API.md): `/api/v1` + Bearer JWT (encrypted entities never via browser PostgREST)

Security reports: [SECURITY.md](SECURITY.md). Product vision: [`docs/VISION.md`](docs/VISION.md). Locked decisions and phase history: [`docs/architecture/ROADMAP.md`](docs/architecture/ROADMAP.md).

## Local development

```bash
bun install
bun run dev          # http://localhost:3000
bun run test         # Vitest unit tests
bun run lint
bun run typecheck
```

Env template: [`apps/web/.env.example`](apps/web/.env.example). Copy to `apps/web/.env.local` (never commit secrets).

**Stack:** Bun workspaces, Next.js (App Router) on Vercel Hobby, Supabase Auth + Postgres in Zurich (`helvety-cloud`), Stripe for workspace billing, shadcn/ui on Base UI.

AI contributors: see [`AGENTS.md`](AGENTS.md) and [`.cursor/rules/`](.cursor/rules/).

## License

Copyright (c) Helvety by Rubin / Caspar Rubin.

This program is free software under the **GNU Affero General Public License v3.0 only**. See [LICENSE](LICENSE). Network use of a modified version requires offering corresponding source (AGPL §13).
