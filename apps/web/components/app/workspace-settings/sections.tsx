"use client";

import { useEffect, useState } from "react";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { DateTimeText } from "@/components/app/datetime-text";
import { CategorizationOptionList } from "@/components/app/project-settings/option-list";
import {
  invitationStatusLabel,
  useWorkspaceSettings,
} from "@/components/app/workspace-settings/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { PLAN_LIMITS, CAPACITY_PACK, formatBytes } from "@/lib/billing/entitlements";
import { cn } from "@/lib/utils";

function formatLimit(value: number | null): string {
  return value === null ? "∞" : String(value);
}

function formatPlanTitle(plan: "free" | "pro"): string {
  return plan === "pro" ? "Pro Workspace" : "Free";
}

function formatBillingStatus(status: string): string {
  if (status === "trialing") return "Trialing";
  if (status === "active") return "Active";
  return status.replaceAll("_", " ");
}

function PeriodSuffix({
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  if (currentPeriodEnd) {
    return (
      <>
        {" · "}
        {cancelAtPeriodEnd ? "Cancels " : "Renews "}
        <DateTimeText mode="date" value={currentPeriodEnd} />
      </>
    );
  }
  if (cancelAtPeriodEnd) return <> · Cancels at period end</>;
  return null;
}

function meterPercent(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageMeterRow({
  label,
  used,
  limit,
  formatValue = (n: number) => String(n),
}: {
  label: string;
  used: number;
  limit: number | null;
  formatValue?: (n: number) => string;
}) {
  const percent = meterPercent(used, limit);
  const atLimit = percent !== null && percent >= 100;
  const limitLabel = limit === null ? "∞" : formatValue(limit);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {formatValue(used)}
          <span className="text-muted-foreground"> / {limitLabel}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            percent === null
              ? "w-0 bg-transparent"
              : atLimit
                ? "bg-destructive"
                : "bg-foreground/40",
          )}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

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
        <Label htmlFor="ws-settings-name" required>
          Name
        </Label>
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
            Personal workspace. Cannot be deleted.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function WorkspaceStagesSettings() {
  const {
    workspace,
    pending,
    categorizationsError,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetDefault,
    onSetOptionColor,
    onSetOptionIcon,
    onSetMaxVisibleTasks,
    onSetCompletionPercent,
  } = useWorkspaceSettings();

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsError error={categorizationsError} />
      <CategorizationOptionList
        title="Stages"
        description="Required on tasks. Default is used for new tasks and when deleting an in-use stage. Show limits how many tasks appear before “Show more”. % is the stage’s weight toward project completion (Cancelled is excluded)."
        kind="stages"
        options={workspace.categorizations.stages}
        showDefault
        busy={pending}
        onAdd={(name) => onAddOption("stages", name)}
        onRename={(id, name) => onRenameOption("stages", id, name)}
        onDelete={(id) => onDeleteOption("stages", id)}
        onReorder={(id, direction) => onReorderOption("stages", id, direction)}
        onSetDefault={(id) => onSetDefault("stages", id)}
        onSetColor={(id, color) => onSetOptionColor(id, color)}
        onSetIcon={(id, icon) => onSetOptionIcon("stages", id, icon)}
        onSetMaxVisibleTasks={onSetMaxVisibleTasks}
        onSetCompletionPercent={onSetCompletionPercent}
      />
    </div>
  );
}

export function WorkspaceLabelsSettings() {
  const {
    workspace,
    pending,
    categorizationsError,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetOptionIcon,
  } = useWorkspaceSettings();

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsError error={categorizationsError} />
      <CategorizationOptionList
        title="Labels"
        description="Optional on tasks. Delete clears the label on affected tasks across this workspace."
        kind="labels"
        options={workspace.categorizations.labels}
        showDefault={false}
        busy={pending}
        onAdd={(name) => onAddOption("labels", name)}
        onRename={(id, name) => onRenameOption("labels", id, name)}
        onDelete={(id) => onDeleteOption("labels", id)}
        onReorder={(id, direction) => onReorderOption("labels", id, direction)}
        onSetIcon={(id, icon) => onSetOptionIcon("labels", id, icon)}
      />
    </div>
  );
}

export function WorkspacePrioritiesSettings() {
  const {
    workspace,
    pending,
    categorizationsError,
    onAddOption,
    onRenameOption,
    onDeleteOption,
    onReorderOption,
    onSetDefault,
    onSetOptionIcon,
  } = useWorkspaceSettings();

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsError error={categorizationsError} />
      <CategorizationOptionList
        title="Priorities"
        description="Required on tasks. Default is used for new tasks and when deleting an in-use priority."
        kind="priorities"
        options={workspace.categorizations.priorities}
        showDefault
        busy={pending}
        onAdd={(name) => onAddOption("priorities", name)}
        onRename={(id, name) => onRenameOption("priorities", id, name)}
        onDelete={(id) => onDeleteOption("priorities", id)}
        onReorder={(id, direction) =>
          onReorderOption("priorities", id, direction)
        }
        onSetDefault={(id) => onSetDefault("priorities", id)}
        onSetIcon={(id, icon) => onSetOptionIcon("priorities", id, icon)}
      />
    </div>
  );
}

export function WorkspaceMembersSettings() {
  const { userKeys } = useCryptoSession();
  const {
    canManage,
    isOwner,
    members,
    billing,
    pending,
    membersLoading,
    error,
    memberLimitHit,
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

  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  useEffect(() => {
    void ensureMembersLoaded();
  }, [ensureMembersLoaded]);

  useEffect(() => {
    if (memberLimitHit) void ensureBillingLoaded();
  }, [memberLimitHit, ensureBillingLoaded]);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <SettingsError error={error} />
      <p className="text-xs text-muted-foreground">
        Invite by email. After they sign in and set up encryption, complete key
        handoff on an unlocked device. Helvety never sees the workspace key or
        your data.
      </p>

      {canManage ? (
        <CreateEntityDialog
          triggerLabel="Invite member"
          dialogTitle="Invite member"
          fieldLabel="Email"
          fieldPlaceholder="teammate@example.com"
          fieldType="email"
          fieldMaxLength={320}
          confirmLabel="Invite"
          disabled={pending}
          onCreate={async (email) => {
            await onInvite({ email, role: inviteRole });
          }}
          onOpenChange={(open) => {
            if (open) setInviteRole("member");
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role" required>
              Role
            </Label>
            <select
              id="invite-role"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={inviteRole}
              disabled={pending}
              onChange={(e) =>
                setInviteRole(e.target.value as "member" | "admin")
              }
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </CreateEntityDialog>
      ) : (
        <p className="text-xs text-muted-foreground">
          Only owners and admins can invite members.
        </p>
      )}

      {memberLimitHit && isOwner && billing?.plan === "free" ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            The free plan includes {formatLimit(billing.limits.members)} members
            per workspace.
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
                className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5"
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
                  className="flex flex-col gap-1.5 rounded-lg border border-border px-2 py-2"
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
                        disabled={pending || !userKeys}
                        onClick={() => void onSeal(invitation)}
                      >
                        Complete key handoff
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
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

  const capacityQty =
    billing?.addons.find((a) => a.meter === "capacity")?.quantity ?? 0;
  const memberSeats = billing
    ? billing.usage.members + billing.usage.pendingInvitations
    : 0;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <SettingsError error={error} />
      {billingLoading && !billing ? (
        <p className="text-xs text-muted-foreground">Loading billing…</p>
      ) : billing ? (
        <>
          <Card size="sm">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {formatPlanTitle(billing.plan)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBillingStatus(billing.status)}
                    <PeriodSuffix
                      currentPeriodEnd={billing.currentPeriodEnd}
                      cancelAtPeriodEnd={billing.cancelAtPeriodEnd}
                    />
                  </p>
                </div>
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
                  <p className="shrink-0 text-xs text-muted-foreground">
                    Only the owner can manage billing.
                  </p>
                )}
              </div>
              {billing.freeOverflowLocked ? (
                <p className="text-xs text-muted-foreground">
                  New creates are paused because this workspace is over the free
                  allowance (
                  {PLAN_LIMITS.free.ownedWorkspaces === 1
                    ? "1 free workspace per account"
                    : `${PLAN_LIMITS.free.ownedWorkspaces} free workspaces per account`}
                  ). Existing content stays available. Upgrade to Pro, or reduce
                  owned free workspaces to unlock creates again.
                </p>
              ) : null}
              {isOwner && billing.plan === "free" ? (
                <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                  Promotion codes can be entered at Stripe Checkout after you
                  click Upgrade to Pro.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs font-medium text-foreground">Usage</p>
              <UsageMeterRow
                label="Projects"
                used={billing.usage.projects}
                limit={billing.limits.projects}
              />
              <UsageMeterRow
                label="Members"
                used={memberSeats}
                limit={billing.limits.members}
              />
              <UsageMeterRow
                label="Notes"
                used={billing.usage.notes}
                limit={billing.limits.notes}
              />
              <UsageMeterRow
                label="Contacts"
                used={billing.usage.contacts}
                limit={billing.limits.contacts}
              />
              <UsageMeterRow
                label="Comments"
                used={billing.usage.comments}
                limit={billing.limits.comments}
              />
              {billing.limits.storageBytes === 0 ? (
                <CapRow label="File storage" value="Not included on Free" />
              ) : (
                <UsageMeterRow
                  label="File storage"
                  used={billing.usage.storageBytes}
                  limit={billing.limits.storageBytes}
                  formatValue={formatBytes}
                />
              )}
              <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                <CapRow
                  label="Tasks per project"
                  value={`Up to ${formatLimit(billing.limits.tasks)}`}
                />
                <CapRow
                  label="Files per task"
                  value={
                    billing.limits.filesPerTask === 0
                      ? "Not included on Free"
                      : `Up to ${formatLimit(billing.limits.filesPerTask)}`
                  }
                />
                {billing.limits.maxUploadBytes > 0 ? (
                  <CapRow
                    label="Max upload size"
                    value={formatBytes(billing.limits.maxUploadBytes)}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">Add-ons</p>
              {billing.plan === "pro" ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {CAPACITY_PACK.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {capacityQty > 0
                          ? `${capacityQty} pack${capacityQty === 1 ? "" : "s"}`
                          : "No packs yet"}
                      </p>
                    </div>
                    {isOwner && billing.hasStripeCustomer ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={pending}
                        onClick={() => void onManageBilling()}
                      >
                        Add or change
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Each pack adds {CAPACITY_PACK.deltas.projects} projects,{" "}
                    {CAPACITY_PACK.deltas.tasksPerProject} tasks per project,{" "}
                    {CAPACITY_PACK.deltas.notes} notes,{" "}
                    {CAPACITY_PACK.deltas.contacts} contacts,{" "}
                    {CAPACITY_PACK.deltas.comments} comments and replies,{" "}
                    {CAPACITY_PACK.deltas.members} members, and{" "}
                    {formatBytes(CAPACITY_PACK.deltas.storageBytes)} storage.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Capacity Increase is available on Pro Workspace. Each pack
                  raises projects, tasks, notes, contacts, comments, members, and
                  storage together.
                </p>
              )}
            </CardContent>
          </Card>
        </>
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
          encryption setup and anchors your account.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Permanently delete this workspace and all projects, tasks, notes,
            contacts, files, invitations, and sharing. This cannot be undone.
            Helvety cannot recover deleted data.
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
            description="This permanently deletes the workspace and all projects, tasks, notes, contacts, files, invitations, and sharing. This cannot be undone. Helvety cannot recover deleted data."
            busy={pending}
            onConfirm={onDeleteWorkspace}
          />
        </>
      )}
    </div>
  );
}
