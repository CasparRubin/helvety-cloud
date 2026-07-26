/**
 * User key setup / unlock. Raw keys stay in memory only.
 */

import type { GetMeCryptoResponse } from "@helvety-cloud/api-contract";
import {
  createKeyCheck,
  fromBase64Url,
  generateUserKeyMaterial,
  toBase64Url,
  unwrapKey,
  verifyKeyCheck,
  wrapKey,
  type UserKeyMaterial,
} from "@helvety-cloud/crypto";

import { getMeCrypto, putMeCrypto, ApiClientError } from "@/lib/api/v1-client";

export type UnlockedVault = {
  userId: string;
  unlockKey: Uint8Array;
  userSymmetricKey: Uint8Array;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  keyVersion: number;
};

function wrappedUserKeyAad(userId: string) {
  return {
    table: "user_crypto",
    recordId: userId,
    field: "wrapped_user_key",
  } as const;
}

function wrappedPrivateKeyAad(userId: string) {
  return {
    table: "user_crypto",
    recordId: userId,
    field: "wrapped_private_key",
  } as const;
}

export async function hasUserCrypto(): Promise<boolean> {
  try {
    await getMeCrypto();
    return true;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

export async function setupUserKeys(
  userId: string,
  unlockKey: Uint8Array,
  prfSalt: Uint8Array,
): Promise<UnlockedVault> {
  const material: UserKeyMaterial = await generateUserKeyMaterial();
  const keyVersion = 1;

  const wrappedUserKey = await wrapKey(
    unlockKey,
    material.userSymmetricKey,
    wrappedUserKeyAad(userId),
    keyVersion,
  );
  const wrappedPrivateKey = await wrapKey(
    material.userSymmetricKey,
    material.privateKey,
    wrappedPrivateKeyAad(userId),
    keyVersion,
  );
  const keyCheck = await createKeyCheck(
    material.userSymmetricKey,
    userId,
    keyVersion,
  );

  await putMeCrypto({
    publicKey: toBase64Url(material.publicKey),
    wrappedUserKey,
    wrappedPrivateKey,
    prfSalt: toBase64Url(prfSalt),
    keyCheck,
    keyVersion,
  });

  return {
    userId,
    unlockKey,
    userSymmetricKey: material.userSymmetricKey,
    publicKey: material.publicKey,
    privateKey: material.privateKey,
    keyVersion,
  };
}

export async function unlockUserKeys(
  userId: string,
  unlockKey: Uint8Array,
  cryptoRow?: GetMeCryptoResponse,
): Promise<UnlockedVault> {
  const row = cryptoRow ?? (await getMeCrypto());
  if (row.userId !== userId) {
    throw new Error("User crypto row does not match signed-in user");
  }

  const userSymmetricKey = await unwrapKey(
    unlockKey,
    row.wrappedUserKey,
    wrappedUserKeyAad(userId),
  );

  const ok = await verifyKeyCheck(userSymmetricKey, row.keyCheck, userId);
  if (!ok) {
    throw new Error("Key check failed: wrong unlock material or corrupt data");
  }

  const privateKey = await unwrapKey(
    userSymmetricKey,
    row.wrappedPrivateKey,
    wrappedPrivateKeyAad(userId),
  );

  return {
    userId,
    unlockKey,
    userSymmetricKey,
    publicKey: fromBase64Url(row.publicKey),
    privateKey,
    keyVersion: row.keyVersion,
  };
}
