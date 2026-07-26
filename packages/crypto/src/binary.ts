/**
 * Binary AES-256-GCM for large Storage objects (P11 attachments).
 * Does not base64 the ciphertext. Pack/unpack for opaque Storage blobs.
 */
import {
  asBufferSource,
  encodeUtf8,
  getSubtle,
  randomNonce,
} from "./bytes";
import { ENVELOPE_VERSION, KEY_BYTES, NONCE_BYTES } from "./constants";
import type { ContentAad } from "./envelope";
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

export type BinaryCiphertext = {
  v: typeof ENVELOPE_VERSION;
  nonce: Uint8Array;
  /** Ciphertext including the GCM auth tag. */
  ciphertext: Uint8Array;
};

export type EncryptBinaryParams = {
  key: Uint8Array;
  plaintext: Uint8Array;
  aad: ContentAad;
};

export type DecryptBinaryParams = {
  key: Uint8Array;
  ciphertext: BinaryCiphertext;
  aad: ContentAad;
};

export async function encryptBinary(
  params: EncryptBinaryParams,
): Promise<BinaryCiphertext> {
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
  return { v: ENVELOPE_VERSION, nonce, ciphertext };
}

export async function decryptBinary(
  params: DecryptBinaryParams,
): Promise<Uint8Array> {
  if (params.ciphertext.v !== ENVELOPE_VERSION) {
    throw new Error(
      `Unsupported binary ciphertext version: ${params.ciphertext.v}`,
    );
  }
  const cryptoKey = await importAesKey(params.key, ["decrypt"]);
  const additionalData = encodeUtf8(formatAad(params.aad));
  const plaintext = await getSubtle().decrypt(
    {
      name: "AES-GCM",
      iv: asBufferSource(params.ciphertext.nonce),
      additionalData: asBufferSource(additionalData),
    },
    cryptoKey,
    asBufferSource(params.ciphertext.ciphertext),
  );
  return new Uint8Array(plaintext);
}

/**
 * Pack for Storage: [version:1][nonce:12][ciphertext…].
 * Helvety stores this opaque blob only, never plaintext bytes.
 */
export function packBinaryCiphertext(value: BinaryCiphertext): Uint8Array {
  if (value.nonce.byteLength !== NONCE_BYTES) {
    throw new Error(`Nonce must be ${NONCE_BYTES} bytes`);
  }
  const out = new Uint8Array(1 + NONCE_BYTES + value.ciphertext.byteLength);
  out[0] = value.v;
  out.set(value.nonce, 1);
  out.set(value.ciphertext, 1 + NONCE_BYTES);
  return out;
}

export function unpackBinaryCiphertext(bytes: Uint8Array): BinaryCiphertext {
  if (bytes.byteLength < 1 + NONCE_BYTES + 16) {
    throw new Error("Binary ciphertext blob too short");
  }
  const v = bytes[0]!;
  if (v !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported binary ciphertext version: ${v}`);
  }
  return {
    v: ENVELOPE_VERSION,
    nonce: bytes.subarray(1, 1 + NONCE_BYTES),
    ciphertext: bytes.subarray(1 + NONCE_BYTES),
  };
}
