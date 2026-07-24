import {
  asBufferSource,
  encodeUtf8,
  fromBase64Url,
  getSubtle,
  randomNonce,
  toBase64Url,
} from "./bytes";
import { ENVELOPE_VERSION, KEY_BYTES } from "./constants";
import type { CiphertextEnvelope, ContentAad } from "./envelope";
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

export type EncryptParams = {
  key: Uint8Array;
  plaintext: Uint8Array;
  aad: ContentAad;
  keyVersion?: number;
};

export type DecryptParams = {
  key: Uint8Array;
  envelope: CiphertextEnvelope;
  aad: ContentAad;
};

/**
 * AES-256-GCM encrypt with AAD binding `table:recordId:field`
 * so ciphertext cannot be moved across rows.
 */
export async function encrypt(
  params: EncryptParams,
): Promise<CiphertextEnvelope> {
  const cryptoKey = await importAesKey(params.key, ["encrypt"]);
  const nonce = randomNonce();
  const additionalData = encodeUtf8(formatAad(params.aad));
  const ciphertext = new Uint8Array(
    await getSubtle().encrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(nonce),
        additionalData: asBufferSource(additionalData),
      },
      cryptoKey,
      asBufferSource(params.plaintext),
    ),
  );
  return {
    v: ENVELOPE_VERSION,
    nonce: toBase64Url(nonce),
    ciphertext: toBase64Url(ciphertext),
    keyVersion: params.keyVersion ?? 1,
  };
}

export async function decrypt(params: DecryptParams): Promise<Uint8Array> {
  if (params.envelope.v !== ENVELOPE_VERSION) {
    throw new Error(
      `Unsupported ciphertext envelope version: ${params.envelope.v}`,
    );
  }
  const cryptoKey = await importAesKey(params.key, ["decrypt"]);
  const nonce = fromBase64Url(params.envelope.nonce);
  const ciphertext = fromBase64Url(params.envelope.ciphertext);
  const additionalData = encodeUtf8(formatAad(params.aad));
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
