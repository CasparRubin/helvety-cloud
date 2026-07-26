import { asBufferSource, getSubtle } from "./bytes";
import { KEY_BYTES, UNLOCK_HKDF_INFO } from "./constants";

/**
 * Derive unlock_key from WebAuthn PRF output via HKDF-SHA-256.
 * Auth session ≠ encryption unlock: only this client-side material unlocks.
 */
export async function deriveUnlockKey(
  prfOutput: Uint8Array,
  prfSalt: Uint8Array,
): Promise<Uint8Array> {
  if (prfOutput.byteLength === 0) {
    throw new Error("PRF output must not be empty");
  }
  if (prfSalt.byteLength === 0) {
    throw new Error("PRF salt must not be empty");
  }

  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    "raw",
    asBufferSource(prfOutput),
    "HKDF",
    false,
    ["deriveBits"],
  );

  const bits = await subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asBufferSource(prfSalt),
      info: asBufferSource(UNLOCK_HKDF_INFO),
    },
    baseKey,
    KEY_BYTES * 8,
  );

  return new Uint8Array(bits);
}
