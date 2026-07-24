/**
 * Create / ensure Personal workspace after vault unlock.
 * Workspace keys stay in memory only (caller caches if needed).
 */

import {
  fromBase64Url,
  openSealedKey,
  randomKeyBytes,
  sealToPublicKey,
} from "@helvety-cloud/crypto";
import type {
  SealedKeyEnvelope,
  WorkspaceListItem,
} from "@helvety-cloud/api-contract";

import {
  createWorkspace,
  listWorkspaces,
  sealWorkspaceInvitation,
  ApiClientError,
} from "@/lib/api/v1-client";
import type { UnlockedVault } from "@/lib/vault/user-keys";

function wrappedWorkspaceKeyAad(workspaceId: string) {
  return {
    table: "wrapped_keys",
    recordId: workspaceId,
    field: "wrapped_key",
  } as const;
}

export async function unwrapWorkspaceKey(
  vault: UnlockedVault,
  workspaceId: string,
  wrappedKey: WorkspaceListItem["wrappedKey"],
): Promise<Uint8Array> {
  return openSealedKey(
    vault.privateKey,
    wrappedKey,
    wrappedWorkspaceKeyAad(workspaceId),
  );
}

/** Seal a workspace key to an invitee's public key (final wrapped_keys AAD). */
export async function sealWorkspaceKeyForInvitee(
  workspaceKey: Uint8Array,
  inviteePublicKeyBase64Url: string,
  workspaceId: string,
  keyVersion: number,
): Promise<SealedKeyEnvelope> {
  return sealToPublicKey(
    fromBase64Url(inviteePublicKeyBase64Url),
    workspaceKey,
    wrappedWorkspaceKeyAad(workspaceId),
    keyVersion,
  );
}

export async function handoffInvitationSeal(params: {
  vault: UnlockedVault;
  workspaceId: string;
  invitationId: string;
  claimedPublicKey: string;
  workspaceKey: Uint8Array;
}): Promise<void> {
  const sealedKey = await sealWorkspaceKeyForInvitee(
    params.workspaceKey,
    params.claimedPublicKey,
    params.workspaceId,
    params.vault.keyVersion,
  );
  await sealWorkspaceInvitation(params.workspaceId, params.invitationId, {
    sealedKey,
  });
}

export function invitationMailto(params: {
  email: string;
  workspaceName: string;
  appOrigin: string;
}): { href: string; body: string } {
  const subject = encodeURIComponent(
    `You're invited to ${params.workspaceName} on Helvety Cloud`,
  );
  const body = encodeURIComponent(
    [
      `You've been invited to the workspace "${params.workspaceName}" on Helvety Cloud.`,
      "",
      "1. Open the app and sign in with this email (OTP / passkey).",
      "2. Set up or unlock your vault.",
      "3. Open Invitations in the sidebar, claim the invite, then wait if the owner still needs to complete key handoff.",
      "4. Accept when the invite is ready.",
      "",
      `App: ${params.appOrigin}/app/invitations`,
      "",
      "Helvety cannot decrypt vault content. Only you and other members with the sealed workspace key can read it.",
    ].join("\n"),
  );
  return {
    href: `mailto:${params.email}?subject=${subject}&body=${body}`,
    body: decodeURIComponent(body),
  };
}

export async function createStandardWorkspace(
  vault: UnlockedVault,
  name: string,
): Promise<WorkspaceListItem> {
  const id = crypto.randomUUID();
  const workspaceKey = randomKeyBytes();
  const wrappedKey = await sealToPublicKey(
    vault.publicKey,
    workspaceKey,
    wrappedWorkspaceKeyAad(id),
    vault.keyVersion,
  );
  const created = await createWorkspace({
    id,
    name,
    kind: "standard",
    wrappedKey,
  });
  return {
    id: created.id,
    name: created.name,
    kind: created.kind,
    role: "owner",
    wrappedKey,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Ensure the signed-in user has exactly one Personal workspace.
 * Idempotent under the DB unique index on (created_by) where kind = personal.
 */
export async function ensurePersonalWorkspace(
  vault: UnlockedVault,
): Promise<WorkspaceListItem> {
  const listed = await listWorkspaces();
  const existing = listed.workspaces.find((w) => w.kind === "personal");
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  const workspaceKey = randomKeyBytes();
  const wrappedKey = await sealToPublicKey(
    vault.publicKey,
    workspaceKey,
    wrappedWorkspaceKeyAad(id),
    vault.keyVersion,
  );

  try {
    const created = await createWorkspace({
      id,
      name: "Personal",
      kind: "personal",
      wrappedKey,
    });
    return {
      id: created.id,
      name: created.name,
      kind: created.kind,
      role: "owner",
      wrappedKey,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 409) {
      const retry = await listWorkspaces();
      const personal = retry.workspaces.find((w) => w.kind === "personal");
      if (personal) return personal;
    }
    throw error;
  }
}

export function pickDefaultWorkspaceId(
  workspaces: WorkspaceListItem[],
  preferredId: string | null,
): string | null {
  if (preferredId && workspaces.some((w) => w.id === preferredId)) {
    return preferredId;
  }
  const personal = workspaces.find((w) => w.kind === "personal");
  if (personal) return personal.id;
  return workspaces[0]?.id ?? null;
}

const LAST_WORKSPACE_KEY = (userId: string) =>
  `helvety.vault.lastWorkspaceId:${userId}`;

export function loadLastWorkspaceId(userId: string): string | null {
  try {
    return localStorage.getItem(LAST_WORKSPACE_KEY(userId));
  } catch {
    return null;
  }
}

export function storeLastWorkspaceId(userId: string, workspaceId: string): void {
  try {
    localStorage.setItem(LAST_WORKSPACE_KEY(userId), workspaceId);
  } catch {
    // ignore
  }
}
