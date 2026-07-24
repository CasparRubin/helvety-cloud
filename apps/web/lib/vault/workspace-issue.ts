/**
 * Workspace + one encrypted issue round-trip via /api/v1.
 */

import {
  decrypt,
  encrypt,
  encodeUtf8,
  openSealedKey,
  randomKeyBytes,
  sealToPublicKey,
} from "@helvety-cloud/crypto";

import {
  createWorkspace,
  getIssue,
  getWorkspace,
  putIssue,
  putProject,
} from "@/lib/api/v1-client";
import type { UnlockedVault } from "@/lib/vault/user-keys";

export type IssuePlaintext = {
  title: string;
  body: string;
};

export type ProofIds = {
  workspaceId: string;
  projectId: string;
  issueId: string;
};

export type ProofRoundTripResult = {
  ids: ProofIds;
  /** Ciphertext envelope as returned by GET (server-visible). */
  ciphertextFromApi: unknown;
  /** Plaintext after local decrypt. */
  decrypted: IssuePlaintext;
};

function newId(): string {
  return crypto.randomUUID();
}

function wrappedWorkspaceKeyAad(workspaceId: string) {
  return {
    table: "wrapped_keys",
    recordId: workspaceId,
    field: "wrapped_key",
  } as const;
}

export async function runEncryptedIssueProof(
  vault: UnlockedVault,
  plaintext: IssuePlaintext,
  existingIds?: ProofIds,
): Promise<ProofRoundTripResult> {
  const workspaceId = existingIds?.workspaceId ?? newId();
  const projectId = existingIds?.projectId ?? newId();
  const issueId = existingIds?.issueId ?? newId();

  let workspaceKey: Uint8Array;

  if (existingIds?.workspaceId) {
    const workspace = await getWorkspace(workspaceId);
    workspaceKey = await openSealedKey(
      vault.privateKey,
      workspace.wrappedKey,
      wrappedWorkspaceKeyAad(workspaceId),
    );
  } else {
    workspaceKey = randomKeyBytes();
    const wrappedKey = await sealToPublicKey(
      vault.publicKey,
      workspaceKey,
      wrappedWorkspaceKeyAad(workspaceId),
      vault.keyVersion,
    );
    await createWorkspace({ id: workspaceId, wrappedKey });
  }

  await putProject(workspaceId, projectId, {
    encryptedBlob: null,
    sortOrder: 0,
  });

  const encryptedBlob = await encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(JSON.stringify(plaintext)),
    aad: {
      table: "issues",
      recordId: issueId,
      field: "encrypted_blob",
    },
    keyVersion: vault.keyVersion,
  });

  await putIssue(workspaceId, projectId, issueId, {
    encryptedBlob,
    sortOrder: 0,
  });

  const fetched = await getIssue(workspaceId, projectId, issueId);
  const decryptedBytes = await decrypt({
    key: workspaceKey,
    envelope: fetched.encryptedBlob,
    aad: {
      table: "issues",
      recordId: issueId,
      field: "encrypted_blob",
    },
  });

  const decrypted = JSON.parse(
    new TextDecoder().decode(decryptedBytes),
  ) as IssuePlaintext;

  if (decrypted.title !== plaintext.title || decrypted.body !== plaintext.body) {
    throw new Error("Decrypted issue does not match plaintext");
  }

  return {
    ids: { workspaceId, projectId, issueId },
    ciphertextFromApi: fetched.encryptedBlob,
    decrypted,
  };
}

/** Reload path: fetch + decrypt an existing issue after vault unlock. */
export async function reloadAndDecryptIssue(
  vault: UnlockedVault,
  ids: ProofIds,
): Promise<ProofRoundTripResult> {
  const workspace = await getWorkspace(ids.workspaceId);
  const workspaceKey = await openSealedKey(
    vault.privateKey,
    workspace.wrappedKey,
    wrappedWorkspaceKeyAad(ids.workspaceId),
  );
  const fetched = await getIssue(ids.workspaceId, ids.projectId, ids.issueId);
  const decryptedBytes = await decrypt({
    key: workspaceKey,
    envelope: fetched.encryptedBlob,
    aad: {
      table: "issues",
      recordId: ids.issueId,
      field: "encrypted_blob",
    },
  });
  const decrypted = JSON.parse(
    new TextDecoder().decode(decryptedBytes),
  ) as IssuePlaintext;

  return {
    ids,
    ciphertextFromApi: fetched.encryptedBlob,
    decrypted,
  };
}

/** Persist proof IDs for reload (ids only — never keys). */
export function storeProofIds(userId: string, ids: ProofIds): void {
  try {
    localStorage.setItem(
      `helvety.vault.proofIds:${userId}`,
      JSON.stringify(ids),
    );
  } catch {
    // ignore
  }
}

export function loadProofIds(userId: string): ProofIds | null {
  try {
    const raw = localStorage.getItem(`helvety.vault.proofIds:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProofIds;
    if (
      typeof parsed.workspaceId === "string" &&
      typeof parsed.projectId === "string" &&
      typeof parsed.issueId === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
