# Threat model

## Assets

- User vault content (issue titles/bodies, later notes/contacts, etc.)
- User encryption keys (symmetric + private asymmetric)
- Unlock material (WebAuthn PRF output, recovery key)
- Account identity (email, session JWT)
- Membership / billing metadata

## Adversaries & assumptions

| Threat | Assumption / mitigation |
|--------|-------------------------|
| **Honest-but-curious server** (Helvety staff, compromised admin, stolen DB dump) | All vault content encrypted client-side. Server stores ciphertext + public keys + wrapped key blobs only. Service role cannot decrypt. |
| **Network attacker** | TLS in transit; ciphertext still opaque if intercepted at rest on disk. |
| **Malicious invitee** (later sharing) | Only receives keys sealed to them; AUP + ToS; cannot escalate to other workspaces without membership. |
| **Lost / stolen device** | Vault idle lock; passkey/OS unlock; user can revoke sessions; recovery key offline. |
| **Phishing** | Passkeys (WebAuthn) for auth; RP ID bound to helvety.cloud. |
| **Compelled disclosure** | Helvety can produce account metadata and ciphertext it holds; **cannot** produce plaintext vault content without user keys. Document this honestly in legal/E2EE notices. |

## Explicit non-goals (no backdoor)

- No company master key  
- No HSM escrow of user keys  
- No “support can reset encryption”  
- No plaintext search index of vault titles/bodies on the server  
- No “forgot passkey → email link decrypts vault”

Lost all unlock methods (passkeys + recovery key) ⇒ **permanent data loss**. Product must warn at setup.

## Trust boundaries

```text
[User device]  plaintext only here after unlock
     |  ciphertext + public keys + wrapped blobs
[helvety.cloud API / Vercel]
     |
[Supabase Postgres]  blind store + RLS
```

Auth (Supabase Auth) identifies the user; it does **not** unlock vault content.

## Related

- [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md)  
- [`LEGAL_REQUIREMENTS.md`](LEGAL_REQUIREMENTS.md)  
- [`ROADMAP.md`](ROADMAP.md) §5–§8  
