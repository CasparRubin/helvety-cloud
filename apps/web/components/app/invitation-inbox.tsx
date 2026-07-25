"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WorkspaceInvitation } from "@helvety-cloud/api-contract";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  acceptInvitation,
  claimInvitation,
  listMyInvitations,
} from "@/lib/api/v1-client";
import { storeLastWorkspaceId } from "@/lib/vault/workspaces";

function statusCopy(status: WorkspaceInvitation["status"]): string {
  switch (status) {
    case "waiting_for_recipient":
      return "Claim this invitation to share your public key with the owner.";
    case "waiting_for_owner_seal":
      return "Waiting for the owner to complete key handoff on their unlocked device.";
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

type InvitationInboxProps = {
  userId: string;
};

export function InvitationInbox({ userId }: InvitationInboxProps) {
  const router = useRouter();
  const { vault, refreshWorkspaces } = useVaultSession();
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    const listed = await listMyInvitations();
    return listed.invitations.filter(
      (i) => i.status !== "cancelled" && i.status !== "accepted",
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setInvitations(await loadInvitations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, [loadInvitations]);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadInvitations();
        if (cancelled) return;
        setInvitations(next);
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
  }, [vault, loadInvitations]);

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

  if (!vault) {
    return (
      <p className="text-sm text-muted-foreground">
        Unlock your vault to claim and accept invitations.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Invitations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitations addressed to your signed-in email. Helvety cannot decrypt
          workspace content; the owner seals the workspace key to your public
          key on their device.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      ) : invitations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invitations.</p>
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
                    {invitation.workspaceName ?? "Workspace"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Role: {invitation.role}
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
                  {invitation.status === "waiting_for_owner_seal" ? (
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
