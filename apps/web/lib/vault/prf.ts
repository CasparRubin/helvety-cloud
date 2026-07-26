/**
 * WebAuthn PRF for vault unlock (session ≠ decrypt).
 * Dedicated discoverable credential with PRF, not Supabase Auth.
 */

import { deriveUnlockKey, fromBase64Url, generatePrfSalt, toBase64Url } from "@helvety-cloud/crypto";

const CREDENTIAL_STORAGE_PREFIX = "helvety.vault.prfCredentialId:";

type PrfExtensionResults = {
  prf?: {
    enabled?: boolean;
    results?: {
      first?: ArrayBuffer;
    };
  };
};

export type PrfUnlockResult = {
  unlockKey: Uint8Array;
  prfSalt: Uint8Array;
  credentialId: string;
};

function rpId(): string {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "localhost";
  }
  return host;
}

function randomChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

function bufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function credentialIdToBase64Url(rawId: ArrayBuffer): string {
  return toBase64Url(new Uint8Array(rawId));
}

function readStoredCredentialId(userId: string): string | null {
  try {
    return localStorage.getItem(`${CREDENTIAL_STORAGE_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

function storeCredentialId(userId: string, credentialId: string): void {
  try {
    localStorage.setItem(`${CREDENTIAL_STORAGE_PREFIX}${userId}`, credentialId);
  } catch {
    // localStorage may be unavailable; discoverable get still works.
  }
}

/** Clear the locally cached PRF credential id after account deletion / sign-out. */
export function clearStoredPrfCredentialId(userId: string): void {
  try {
    localStorage.removeItem(`${CREDENTIAL_STORAGE_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

function extractPrfOutput(credential: PublicKeyCredential): Uint8Array {
  const ext = credential.getClientExtensionResults() as PrfExtensionResults;
  const first = ext.prf?.results?.first;
  if (!first || first.byteLength === 0) {
    throw new Error(
      "Passkey did not return a PRF result. Use a platform authenticator that supports WebAuthn PRF (e.g. recent Chrome + Touch ID / Windows Hello).",
    );
  }
  return new Uint8Array(first);
}

/**
 * First-time vault setup: create a PRF-capable discoverable credential and derive unlock_key.
 */
export async function createPrfUnlock(
  userId: string,
  email: string,
): Promise<PrfUnlockResult> {
  if (!window.PublicKeyCredential) {
    throw new Error("WebAuthn is not available in this browser");
  }

  const prfSalt = generatePrfSalt();
  const userIdBytes = new TextEncoder().encode(userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: bufferSource(randomChallenge()),
      rp: {
        id: rpId(),
        name: "Helvety Cloud",
      },
      user: {
        id: bufferSource(userIdBytes),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
      timeout: 120_000,
      attestation: "none",
      extensions: {
        prf: {
          eval: {
            first: bufferSource(prfSalt),
          },
        },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Passkey creation was cancelled");
  }

  const credentialId = credentialIdToBase64Url(credential.rawId);
  storeCredentialId(userId, credentialId);

  let prfOutput: Uint8Array;
  try {
    prfOutput = extractPrfOutput(credential);
  } catch {
    // Some authenticators only return PRF on get, so assert immediately.
    const asserted = (await navigator.credentials.get({
      publicKey: {
        challenge: bufferSource(randomChallenge()),
        rpId: rpId(),
        allowCredentials: [
          {
            type: "public-key",
            id: bufferSource(fromBase64Url(credentialId)),
          },
        ],
        userVerification: "required",
        timeout: 120_000,
        extensions: {
          prf: {
            eval: {
              first: bufferSource(prfSalt),
            },
          },
        } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!asserted) {
      throw new Error("Vault PRF assertion was cancelled");
    }
    prfOutput = extractPrfOutput(asserted);
  }

  const unlockKey = await deriveUnlockKey(prfOutput, prfSalt);
  return { unlockKey, prfSalt, credentialId };
}

/**
 * Returning unlock: assert the PRF credential with the stored salt from user_crypto.
 */
export async function assertPrfUnlock(
  userId: string,
  prfSaltBase64Url: string,
): Promise<PrfUnlockResult> {
  if (!window.PublicKeyCredential) {
    throw new Error("WebAuthn is not available in this browser");
  }

  const prfSalt = fromBase64Url(prfSaltBase64Url);
  const storedId = readStoredCredentialId(userId);
  const allowCredentials = storedId
    ? [
        {
          type: "public-key" as const,
          id: bufferSource(fromBase64Url(storedId)),
        },
      ]
    : undefined;

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: bufferSource(randomChallenge()),
      rpId: rpId(),
      allowCredentials,
      userVerification: "required",
      timeout: 120_000,
      extensions: {
        prf: {
          eval: {
            first: bufferSource(prfSalt),
          },
        },
      } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Vault unlock was cancelled");
  }

  const prfOutput = extractPrfOutput(credential);
  const unlockKey = await deriveUnlockKey(prfOutput, prfSalt);
  const credentialId = credentialIdToBase64Url(credential.rawId);
  storeCredentialId(userId, credentialId);

  return { unlockKey, prfSalt, credentialId };
}
