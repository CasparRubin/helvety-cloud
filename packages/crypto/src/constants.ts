/** Envelope format version for ciphertext and wrapped-key blobs. */
export const ENVELOPE_VERSION = 1 as const;

/** AES-256 key length in bytes. */
export const KEY_BYTES = 32;

/** AES-GCM nonce length in bytes. */
export const NONCE_BYTES = 12;

/** PRF salt length in bytes (stored server-side later as prf_salt). */
export const PRF_SALT_BYTES = 32;

/** Fixed plaintext used for key_check verification. */
export const KEY_CHECK_PLAINTEXT = "helvety-cloud/key-check-v1";

/** HKDF info for PRF → unlock_key. */
export const UNLOCK_HKDF_INFO = new TextEncoder().encode(
  "helvety-cloud/unlock-v1",
);

/** HKDF info for X25519 ECDH → seal wrapping key. */
export const SEAL_HKDF_INFO = new TextEncoder().encode(
  "helvety-cloud/seal-v1",
);
