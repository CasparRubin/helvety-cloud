# Helvety Cloud

Greenfield E2EE workspace product for **[helvety.cloud](https://helvety.cloud)**.

**Start here for agents and humans:** [`docs/architecture/ROADMAP.md`](docs/architecture/ROADMAP.md) · [`AGENTS.md`](AGENTS.md)

## Local development

```bash
bun install
bun run dev          # http://localhost:3000 — signed-out shell / sign-in
bun run test         # Vitest workspace smoke
bun run lint
bun run typecheck
```

Env templates: [`.env.example`](.env.example) and [`apps/web/.env.example`](apps/web/.env.example). Copy to `apps/web/.env.local` (never commit secrets).

Auth (email OTP + passkeys, passwords off): [`docs/architecture/AUTH.md`](docs/architecture/AUTH.md) — includes RP ID / origins for `localhost` and `helvety.cloud`.

UI: shadcn **Base UI** (`apps/web`, preset `base-nova`).

Supabase project: `helvety-cloud` (`qnoeiurmyyyuawkcifmw`, Zurich). Do not use the old helvety.com Supabase project (`bkdzeihxzvrkndjvyzye`).
