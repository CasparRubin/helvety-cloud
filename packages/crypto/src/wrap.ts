import {
  asBufferSource,
  encodeUtf8,
  fromBase64Url,
  getSubtle,
  randomNonce,
  toBase64Url,
} from "./bytes";
import { ENVELOPE_VERSION, KEY_BYTES } from "./constants";
import type { ContentAad, WrappedKeyEnvelope } from "./envelope";
import { formatAad } from "./envelope";

async function importAesKey(
  keyBytes: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  if (keyBytes.byteLength !== KEY_BYTES) {
    throw new Error(`AES key must be ${KEY_BYTES} bytes`);
  }
  return getSubtle().importKey(
    "raw",
    asBufferSource(keyBytes),
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

/**
 * Wrap raw key material with AES-256-GCM under a wrapping key
 * (unlock_key or recovery_key → user_symmetric_key;
 *  user_symmetric_key → X25519 private key).
 * AAD binds `table:recordId:field` so wrapped blobs cannot be column-swapped.
 */
export async function wrapKey(
  wrappingKey: Uint8Array,
  keyToWrap: Uint8Array,
  aad: ContentAad,
  keyVersion = 1,
): Promise<WrappedKeyEnvelope> {
  const cryptoKey = await importAesKey(wrappingKey, ["encrypt"]);
  const nonce = randomNonce();
  const additionalData = encodeUtf8(formatAad(aad));
  const ciphertext = new Uint8Array(
    await getSubtle().encrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(nonce),
        additionalData: asBufferSource(additionalData),
      },
      cryptoKey,
      asBufferSource(keyToWrap),
    ),
  );
  return {
    v: ENVELOPE_VERSION,
    nonce: toBase64Url(nonce),
    ciphertext: toBase64Url(ciphertext),
    keyVersion,
  };
}

export async function unwrapKey(
  wrappingKey: Uint8Array,
  envelope: WrappedKeyEnvelope,
  aad: ContentAad,
): Promise<Uint8Array> {
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported wrapped-key envelope version: ${envelope.v}`);
  }
  const cryptoKey = await importAesKey(wrappingKey, ["decrypt"]);
  const nonce = fromBase64Url(envelope.nonce);
  const ciphertext = fromBase64Url(envelope.ciphertext);
  const additionalData = encodeUtf8(formatAad(aad));
  const plaintext = await getSubtle().decrypt(
    {
      name: "AES-GCM",
      iv: asBufferSource(nonce),
      additionalData: asBufferSource(additionalData),
    },
    cryptoKey,
    asBufferSource(ciphertext),
  );
  return new Uint8Array(plaintext);
}
