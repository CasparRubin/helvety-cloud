import {
  asBufferSource,
  encodeUtf8,
  fromBase64Url,
  getSubtle,
  randomNonce,
  toBase64Url,
} from "./bytes";
import {
  ENVELOPE_VERSION,
  KEY_BYTES,
  SEAL_HKDF_INFO,
} from "./constants";
import type { ContentAad, SealedKeyEnvelope } from "./envelope";
import { formatAad } from "./envelope";

async function importRecipientPublicKey(
  publicKeyBytes: Uint8Array,
): Promise<CryptoKey> {
  return getSubtle().importKey(
    "raw",
    asBufferSource(publicKeyBytes),
    { name: "X25519" },
    false,
    [],
  );
}

async function importPrivateKeyPkcs8(
  privateKeyPkcs8: Uint8Array,
): Promise<CryptoKey> {
  return getSubtle().importKey(
    "pkcs8",
    asBufferSource(privateKeyPkcs8),
    { name: "X25519" },
    false,
    ["deriveBits"],
  );
}

async function deriveSealAesKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const sharedBits = await getSubtle().deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    KEY_BYTES * 8,
  );

  const hkdfKey = await getSubtle().importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return getSubtle().deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: asBufferSource(SEAL_HKDF_INFO),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

/**
 * Seal raw key bytes to a recipient's X25519 public key
 * (ephemeral ECDH → HKDF → AES-256-GCM). Used for wrapped_keys.
 * AAD binds `table:recordId:field` so sealed blobs cannot be row-swapped.
 */
export async function sealToPublicKey(
  recipientPublicKey: Uint8Array,
  keyBytes: Uint8Array,
  aad: ContentAad,
  keyVersion = 1,
): Promise<SealedKeyEnvelope> {
  const recipient = await importRecipientPublicKey(recipientPublicKey);
  const ephemeral = (await getSubtle().generateKey(
    { name: "X25519" },
    true,
    ["deriveBits"],
  )) as CryptoKeyPair;

  const aesKey = await deriveSealAesKey(
    ephemeral.privateKey,
    recipient,
    ["encrypt"],
  );
  const nonce = randomNonce();
  const additionalData = encodeUtf8(formatAad(aad));
  const ciphertext = new Uint8Array(
    await getSubtle().encrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(nonce),
        additionalData: asBufferSource(additionalData),
      },
      aesKey,
      asBufferSource(keyBytes),
    ),
  );
  const ephemeralPublicKey = new Uint8Array(
    await getSubtle().exportKey("raw", ephemeral.publicKey),
  );

  return {
    v: ENVELOPE_VERSION,
    ephemeralPublicKey: toBase64Url(ephemeralPublicKey),
    nonce: toBase64Url(nonce),
    ciphertext: toBase64Url(ciphertext),
    keyVersion,
  };
}

export async function openSealedKey(
  privateKeyPkcs8: Uint8Array,
  envelope: SealedKeyEnvelope,
  aad: ContentAad,
): Promise<Uint8Array> {
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`Unsupported sealed-key envelope version: ${envelope.v}`);
  }

  const privateKey = await importPrivateKeyPkcs8(privateKeyPkcs8);
  const ephemeralPublic = await importRecipientPublicKey(
    fromBase64Url(envelope.ephemeralPublicKey),
  );
  const aesKey = await deriveSealAesKey(privateKey, ephemeralPublic, [
    "decrypt",
  ]);
  const additionalData = encodeUtf8(formatAad(aad));
  const plaintext = await getSubtle().decrypt(
    {
      name: "AES-GCM",
      iv: asBufferSource(fromBase64Url(envelope.nonce)),
      additionalData: asBufferSource(additionalData),
    },
    aesKey,
    asBufferSource(fromBase64Url(envelope.ciphertext)),
  );
  return new Uint8Array(plaintext);
}
