/**
 * Create / ensure Personal workspace after encryption unlock.
 * Workspace keys stay in memory only (caller caches if needed).
 * Display names live in encrypted_blob under the workspace key.
 */

import {
  decrypt,
  encodeUtf8,
  encrypt,
  fromBase64Url,
  openSealedKey,
  randomKeyBytes,
  sealToPublicKey,
  type CiphertextEnvelope,
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
import type { UnlockedUserKeys } from "@/lib/client-crypto/user-keys";
import {
  parseWorkspacePlaintext,
  toWorkspacePlaintext,
  type WorkspacePlaintext,
} from "@/lib/client-crypto/workspace-plaintext";

const textDecoder = new TextDecoder();

function wrappedWorkspaceKeyAad(workspaceId: string) {
  return {
    table: "wrapped_keys",
    recordId: workspaceId,
    field: "wrapped_key",
  } as const;
}

function workspaceAad(workspaceId: string) {
  return {
    table: "workspaces" as const,
    recordId: workspaceId,
    field: "encrypted_blob" as const,
  };
}

export async function encryptWorkspaceName(
  workspaceKey: Uint8Array,
  workspaceId: string,
  content: WorkspacePlaintext | string,
  keyVersion = 1,
): Promise<CiphertextEnvelope> {
  return encrypt({
    key: workspaceKey,
    plaintext: encodeUtf8(
      JSON.stringify(
        typeof content === "string"
          ? toWorkspacePlaintext(content)
          : content,
      ),
    ),
    aad: workspaceAad(workspaceId),
    keyVersion,
  });
}

export async function decryptWorkspacePlaintext(
  workspaceKey: Uint8Array,
  workspaceId: string,
  envelope: CiphertextEnvelope,
): Promise<WorkspacePlaintext> {
  const bytes = await decrypt({
    key: workspaceKey,
    envelope,
    aad: workspaceAad(workspaceId),
  });
  return parseWorkspacePlaintext(JSON.parse(textDecoder.decode(bytes)));
}

export async function decryptWorkspaceName(
  workspaceKey: Uint8Array,
  workspaceId: string,
  envelope: CiphertextEnvelope,
): Promise<string> {
  return (
    await decryptWorkspacePlaintext(workspaceKey, workspaceId, envelope)
  ).name;
}

export async function unwrapWorkspaceKey(
  userKeys: UnlockedUserKeys,
  workspaceId: string,
  wrappedKey: WorkspaceListItem["wrappedKey"],
): Promise<Uint8Array> {
  return openSealedKey(
    userKeys.privateKey,
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
  userKeys: UnlockedUserKeys;
  workspaceId: string;
  invitationId: string;
  claimedPublicKey: string;
  workspaceKey: Uint8Array;
}): Promise<void> {
  const sealedKey = await sealWorkspaceKeyForInvitee(
    params.workspaceKey,
    params.claimedPublicKey,
    params.workspaceId,
    params.userKeys.keyVersion,
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
      "1. Open the app and sign in with this email (OTP).",
      "2. Set up encryption or unlock with your passkey.",
      "3. Open Invitations in the sidebar, claim the invite, then wait if the owner or an admin still needs to complete key handoff.",
      "4. Accept when the invite is ready.",
      "",
      `App: ${params.appOrigin}/app/invitations`,
      "",
      "Helvety cannot decrypt your data. Only you and other members with the sealed workspace key can read it.",
    ].join("\n"),
  );
  return {
    href: `mailto:${params.email}?subject=${subject}&body=${body}`,
    body: decodeURIComponent(body),
  };
}

export type DecryptedWorkspaceListItem = {
  id: string;
  name: string;
  categorizations: WorkspacePlaintext["categorizations"];
  kind: WorkspaceListItem["kind"];
  role: WorkspaceListItem["role"];
  wrappedKey: WorkspaceListItem["wrappedKey"];
  updatedAt: string;
  plan: WorkspaceListItem["plan"];
};

export async function decryptWorkspaceListItem(
  userKeys: UnlockedUserKeys,
  item: WorkspaceListItem,
): Promise<DecryptedWorkspaceListItem> {
  const workspaceKey = await unwrapWorkspaceKey(userKeys, item.id, item.wrappedKey);
  const plain = await decryptWorkspacePlaintext(
    workspaceKey,
    item.id,
    item.encryptedBlob,
  );
  return {
    id: item.id,
    name: plain.name,
    categorizations: plain.categorizations,
    kind: item.kind,
    role: item.role,
    wrappedKey: item.wrappedKey,
    updatedAt: item.updatedAt,
    plan: item.plan,
  };
}

export async function createStandardWorkspace(
  userKeys: UnlockedUserKeys,
  name: string,
  options?: { asPro?: boolean },
): Promise<DecryptedWorkspaceListItem> {
  const id = crypto.randomUUID();
  const workspaceKey = randomKeyBytes();
  const plaintext = toWorkspacePlaintext(name);
  const wrappedKey = await sealToPublicKey(
    userKeys.publicKey,
    workspaceKey,
    wrappedWorkspaceKeyAad(id),
    userKeys.keyVersion,
  );
  const encryptedBlob = await encryptWorkspaceName(
    workspaceKey,
    id,
    plaintext,
    userKeys.keyVersion,
  );
  const created = await createWorkspace({
    id,
    encryptedBlob,
    kind: "standard",
    wrappedKey,
    ...(options?.asPro ? { asPro: true } : {}),
  });
  return {
    id: created.id,
    name,
      categorizations: plaintext.categorizations,
    kind: created.kind,
    role: "owner",
    wrappedKey,
    updatedAt: new Date().toISOString(),
    plan: "free",
  };
}

/**
 * Ensure the signed-in user has exactly one Personal workspace.
 * Idempotent under the DB unique index on (created_by) where kind = personal.
 */
export async function ensurePersonalWorkspace(
  userKeys: UnlockedUserKeys,
): Promise<DecryptedWorkspaceListItem> {
  const listed = await listWorkspaces();
  const existing = listed.workspaces.find((w) => w.kind === "personal");
  if (existing) {
    return decryptWorkspaceListItem(userKeys, existing);
  }

  const id = crypto.randomUUID();
  const workspaceKey = randomKeyBytes();
  const plaintext = toWorkspacePlaintext("Personal");
  const wrappedKey = await sealToPublicKey(
    userKeys.publicKey,
    workspaceKey,
    wrappedWorkspaceKeyAad(id),
    userKeys.keyVersion,
  );
  const encryptedBlob = await encryptWorkspaceName(
    workspaceKey,
    id,
    plaintext,
    userKeys.keyVersion,
  );

  try {
    const created = await createWorkspace({
      id,
      encryptedBlob,
      kind: "personal",
      wrappedKey,
    });
    return {
      id: created.id,
      name: "Personal",
      categorizations: plaintext.categorizations,
      kind: created.kind,
      role: "owner",
      wrappedKey,
      updatedAt: new Date().toISOString(),
      plan: "free",
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 409) {
      const retry = await listWorkspaces();
      const personal = retry.workspaces.find((w) => w.kind === "personal");
      if (personal) return decryptWorkspaceListItem(userKeys, personal);
    }
    throw error;
  }
}

export function pickDefaultWorkspaceId(
  workspaces: DecryptedWorkspaceListItem[],
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
  `helvety.crypto.lastWorkspaceId:${userId}`;

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
