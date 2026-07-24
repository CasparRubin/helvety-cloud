import { ENVELOPE_VERSION } from "./constants";

/**
 * Versioned AES-GCM ciphertext blob (content or key_check).
 * Zod shape: packages/api-contract.
 */
export type CiphertextEnvelope = {
  v: typeof ENVELOPE_VERSION;
  nonce: string;
  ciphertext: string;
  keyVersion: number;
};

/**
 * Versioned AES-GCM wrapped key blob (unlock/recovery wraps).
 */
export type WrappedKeyEnvelope = {
  v: typeof ENVELOPE_VERSION;
  nonce: string;
  ciphertext: string;
  keyVersion: number;
};

/**
 * X25519-sealed key: ephemeral public + AES-GCM ciphertext of key bytes.
 */
export type SealedKeyEnvelope = {
  v: typeof ENVELOPE_VERSION;
  ephemeralPublicKey: string;
  nonce: string;
  ciphertext: string;
  keyVersion: number;
};

export type ContentAad = {
  table: string;
  recordId: string;
  field: string;
};

export function formatAad(aad: ContentAad): string {
  return `${aad.table}:${aad.recordId}:${aad.field}`;
}
