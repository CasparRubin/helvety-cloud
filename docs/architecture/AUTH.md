# Auth (P2)

Passwordless Supabase Auth for **helvety.cloud**. Session ≠ encrypted unlock (WebAuthn **PRF**; see P5 wiring in `apps/web/lib/client-crypto/`).

## Policy

| Allowed                                              | Forbidden                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Email OTP (`signInWithOtp` / `verifyOtp`)            | Passwords (`signInWithPassword`, password `signUp`)              |
| Encryption unlock via WebAuthn **PRF** (client-only) | Supabase Auth passkeys (`registerPasskey` / `signInWithPasskey`) |
| Browser Supabase **Auth** SDK                        | Browser PostgREST `from('…')` for encrypted entity tables        |
|                                                      | Claiming Helvety can recover encrypted content                   |

UI: shadcn/ui **Base UI** (`style: base-nova` in `apps/web/components.json`). Do not init with `-b radix`.

## Clients

Session refresh runs in Next.js [`apps/web/proxy.ts`](../../apps/web/proxy.ts) (Next.js 16 file convention; not the deprecated `middleware` name), which calls `updateSession` in `apps/web/lib/supabase/proxy.ts`. Browser / RSC clients: `apps/web/lib/supabase/{client,server}.ts`.

Do **not** enable `experimental: { passkey: true }`. Account auth is email OTP only.

## Email OTP template

In the hosted dashboard (**Authentication → Email Templates → Magic Link**), include the code token so the app can verify with `verifyOtp({ type: 'email' })`:

```html
<h2>Helvety Cloud sign-in code</h2>
<p>Enter this code: <strong>{{ .Token }}</strong></p>
```

## Hosted dashboard checklist (`qnoeiurmyyyuawkcifmw`)

1. **Passwords off**: Authentication → Providers → Email: disable password sign-in; keep email/OTP enabled.
2. **OTP template**: Magic Link template includes `{{ .Token }}` (above).
3. **Passkeys off**: Authentication → Passkeys: disable (sign-in is OTP only).
4. **URL config**: Site URL for the environment (`http://localhost:3000` while developing, `https://helvety.cloud` in production); redirect allowlist includes the origins you use.

## Encryption unlock RP ID (client-only)

Encryption unlock uses a **dedicated WebAuthn PRF** credential created in the browser (`apps/web/lib/client-crypto/prf.ts`). It is **not** configured in Supabase Auth.

The RP ID is derived from `window.location.hostname`: `localhost` locally, and always `helvety.cloud` for both `helvety.cloud` and `www.helvety.cloud` so apex and www share the same unlock passkey. Credentials enrolled under `localhost` do not work on production and vice versa. Prefer apex (`https://helvety.cloud`) and keep a www → apex redirect.

## App routes

| Route    | Role                                      |
| -------- | ----------------------------------------- |
| `/`      | Signed-out shell (CTA) or signed-in shell |
| `/login` | Email → OTP code → session                |

## Session vs encryption unlock

Auth session cookies prove identity to Supabase / `/api/v1`. They do **not** decrypt content. Unlock is a **dedicated WebAuthn PRF** credential → HKDF → unwrap `user_crypto` (see [`KEY_HIERARCHY.md`](./KEY_HIERARCHY.md)). Recovery export is one-shot offline, never logged or POSTed.
