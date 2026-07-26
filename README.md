# Helvety Cloud

Greenfield E2EE workspace product for **[helvety.cloud](https://helvety.cloud)**.

This repository is open source so users and auditors can **verify** our security and privacy claims (zero-knowledge encryption, no server-side decrypt). It is licensed under the **AGPL-3.0** (copyleft): see [LICENSE](LICENSE).

**Start here:** [`docs/architecture/ROADMAP.md`](docs/architecture/ROADMAP.md) · [`AGENTS.md`](AGENTS.md)  
Cursor / AI contributors: [`.cursor/rules/`](.cursor/rules/) encode the same non-negotiables (ZK, free-tier, `/api/v1`, correct Supabase project).

## Local development

```bash
bun install
bun run dev          # http://localhost:3000: signed-out shell / sign-in
bun run test         # Vitest unit tests
bun run lint
bun run typecheck
```

Env template: [`apps/web/.env.example`](apps/web/.env.example). Copy to `apps/web/.env.local` (never commit secrets).

Auth (email OTP only, passwords off; encrypted unlock via WebAuthn PRF): [`docs/architecture/AUTH.md`](docs/architecture/AUTH.md).

UI: shadcn **Base UI** (`apps/web`, preset `base-nova`).

Supabase project: `helvety-cloud` (`qnoeiurmyyyuawkcifmw`, Zurich). Do not use the old helvety.com Supabase project (`bkdzeihxzvrkndjvyzye`).

## License

Copyright (c) Helvety by Rubin / Caspar Rubin.

This program is free software under the **GNU Affero General Public License v3.0 only**. See [LICENSE](LICENSE). Network use of a modified version requires offering corresponding source (AGPL §13).
