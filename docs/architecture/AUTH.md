# Auth (P2)

Passwordless Supabase Auth for **helvety.cloud**. Session ≠ vault unlock (WebAuthn **PRF** — see P5 wiring in `apps/web/lib/vault/`).

## Policy

| Allowed | Forbidden |
|---------|-----------|
| Email OTP (`signInWithOtp` / `verifyOtp`) | Passwords (`signInWithPassword`, password `signUp`) |
| Passkeys (`registerPasskey` / `signInWithPasskey`) | Claiming Helvety can recover vault content |
| Browser Supabase **Auth** SDK | Browser PostgREST `from('…')` for vault tables |

UI: shadcn/ui **Base UI** (`style: base-nova` in `apps/web/components.json`). Do not init with `-b radix`.

## Client opt-in (passkeys)

Passkeys are experimental in `@supabase/supabase-js` ≥ 2.105. Create clients with:

```ts
auth: { experimental: { passkey: true } }
```

See `apps/web/lib/supabase/{client,server,middleware}.ts`.

## Email OTP template

In the hosted dashboard (**Authentication → Email Templates → Magic Link**), include the code token so the app can verify with `verifyOtp({ type: 'email' })`:

```html
<h2>Helvety Cloud sign-in code</h2>
<p>Enter this code: <strong>{{ .Token }}</strong></p>
```

## WebAuthn RP ID / origins

Passkeys are bound to a **Relying Party ID**. Changing RP ID invalidates all enrolled passkeys.

### Local / P2 foundation (current)

| Setting | Value |
|---------|-------|
| RP display name | Helvety Cloud |
| RP ID | `localhost` |
| Origins | `http://localhost:3000`, `http://127.0.0.1:3000` |

Mirrored in [`supabase/config.toml`](../../supabase/config.toml) for local CLI Auth. Hosted project `qnoeiurmyyyuawkcifmw` should match these while developing against `bun run dev`.

### Production (pre-launch switch)

| Setting | Value |
|---------|-------|
| RP display name | Helvety Cloud |
| RP ID | `helvety.cloud` |
| Origins | `https://helvety.cloud` |

Do this **before** public users enroll passkeys. After the switch, any passkeys registered under `localhost` will not work — users must re-register.

You cannot put both `localhost` and `helvety.cloud` under one RP ID (origins must match or be a subdomain of the RP ID).

## Hosted dashboard checklist (`qnoeiurmyyyuawkcifmw`)

1. **Passwords off** — Authentication → Providers → Email: disable password sign-in; keep email/OTP enabled.
2. **OTP template** — Magic Link template includes `{{ .Token }}` (above).
3. **Passkeys on** — Authentication → Passkeys: enable; RP display name **Helvety Cloud**.
4. **RP (P2 local)** — RP ID `localhost`; origins `http://localhost:3000`, `http://127.0.0.1:3000`.
5. **URL config** — Site URL `http://localhost:3000` (or production URL when live); redirect allowlist includes local origins.

Management API alternative: `PATCH /v1/projects/{ref}/config/auth` with `passkey_enabled`, `webauthn_rp_*` fields (see [Supabase passkeys docs](https://supabase.com/docs/guides/auth/passkeys)).

## App routes

| Route | Role |
|-------|------|
| `/` | Signed-out shell (CTA) or signed-in shell (email, register passkey, sign out) |
| `/login` | Email → OTP code; passkey sign-in |

## Session vs vault

Auth session cookies prove identity to Supabase / `/api/v1`. They do **not** decrypt vault content. Unlock is a **dedicated WebAuthn PRF** credential (Supabase Auth passkeys do not expose PRF) → HKDF → unwrap `user_crypto` (see [`KEY_HIERARCHY.md`](./KEY_HIERARCHY.md)). Recovery export is one-shot offline — never logged or POSTed.
