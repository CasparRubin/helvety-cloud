"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceInvitation } from "@helvety-cloud/api-contract";

import {
  EntityErrorAlert,
  EntityListEmpty,
} from "@/components/app/entity-list-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import {
  acceptInvitation,
  claimInvitation,
  listMyInvitations,
} from "@/lib/api/v1-client";
import type { UnlockedUserKeys } from "@/lib/client-crypto/user-keys";
import {
  decryptWorkspaceName,
  storeLastWorkspaceId,
  unwrapWorkspaceKey,
} from "@/lib/client-crypto/workspaces";

function statusCopy(status: WorkspaceInvitation["status"]): string {
  switch (status) {
    case "waiting_for_recipient":
      return "Claim this invitation to share your public key with a workspace member.";
    case "waiting_for_seal":
      return "Waiting for a workspace member to complete key handoff on their unlocked device.";
    case "ready_to_accept":
      return "Key handoff is complete. Accept to join the workspace.";
    case "accepted":
      return "Accepted.";
    case "cancelled":
      return "Cancelled.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Workspace names live in ciphertext; readable once a member sealed
 * the workspace key to this user's keys.
 */
async function decryptWorkspaceNames(
  userKeys: UnlockedUserKeys,
  invitations: WorkspaceInvitation[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  await Promise.all(
    invitations.map(async (invitation) => {
      const { workspaceEncryptedBlob, sealedWorkspaceKey } = invitation;
      if (!workspaceEncryptedBlob || !sealedWorkspaceKey) return;
      try {
        const workspaceKey = await unwrapWorkspaceKey(
          userKeys,
          invitation.workspaceId,
          sealedWorkspaceKey,
        );
        names.set(
          invitation.id,
          await decryptWorkspaceName(
            workspaceKey,
            invitation.workspaceId,
            workspaceEncryptedBlob,
          ),
        );
      } catch {
        // Leave the name hidden rather than failing the whole inbox.
      }
    }),
  );
  return names;
}

type InvitationInboxProps = {
  userId: string;
};

export function InvitationInbox({ userId }: InvitationInboxProps) {
  const router = useRouter();
  const { userKeys, refreshWorkspaces } = useCryptoSession();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [workspaceNames, setWorkspaceNames] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = useCallback(async (activeKeys: UnlockedUserKeys) => {
    const listed = await listMyInvitations();
    const pending = listed.invitations.filter(
      (i) => i.status !== "cancelled" && i.status !== "accepted",
    );
    return {
      invitations: pending,
      workspaceNames: await decryptWorkspaceNames(activeKeys, pending),
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userKeys) return;
    setError(null);
    try {
      const loaded = await loadInvitations(userKeys);
      setInvitations(loaded.invitations);
      setWorkspaceNames(loaded.workspaceNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, [userKeys, loadInvitations]);

  useEffect(() => {
    if (!userKeys) return;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await loadInvitations(userKeys);
        if (cancelled) return;
        setInvitations(loaded.invitations);
        setWorkspaceNames(loaded.workspaceNames);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load invitations",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadInvitations]);

  async function onClaim(invitation: WorkspaceInvitation) {
    setPendingId(invitation.id);
    setError(null);
    try {
      await claimInvitation(invitation.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setPendingId(null);
    }
  }

  async function onAccept(invitation: WorkspaceInvitation) {
    setPendingId(invitation.id);
    setError(null);
    try {
      const accepted = await acceptInvitation(invitation.id);
      await refreshWorkspaces();
      storeLastWorkspaceId(userId, accepted.workspaceId);
      router.push(`/app/w/${accepted.workspaceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
      setPendingId(null);
    }
  }

  if (!userKeys) {
    return (
      <p className="text-sm text-muted-foreground">
        Unlock with your passkey to claim and accept invitations.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Invitations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitations addressed to your signed-in email. Helvety cannot decrypt
          workspace content; a member seals the workspace key to your public key
          on their device.
        </p>
      </div>

      {error ? <EntityErrorAlert message={error} /> : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      ) : invitations.length === 0 ? (
        <EntityListEmpty className="max-w-xl">
          No pending invitations.
        </EntityListEmpty>
      ) : (
        <ul className="flex max-w-xl flex-col gap-3">
          {invitations.map((invitation) => {
            const busy = pendingId === invitation.id;
            return (
              <li
                key={invitation.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {workspaceNames.get(invitation.id) ?? "Workspace"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusCopy(invitation.status)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {invitation.status === "waiting_for_recipient" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onClaim(invitation)}
                    >
                      {busy ? <Spinner data-icon="inline-start" /> : null}
                      Claim
                    </Button>
                  ) : null}
                  {invitation.status === "ready_to_accept" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onAccept(invitation)}
                    >
                      {busy ? <Spinner data-icon="inline-start" /> : null}
                      Accept
                    </Button>
                  ) : null}
                  {invitation.status === "waiting_for_seal" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void refresh()}
                    >
                      Refresh
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
