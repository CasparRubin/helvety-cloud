"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { WorkspaceInvitation } from "@helvety-cloud/api-contract";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import { CreateEntityDialog } from "@/components/app/create-entity-dialog";
import { useWorkspaceSettings } from "@/components/app/workspace-settings/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { formatBytes } from "@/lib/billing/entitlements";

function formatLimit(value: number | null): string {
  return value === null ? "∞" : String(value);
}

function SettingsError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mb-4 text-sm text-destructive" role="alert">
      {error}
    </p>
  );
}

function roleLabel(
  role: string,
  t: (key: "owner" | "admin" | "member") => string,
): string {
  switch (role) {
    case "owner":
      return t("owner");
    case "admin":
      return t("admin");
    case "member":
      return t("member");
    default:
      return role;
  }
}

function invitationStatusLabel(
  status: WorkspaceInvitation["status"],
  t: (
    key:
      | "labelWaitingForRecipient"
      | "labelWaitingForOwnerSeal"
      | "labelReadyToAccept"
      | "labelAccepted"
      | "labelCancelled",
  ) => string,
): string {
  switch (status) {
    case "waiting_for_recipient":
      return t("labelWaitingForRecipient");
    case "waiting_for_owner_seal":
      return t("labelWaitingForOwnerSeal");
    case "ready_to_accept":
      return t("labelReadyToAccept");
    case "accepted":
      return t("labelAccepted");
    case "cancelled":
      return t("labelCancelled");
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function WorkspaceGeneralSettings() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
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
      <p className="text-sm text-muted-foreground">{t("workspaceNotFound")}</p>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      <SettingsError error={error} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="ws-settings-name" required>
          {t("name")}
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
            {tCommon("save")}
          </Button>
        </div>
        {isPersonal ? (
          <p className="text-xs text-muted-foreground">
            {t("personalWorkspaceHint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function WorkspaceMembersSettings() {
  const t = useTranslations("settings");
  const tInvitations = useTranslations("invitations");
  const tCommon = useTranslations("common");
  const { userKeys } = useCryptoSession();
  const {
    canManage,
    isOwner,
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

  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  useEffect(() => {
    void ensureMembersLoaded();
  }, [ensureMembersLoaded]);

  useEffect(() => {
    if (seatLimitHit) void ensureBillingLoaded();
  }, [seatLimitHit, ensureBillingLoaded]);

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <SettingsError error={error} />
      <p className="text-xs text-muted-foreground">{t("membersInviteIntro")}</p>

      {canManage ? (
        <CreateEntityDialog
          triggerLabel={t("inviteMember")}
          dialogTitle={t("inviteMember")}
          fieldLabel={t("inviteEmail")}
          fieldPlaceholder={t("inviteEmailPlaceholder")}
          fieldType="email"
          fieldMaxLength={320}
          confirmLabel={t("invite")}
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
              {t("role")}
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
              <option value="member">{t("member")}</option>
              <option value="admin">{t("admin")}</option>
            </select>
          </div>
        </CreateEntityDialog>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("onlyOwnersAdminsInvite")}
        </p>
      )}

      {seatLimitHit && isOwner && billing?.plan === "free" ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            {t("freePlanSeats", {
              count: formatLimit(billing.limits.members),
            })}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void onUpgrade()}
          >
            {t("upgradeToPro")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("members")}
        </p>
        {membersLoading ? (
          <p className="text-xs text-muted-foreground">{tCommon("loading")}</p>
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
                <span className="text-xs text-muted-foreground">
                  {roleLabel(m.role, t)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("pendingInvitations")}
          </p>
          {activeInvites.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("none")}</p>
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
                      {invitationStatusLabel(invitation.status, tInvitations)} ·{" "}
                      {roleLabel(invitation.role, t)}
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
                      {copiedId === invitation.id
                        ? t("copied")
                        : t("copyInvite")}
                    </Button>
                    {invitation.status === "waiting_for_owner_seal" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending || !userKeys}
                        onClick={() => void onSeal(invitation)}
                      >
                        {t("completeKeyHandoff")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => void onCancel(invitation)}
                    >
                      {tCommon("cancel")}
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
  const t = useTranslations("settings");
  const {
    isOwner,
    billing,
    pending,
    billingLoading,
    error,
    ensureBillingLoaded,
    onUpgrade,
    onManageBilling,
    onRedeemDiscount,
    onRemoveDiscount,
  } = useWorkspaceSettings();
  const [discountCode, setDiscountCode] = useState("");

  useEffect(() => {
    void ensureBillingLoaded();
  }, [ensureBillingLoaded]);

  const isComplimentary = Boolean(
    billing && (billing.unmetered || billing.billingSource === "comp"),
  );
  const discountApplied = Boolean(billing?.discountPercentOff);

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <SettingsError error={error} />
      {billingLoading && !billing ? (
        <p className="text-xs text-muted-foreground">{t("loadingBilling")}</p>
      ) : billing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {t.rich("planLine", {
                  plan: () => (
                    <span className="uppercase">{billing.plan}</span>
                  ),
                })}
                {isComplimentary ? ` · ${t("complimentary")}` : ""}
                {!isComplimentary && billing.discountPercentOff
                  ? ` · ${t("percentOff", { percent: billing.discountPercentOff })}`
                  : ""}
                {" · "}
                {t("seatsUsage", {
                  used:
                    billing.usage.members + billing.usage.pendingInvitations,
                  limit: formatLimit(billing.limits.members),
                })}
                {billing.cancelAtPeriodEnd
                  ? ` · ${t("cancelsAtPeriodEnd")}`
                  : ""}
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
                    {t("upgradeToPro")}
                  </Button>
                ) : billing.billingSource === "stripe" &&
                  billing.hasStripeCustomer ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void onManageBilling()}
                  >
                    {t("manageBilling")}
                  </Button>
                ) : null
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("onlyOwnerManageBilling")}
                </p>
              )}
            </div>
            {billing.freeOverflowLocked ? (
              <p className="text-xs text-muted-foreground">
                {t("freeOverflowLocked")}
              </p>
            ) : null}
            {isComplimentary ? (
              <p className="text-xs text-muted-foreground">
                {t("unmeteredProLimits")}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {t("usageProjects", {
                used: billing.usage.projects,
                limit: formatLimit(billing.limits.projects),
              })}
              {" · "}
              {t("usageNotes", {
                used: billing.usage.notes,
                limit: formatLimit(billing.limits.notes),
              })}
              {" · "}
              {t("usageContacts", {
                used: billing.usage.contacts,
                limit: formatLimit(billing.limits.contacts),
              })}
              {" · "}
              {t("usageTasksPerProject", {
                limit: formatLimit(billing.limits.tasks),
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("fileStorage")}{" "}
              {billing.limits.storageBytes === null
                ? t("storageUnmetered", {
                    used: formatBytes(billing.usage.storageBytes),
                    maxUpload: formatBytes(billing.limits.maxUploadBytes),
                  })
                : billing.limits.storageBytes === 0
                  ? t("storageNotIncluded")
                  : t("storageMetered", {
                      used: formatBytes(billing.usage.storageBytes),
                      limit: formatBytes(billing.limits.storageBytes),
                      maxUpload: formatBytes(billing.limits.maxUploadBytes),
                      filesPerTask: formatLimit(billing.limits.filesPerTask),
                    })}
            </p>
            {isOwner && discountApplied ? (
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">
                  {isComplimentary
                    ? t("complimentaryCodeApplied")
                    : t("discountApplied", {
                        percent: billing.discountPercentOff ?? 0,
                      })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void onRemoveDiscount()}
                >
                  {t("removeDiscount")}
                </Button>
              </div>
            ) : null}
          </div>
          {isOwner && !discountApplied ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const code = discountCode.trim();
                if (!code) return;
                void onRedeemDiscount(code).then(() => setDiscountCode(""));
              }}
            >
              <Label htmlFor="discount-code" className="text-xs">
                {t("discountOrCompCode")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="discount-code"
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value)}
                  placeholder={t("enterCode")}
                  disabled={pending}
                  autoComplete="off"
                  className="font-mono text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={pending || discountCode.trim().length < 8}
                >
                  {t("apply")}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("billingUnavailable")}
        </p>
      )}
    </div>
  );
}

export function WorkspaceDangerSettings() {
  const t = useTranslations("settings");
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
      <p className="text-sm text-muted-foreground">{t("workspaceNotFound")}</p>
    );
  }

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">{t("onlyOwnerDangerZone")}</p>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-destructive/30 p-4">
      <SettingsError error={error} />
      {isPersonal ? (
        <p className="text-xs text-muted-foreground">
          {t("personalCannotDelete")}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("deleteWorkspaceWarning")}
          </p>
          {needsBillingCancel ? (
            <p className="text-xs text-muted-foreground">
              {t("cancelProBeforeDelete")}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="ws-delete-confirm" className="text-xs">
                {t.rich("typeNameToConfirm", {
                  name: () => (
                    <span className="font-medium">{workspace.name}</span>
                  ),
                })}
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
              {t("deleteWorkspace")}
            </Button>
          </div>
          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={t("deleteWorkspaceTitle", { name: workspace.name })}
            description={t("deleteWorkspaceDescription")}
            busy={pending}
            onConfirm={onDeleteWorkspace}
          />
        </>
      )}
    </div>
  );
}
