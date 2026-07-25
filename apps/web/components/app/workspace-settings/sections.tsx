"use client";

import { useEffect } from "react";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import {
  invitationStatusLabel,
  useWorkspaceSettings,
} from "@/components/app/workspace-settings/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useVaultSession } from "@/components/vault/vault-session-provider";

function SettingsError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mb-4 text-sm text-destructive" role="alert">
      {error}
    </p>
  );
}

export function WorkspaceGeneralSettings() {
  const {
    workspace,
    isPersonal,
    name,
    setNameDraft,
    pending,
    error,
    onSaveName,
  } = useWorkspaceSettings();

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <SettingsError error={error} />
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
    </div>
  );
}

export function WorkspaceMembersSettings() {
  const { vault } = useVaultSession();
  const {
    canManage,
    isOwner,
    email,
    setEmail,
    role,
    setRole,
    members,
    billing,
    pending,
    membersLoading,
    error,
    seatLimitHit,
    copiedId,
    activeInvites,
    ensureMembersLoaded,
    ensureBillingLoaded,
    onInvite,
    onSeal,
    onCancel,
    onCopyInvite,
    onUpgrade,
  } = useWorkspaceSettings();

  useEffect(() => {
    void ensureMembersLoaded();
  }, [ensureMembersLoaded]);

  useEffect(() => {
    if (seatLimitHit) void ensureBillingLoaded();
  }, [seatLimitHit, ensureBillingLoaded]);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <SettingsError error={error} />
      <p className="text-xs text-muted-foreground">
        Invite by email. After they sign in and set up their vault, complete key
        handoff on an unlocked device. Helvety never sees the workspace key or
        vault content.
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
              className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={role}
              disabled={pending}
              onChange={(e) =>
                setRole(e.target.value as "member" | "admin")
              }
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Button
              type="button"
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
            The free plan includes {billing.limits.members} seats per workspace.
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
        {membersLoading ? (
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
                      {invitationStatusLabel(invitation.status)} ·{" "}
                      {invitation.role}
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
    </div>
  );
}

export function WorkspaceBillingSettings() {
  const {
    isOwner,
    billing,
    pending,
    billingLoading,
    error,
    ensureBillingLoaded,
    onUpgrade,
    onManageBilling,
  } = useWorkspaceSettings();

  useEffect(() => {
    void ensureBillingLoaded();
  }, [ensureBillingLoaded]);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <SettingsError error={error} />
      {billingLoading && !billing ? (
        <p className="text-xs text-muted-foreground">Loading billing…</p>
      ) : billing ? (
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
        <p className="text-xs text-muted-foreground">
          Billing information unavailable.
        </p>
      )}
    </div>
  );
}

export function WorkspaceDangerSettings() {
  const {
    workspace,
    isOwner,
    isPersonal,
    pending,
    error,
    deleteOpen,
    setDeleteOpen,
    deleteConfirmName,
    setDeleteConfirmName,
    needsBillingCancel,
    ensureBillingLoaded,
    onDeleteWorkspace,
  } = useWorkspaceSettings();

  useEffect(() => {
    if (isOwner && !isPersonal) void ensureBillingLoaded();
  }, [isOwner, isPersonal, ensureBillingLoaded]);

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the workspace owner can access the danger zone.
      </p>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-destructive/30 p-4">
      <SettingsError error={error} />
      {isPersonal ? (
        <p className="text-xs text-muted-foreground">
          Your personal workspace cannot be deleted. It is created with your
          vault and anchors your account.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Permanently delete this workspace and all projects, tasks, notes,
            contacts, and invitations. This cannot be undone. Helvety cannot
            recover deleted vault data.
          </p>
          {needsBillingCancel ? (
            <p className="text-xs text-muted-foreground">
              Cancel the Pro subscription in Manage billing before deleting this
              workspace.
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
    </div>
  );
}
