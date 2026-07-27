# Threat model

## Assets

- User encrypted content (workspace names, project/task/note/contact/milestone titles and bodies, file metadata and ciphertext, categorization names/colors)
- User encryption keys (symmetric + private asymmetric)
- Unlock material (WebAuthn PRF output, recovery key)
- Account identity (email, session JWT)
- Membership / billing metadata

## Adversaries & assumptions

| Threat | Assumption / mitigation |
|--------|-------------------------|
| **Honest-but-curious server** (Helvety staff, compromised admin, stolen DB dump) | All encrypted content encrypted client-side. Server stores ciphertext + public keys + wrapped key blobs only. Service role cannot decrypt. **Intentional metadata** also visible: membership, categorization soft-ref ids on tasks, and the `entity_links` UUID graph (which ids are linked, never titles, chip labels, or accent colors). |
| **Network attacker** | TLS in transit; ciphertext still opaque if intercepted at rest on disk. |
| **Malicious invitee** | Only receives keys sealed to their public key after claim; AUP + ToS; cannot escalate to other workspaces without membership. Invitation claim requires verified JWT email match. |
| **Lost / stolen device** | Unlock keys live in memory until explicit lock or sign-out; unlock passkey / OS unlock; user can revoke sessions; offline `helvety-recovery.json` for passkey loss. |
| **Phishing** | Email OTP creates a session (phishable); encrypted unlock is a separate WebAuthn PRF credential bound to the page origin (RP ID from hostname). Session ≠ decrypt. |
| **Compelled disclosure** | Helvety can produce account metadata, the entity link graph (UUID edges), categorization soft-ref ids, and ciphertext it holds; **cannot** produce plaintext encrypted content (titles, bodies, colors, option names) without user keys. Document this honestly in legal/E2EE notices. |

## Explicit non-goals (no backdoor)

- No company master key  
- No HSM escrow of user keys  
- No “support can reset encryption”  
- No plaintext search index of encrypted titles/bodies on the server  
- No “forgot unlock passkey → email link decrypts data”

Lost all unlock methods (unlock passkey + recovery key) ⇒ **permanent data loss**. Product must warn at setup.

## Trust boundaries

```text
[User device]  plaintext only here after unlock
     |  ciphertext + public keys + wrapped blobs
[helvety.cloud API / Vercel]
     |
[Supabase Postgres]  blind store + RLS
```

Auth (Supabase Auth) identifies the user; it does **not** unlock encrypted content.

## Related

- [`KEY_HIERARCHY.md`](KEY_HIERARCHY.md)  
- [`LEGAL_REQUIREMENTS.md`](LEGAL_REQUIREMENTS.md)  
- [`ROADMAP.md`](ROADMAP.md) 
