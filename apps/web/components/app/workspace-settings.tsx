"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  GetWorkspaceBillingResponse,
  WorkspaceInvitation,
  WorkspaceInviteRole,
  WorkspaceMember,
} from "@helvety-cloud/api-contract";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
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

type WorkspaceSettingsProps = {
  workspaceId: string;
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

const BLOCKING_SUB_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

export function WorkspaceSettings({ workspaceId }: WorkspaceSettingsProps) {
  const router = useRouter();
  const {
    vault,
    workspaces,
    getWorkspaceKey,
    renameWorkspace,
    removeWorkspace,
  } = useVaultSession();

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const canManage =
    workspace?.role === "owner" || workspace?.role === "admin";
  const isOwner = workspace?.role === "owner";
  const isPersonal = workspace?.kind === "personal";

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? workspace?.name ?? "";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceInviteRole>("member");
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [billing, setBilling] = useState<GetWorkspaceBillingResponse | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seatLimitHit, setSeatLimitHit] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

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
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, canManage]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
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
        setError(
          err instanceof Error ? err.message : "Failed to load settings",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, canManage]);

  async function onSaveName() {
    const trimmed = name.trim();
    if (!trimmed || !workspace || trimmed === workspace.name) return;
    setPending(true);
    setError(null);
    try {
      await renameWorkspace(workspaceId, trimmed);
      setNameDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setPending(false);
    }
  }

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
    if (!canManage || !workspace) return;
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
        workspaceName: workspace.name,
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
    if (!workspace) return;
    const mail = invitationMailto({
      email: invitation.email,
      workspaceName: workspace.name,
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

  async function onDeleteWorkspace() {
    setPending(true);
    setError(null);
    try {
      await removeWorkspace(workspaceId);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPending(false);
      throw err;
    }
  }

  const activeInvites = invitations.filter(
    (i) => i.status !== "cancelled" && i.status !== "accepted",
  );

  const needsBillingCancel =
    isOwner &&
    !isPersonal &&
    Boolean(
      billing &&
        BLOCKING_SUB_STATUSES.has(billing.status) &&
        !billing.cancelAtPeriodEnd,
    );

  if (!vault) return null;

  if (!workspace) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Workspace settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage name, members, billing, and deletion for{" "}
          <span className="font-medium text-foreground">{workspace.name}</span>.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">General</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ws-settings-name">Name</Label>
          <div className="flex gap-2">
            <Input
              id="ws-settings-name"
              value={name}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={120}
              disabled={pending}
            />
            <Button
              type="button"
              size="sm"
              disabled={
                pending || !name.trim() || name.trim() === workspace.name
              }
              onClick={() => void onSaveName()}
            >
              Save
            </Button>
          </div>
          {isPersonal ? (
            <p className="text-xs text-muted-foreground">
              Personal workspace — cannot be deleted.
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Members & invitations</h2>
        <p className="text-xs text-muted-foreground">
          Invite by email. After they sign in and set up their vault, complete
          key handoff on an unlocked device. Helvety never sees the workspace
          key or vault content.
        </p>

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
                    <div className="min-w-0">
                      <p className="truncate text-sm">{invitation.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {statusLabel(invitation.status)} · {invitation.role}
                      </p>
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Billing</h2>
        {billing ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Plan: <span className="uppercase">{billing.plan}</span>
              {" · "}
              Seats {billing.usage.members + billing.usage.pendingInvitations}/
              {billing.limits.members}
              {billing.cancelAtPeriodEnd ? " · cancels at period end" : ""}
            </p>
            {isOwner ? (
              billing.plan === "free" ? (
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
            ) : (
              <p className="text-xs text-muted-foreground">
                Only the owner can manage billing.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Loading billing…</p>
        )}
      </section>

      {isOwner ? (
        <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
          {isPersonal ? (
            <p className="text-xs text-muted-foreground">
              Your personal workspace cannot be deleted. It is created with your
              vault and anchors your account.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Permanently delete this workspace and all projects, tasks,
                notes, contacts, and invitations. This cannot be undone. Helvety
                cannot recover deleted vault data.
              </p>
              {needsBillingCancel ? (
                <p className="text-xs text-muted-foreground">
                  Cancel the Pro subscription in Manage billing before deleting
                  this workspace.
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1">
                  <Label htmlFor="ws-delete-confirm" className="text-xs">
                    Type <span className="font-medium">{workspace.name}</span> to
                    confirm
                  </Label>
                  <Input
                    id="ws-delete-confirm"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    disabled={pending}
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={
                    pending ||
                    deleteConfirmName !== workspace.name ||
                    needsBillingCancel
                  }
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete workspace
                </Button>
              </div>
              <ConfirmDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={`Delete workspace “${workspace.name}”?`}
                description="This permanently deletes the workspace and everything in it. This cannot be undone."
                busy={pending}
                onConfirm={onDeleteWorkspace}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
