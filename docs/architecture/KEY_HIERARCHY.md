# Key hierarchy

Client-only cryptography. Helvety never holds unwrap capability for user content.

## Hierarchy

```text
Passkey PRF output
  → HKDF → unlock_key
       → wraps user_symmetric_key
            → wraps user_private_key (X25519)
       user_public_key → stored on server (plaintext) for future invites

workspace_key / project_key (CSPRNG)
  → sealed to each member’s user_public_key → wrapped_keys rows
  → encrypts user-authored content (AES-256-GCM)

Optional: recovery_key (high entropy, shown once)
  → wraps user_symmetric_key (user stores offline)
```

## Algorithms (foundation)

| Use | Algorithm |
|-----|-----------|
| Content | AES-256-GCM, unique IV/nonce per encrypt |
| KDF | HKDF from PRF material |
| Key wrap (asymmetric) | X25519 (or RSA-OAEP if forced by platform constraints — prefer X25519) |
| Binding | AAD includes `table:recordId:field` for **content, symmetric wraps, and X25519 seals** so ciphertext cannot be moved across rows/columns. `wrapKey`/`unwrapKey` and `sealToPublicKey`/`openSealedKey` bind AAD; `key_check` uses real `userId` (not `"self"`). |

## Envelope

Versioned ciphertext blob: version, nonce, ciphertext, key_version. Exact Zod shape lives in `packages/api-contract` (P4).

## Phases

| Phase | What lands |
|-------|------------|
| P3 | Library + tests only (`packages/crypto`) |
| P4 | `user_crypto`, `wrapped_keys` tables + wrap/key_check AAD |
| P5 | Wire unlock → API → encrypt task round-trip (**done**) |
| P6e | Seal `workspace_key` to invitees via claim → owner seal → accept (**done**) |
| P6+ | Project keys / richer sharing if needed |
| P11 | Per-file DEK + binary AES-GCM for Storage objects; meta/wrap envelopes under `workspace_key` |

## Forbidden

- Server-side derivation of unlock keys  
- Storing PRF output or recovery plaintext on server  
- MLS / OpenMLS in foundation (revisit later if needed)

See [`THREAT_MODEL.md`](THREAT_MODEL.md) and [`ROADMAP.md`](ROADMAP.md) §5.
