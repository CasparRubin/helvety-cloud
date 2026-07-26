import {
  bytesEqual,
  encodeUtf8,
  fromBase64Url,
  getSubtle,
  randomKeyBytes,
  randomPrfSalt,
  toBase64Url,
} from "./bytes";
import { KEY_CHECK_PLAINTEXT, KEY_BYTES } from "./constants";
import { encrypt, decrypt } from "./content";
import type { CiphertextEnvelope } from "./envelope";

export type UserKeyMaterial = {
  /** 32-byte AES key that wraps the X25519 private key and can encrypt content. */
  userSymmetricKey: Uint8Array;
  /** Raw X25519 public key (32 bytes), safe to store on server. */
  publicKey: Uint8Array;
  /** PKCS8-encoded X25519 private key bytes (wrap before storage). */
  privateKey: Uint8Array;
};

export function generatePrfSalt(): Uint8Array {
  return randomPrfSalt();
}

export function generateRecoveryKey(): Uint8Array {
  return randomKeyBytes();
}

/** Export recovery key once for offline storage (base64url). */
export function exportRecoveryKey(recoveryKey: Uint8Array): string {
  if (recoveryKey.byteLength !== KEY_BYTES) {
    throw new Error(`Recovery key must be ${KEY_BYTES} bytes`);
  }
  return toBase64Url(recoveryKey);
}

export function importRecoveryKey(exported: string): Uint8Array {
  const key = fromBase64Url(exported);
  if (key.byteLength !== KEY_BYTES) {
    throw new Error(`Recovery key must be ${KEY_BYTES} bytes`);
  }
  return key;
}

/**
 * Generate user_symmetric_key + X25519 keypair.
 * Helvety never holds these in plaintext, only wrapped blobs / public key.
 */
export async function generateUserKeyMaterial(): Promise<UserKeyMaterial> {
  const userSymmetricKey = randomKeyBytes();
  const pair = (await getSubtle().generateKey(
    { name: "X25519" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;

  const publicKey = new Uint8Array(
    await getSubtle().exportKey("raw", pair.publicKey),
  );
  const privateKey = new Uint8Array(
    await getSubtle().exportKey("pkcs8", pair.privateKey),
  );

  return { userSymmetricKey, publicKey, privateKey };
}

/** Encrypt a fixed verifier under user_symmetric_key (user_crypto.key_check). */
export async function createKeyCheck(
  userSymmetricKey: Uint8Array,
  userId: string,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: userSymmetricKey,
    plaintext: encodeUtf8(KEY_CHECK_PLAINTEXT),
    aad: { table: "user_crypto", recordId: userId, field: "key_check" },
    keyVersion,
  });
}

export async function verifyKeyCheck(
  userSymmetricKey: Uint8Array,
  envelope: CiphertextEnvelope,
  userId: string,
): Promise<boolean> {
  try {
    const plaintext = await decrypt({
      key: userSymmetricKey,
      envelope,
      aad: { table: "user_crypto", recordId: userId, field: "key_check" },
    });
    return bytesEqual(plaintext, encodeUtf8(KEY_CHECK_PLAINTEXT));
  } catch {
    return false;
  }
}
