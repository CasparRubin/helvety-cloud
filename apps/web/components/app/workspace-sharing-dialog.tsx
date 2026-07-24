"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GetWorkspaceBillingResponse,
  WorkspaceInvitation,
  WorkspaceInviteRole,
  WorkspaceMember,
} from "@helvety-cloud/api-contract";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import {
  ApiClientError,
  cancelWorkspaceInvitation,
  createBillingCheckout,
  createBillingPortal,
  createWorkspaceInvitation,
  getWorkspaceBilling,
  listWorkspaceInvitations,
  listWorkspaceMembers,
} from "@/lib/api/v1-client";
import {
  handoffInvitationSeal,
  invitationMailto,
} from "@/lib/vault/workspaces";

type WorkspaceSharingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  canManage: boolean;
  isOwner: boolean;
};

function statusLabel(status: WorkspaceInvitation["status"]): string {
  switch (status) {
    case "waiting_for_recipient":
      return "Waiting for recipient";
    case "waiting_for_owner_seal":
      return "Needs key handoff";
    case "ready_to_accept":
      return "Ready to accept";
    case "accepted":
      return "Accepted";
    case "cancelled":
      return "Cancelled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function WorkspaceSharingDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  canManage,
  isOwner,
}: WorkspaceSharingDialogProps) {
  const { vault, getWorkspaceKey } = useVaultSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceInviteRole>("member");
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [billing, setBilling] = useState<GetWorkspaceBillingResponse | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatLimitHit, setSeatLimitHit] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [inv, mem, bill] = await Promise.all([
        canManage
          ? listWorkspaceInvitations(workspaceId)
          : Promise.resolve({ invitations: [] }),
        listWorkspaceMembers(workspaceId),
        getWorkspaceBilling(workspaceId).catch(() => null),
      ]);
      setInvitations(inv.invitations);
      setMembers(mem.members);
      setBilling(bill);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sharing");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, canManage]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const [inv, mem, bill] = await Promise.all([
          canManage
            ? listWorkspaceInvitations(workspaceId)
            : Promise.resolve({ invitations: [] }),
          listWorkspaceMembers(workspaceId),
          getWorkspaceBilling(workspaceId).catch(() => null),
        ]);
        if (cancelled) return;
        setInvitations(inv.invitations);
        setMembers(mem.members);
        setBilling(bill);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load sharing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, canManage]);

  async function onUpgrade() {
    setPending(true);
    setError(null);
    try {
      const { url } = await createBillingCheckout(workspaceId);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upgrade failed");
      setPending(false);
    }
  }

  async function onManageBilling() {
    setPending(true);
    setError(null);
    try {
      const { url } = await createBillingPortal(workspaceId);
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open billing portal",
      );
      setPending(false);
    }
  }

  async function onInvite() {
    if (!canManage) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    setSeatLimitHit(false);
    try {
      const created = await createWorkspaceInvitation(workspaceId, {
        id: crypto.randomUUID(),
        email: trimmed,
        role,
      });
      setEmail("");
      setInvitations((prev) => [created, ...prev]);
      const mail = invitationMailto({
        email: created.email,
        workspaceName,
        appOrigin: window.location.origin,
      });
      window.open(mail.href, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "limit_exceeded") {
        setSeatLimitHit(true);
      }
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Invite failed",
      );
    } finally {
      setPending(false);
    }
  }

  async function onSeal(invitation: WorkspaceInvitation) {
    if (!vault || !invitation.claimedPublicKey) return;
    setPending(true);
    setError(null);
    try {
      const workspaceKey = await getWorkspaceKey(workspaceId);
      await handoffInvitationSeal({
        vault,
        workspaceId,
        invitationId: invitation.id,
        claimedPublicKey: invitation.claimedPublicKey,
        workspaceKey,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key handoff failed");
    } finally {
      setPending(false);
    }
  }

  async function onCancel(invitation: WorkspaceInvitation) {
    setPending(true);
    setError(null);
    try {
      await cancelWorkspaceInvitation(workspaceId, invitation.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setPending(false);
    }
  }

  async function onCopyInvite(invitation: WorkspaceInvitation) {
    const mail = invitationMailto({
      email: invitation.email,
      workspaceName,
      appOrigin: window.location.origin,
    });
    try {
      await navigator.clipboard.writeText(mail.body);
      setCopiedId(invitation.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy invitation text");
    }
  }

  const activeInvites = invitations.filter(
    (i) => i.status !== "cancelled" && i.status !== "accepted",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share workspace</DialogTitle>
          <DialogDescription>
            Invite by email. After they sign in and set up their vault, complete
            key handoff on an unlocked device. Helvety never sees the workspace
            key or vault content.
          </DialogDescription>
        </DialogHeader>

        {canManage ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onInvite();
              }}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="invite-role" className="shrink-0 text-xs">
                Role
              </Label>
              <select
                id="invite-role"
                className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
                value={role}
                disabled={pending}
                onChange={(e) =>
                  setRole(e.target.value as WorkspaceInviteRole)
                }
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                type="button"
                size="sm"
                disabled={pending || !email.trim()}
                onClick={() => void onInvite()}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Invite
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Only owners and admins can invite members.
          </p>
        )}

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {seatLimitHit && isOwner && billing?.plan === "free" ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
            <p className="text-xs text-muted-foreground">
              The free plan includes {billing.limits.members} seats per
              workspace.
            </p>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => void onUpgrade()}
            >
              Upgrade to Pro
            </Button>
          </div>
        ) : null}

        {billing ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Plan: <span className="uppercase">{billing.plan}</span>
              {" · "}
              Seats {billing.usage.members + billing.usage.pendingInvitations}/
              {billing.limits.members}
              {billing.cancelAtPeriodEnd ? " · cancels at period end" : ""}
            </p>
            {isOwner ? (
              billing.plan === "free" && !seatLimitHit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void onUpgrade()}
                >
                  Upgrade to Pro
                </Button>
              ) : billing.hasStripeCustomer ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void onManageBilling()}
                >
                  Manage billing
                </Button>
              ) : null
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Members
          </p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
                >
                  <span className="truncate font-mono text-xs">
                    {m.userId.slice(0, 8)}…
                  </span>
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canManage ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Pending invitations
            </p>
            {activeInvites.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {activeInvites.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-1.5 rounded-md border border-border px-2 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{invitation.email}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {statusLabel(invitation.status)} · {invitation.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => void onCopyInvite(invitation)}
                      >
                        {copiedId === invitation.id ? "Copied" : "Copy invite"}
                      </Button>
                      {invitation.status === "waiting_for_owner_seal" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending || !vault}
                          onClick={() => void onSeal(invitation)}
                        >
                          Complete key handoff
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => void onCancel(invitation)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
