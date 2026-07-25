/**
 * Helvety Cloud client crypto (P3).
 *
 * Zero knowledge: Helvety never holds unwrap capability for user content.
 * Server may later store public keys + wrapped blobs only — never PRF output,
 * recovery plaintext, or raw user/workspace keys.
 */

export {
  ENVELOPE_VERSION,
  KEY_BYTES,
  KEY_CHECK_PLAINTEXT,
  NONCE_BYTES,
  PRF_SALT_BYTES,
} from "./constants";

export { bytesEqual, encodeUtf8, fromBase64Url, randomKeyBytes, toBase64Url } from "./bytes";

export { deriveUnlockKey } from "./hkdf";

export {
  createKeyCheck,
  exportRecoveryKey,
  generatePrfSalt,
  generateRecoveryKey,
  generateUserKeyMaterial,
  importRecoveryKey,
  verifyKeyCheck,
  type UserKeyMaterial,
} from "./keys";

export { wrapKey, unwrapKey } from "./wrap";

export { sealToPublicKey, openSealedKey } from "./seal";

export {
  encrypt,
  decrypt,
  type EncryptParams,
  type DecryptParams,
} from "./content";

export {
  formatAad,
  type CiphertextEnvelope,
  type WrappedKeyEnvelope,
  type SealedKeyEnvelope,
  type ContentAad,
} from "./envelope";
