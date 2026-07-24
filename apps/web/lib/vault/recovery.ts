/**
 * Recovery key export — one-shot offline secret.
 * Never log or POST the recovery key or recovery wrap.
 */

import {
  exportRecoveryKey,
  generateRecoveryKey,
  wrapKey,
  type WrappedKeyEnvelope,
} from "@helvety-cloud/crypto";

export type RecoveryExport = {
  /** Base64url recovery key — show once; user stores offline. */
  recoveryKeyExported: string;
  /** Recovery-wrapped user_symmetric_key for offline backup (never uploaded). */
  recoveryWrappedUserKey: WrappedKeyEnvelope;
};

/**
 * Create a recovery key that wraps user_symmetric_key.
 * Caller must display key + wrap once offline and never send either to Helvety APIs.
 */
export async function createRecoveryExport(
  userId: string,
  userSymmetricKey: Uint8Array,
  keyVersion = 1,
): Promise<RecoveryExport> {
  const recoveryKey = generateRecoveryKey();
  const recoveryWrappedUserKey = await wrapKey(
    recoveryKey,
    userSymmetricKey,
    {
      table: "user_crypto",
      recordId: userId,
      field: "recovery_wrapped_user_key",
    },
    keyVersion,
  );

  return {
    recoveryKeyExported: exportRecoveryKey(recoveryKey),
    recoveryWrappedUserKey,
  };
}
