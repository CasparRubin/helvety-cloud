"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { WorkspaceInvitation } from "@helvety-cloud/api-contract";

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
import { useRouter } from "@/i18n/navigation";

function statusCopy(
  status: WorkspaceInvitation["status"],
  t: (
    key:
      | "statusWaitingForRecipient"
      | "statusWaitingForOwnerSeal"
      | "statusReadyToAccept"
      | "statusAccepted"
      | "statusCancelled",
  ) => string,
): string {
  switch (status) {
    case "waiting_for_recipient":
      return t("statusWaitingForRecipient");
    case "waiting_for_owner_seal":
      return t("statusWaitingForOwnerSeal");
    case "ready_to_accept":
      return t("statusReadyToAccept");
    case "accepted":
      return t("statusAccepted");
    case "cancelled":
      return t("statusCancelled");
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Workspace names live in ciphertext; readable once the owner sealed the
 * workspace key to this user's keys.
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
  const t = useTranslations("invitations");
  const tSettings = useTranslations("settings");
  const tShell = useTranslations("shell");
  const tCommon = useTranslations("common");
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
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [userKeys, loadInvitations, t]);

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
        setError(err instanceof Error ? err.message : t("loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKeys, loadInvitations, t]);

  async function onClaim(invitation: WorkspaceInvitation) {
    setPendingId(invitation.id);
    setError(null);
    try {
      await claimInvitation(invitation.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("claimFailed"));
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
      setError(err instanceof Error ? err.message : t("acceptFailed"));
      setPendingId(null);
    }
  }

  function roleLabel(role: string): string {
    switch (role) {
      case "owner":
        return tSettings("owner");
      case "admin":
        return tSettings("admin");
      case "member":
        return tSettings("member");
      default:
        return role;
    }
  }

  if (!userKeys) {
    return (
      <p className="text-sm text-muted-foreground">{t("unlockRequired")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> {tCommon("loading")}
        </p>
      ) : invitations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
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
                    {workspaceNames.get(invitation.id) ?? tShell("workspace")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("roleLabel", { role: roleLabel(invitation.role) })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {statusCopy(invitation.status, t)}
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
                      {t("claim")}
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
                      {t("accept")}
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
                      {t("refresh")}
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
