/**
 * Recovery key export: one-shot offline secret.
 * Never log or POST the recovery key or recovery wrap.
 */

import { wrappedKeyEnvelopeSchema } from "@helvety-cloud/api-contract";
import {
  exportRecoveryKey,
  generateRecoveryKey,
  importRecoveryKey,
  unwrapKey,
  wrapKey,
  type WrappedKeyEnvelope,
} from "@helvety-cloud/crypto";

export type RecoveryExport = {
  /** Base64url recovery key. Show once; user stores offline. */
  recoveryKeyExported: string;
  /** Recovery-wrapped user_symmetric_key for offline backup (never uploaded). */
  recoveryWrappedUserKey: WrappedKeyEnvelope;
};

/** Parsed helvety-recovery.json (client-only; never upload). */
export type ParsedRecoveryFile = {
  recoveryKey: Uint8Array;
  recoveryWrappedUserKey: WrappedKeyEnvelope;
};

function recoveryWrappedUserKeyAad(userId: string) {
  return {
    table: "user_crypto",
    recordId: userId,
    field: "recovery_wrapped_user_key",
  } as const;
}

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
    recoveryWrappedUserKeyAad(userId),
    keyVersion,
  );

  return {
    recoveryKeyExported: exportRecoveryKey(recoveryKey),
    recoveryWrappedUserKey,
  };
}

/**
 * Parse helvety-recovery.json text. Never log or POST the result.
 */
export function parseRecoveryFileJson(text: string): ParsedRecoveryFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Recovery file is not valid JSON");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Recovery file has an invalid shape");
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.recoveryKey !== "string" || !record.recoveryKey) {
    throw new Error("Recovery file is missing recoveryKey");
  }
  const wrapParsed = wrappedKeyEnvelopeSchema.safeParse(
    record.recoveryWrappedUserKey,
  );
  if (!wrapParsed.success) {
    throw new Error("Recovery file is missing a valid recoveryWrappedUserKey");
  }
  return {
    recoveryKey: importRecoveryKey(record.recoveryKey),
    recoveryWrappedUserKey: wrapParsed.data,
  };
}

/** Unwrap user_symmetric_key from offline recovery material (never POSTed). */
export async function unwrapUserSymmetricKeyFromRecovery(
  userId: string,
  file: ParsedRecoveryFile,
): Promise<Uint8Array> {
  return unwrapKey(
    file.recoveryKey,
    file.recoveryWrappedUserKey,
    recoveryWrappedUserKeyAad(userId),
  );
}
