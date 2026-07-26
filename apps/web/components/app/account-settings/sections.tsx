"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import { useAccountSettings } from "@/components/app/account-settings/provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";

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

export function AccountGeneralSettings() {
  const t = useTranslations("settings");
  const { account, error } = useAccountSettings();

  if (error && !account) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!account) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> {t("loadingAccount")}
      </p>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t.rich("signedInAs", {
          email: () => (
            <span className="font-medium text-foreground">{account.email}</span>
          ),
        })}
      </p>
    </div>
  );
}

export function AccountDangerSettings() {
  const t = useTranslations("settings");
  const tShell = useTranslations("shell");
  const {
    account,
    error,
    pending,
    confirmEmail,
    setConfirmEmail,
    cleanupAck,
    setCleanupAck,
    deleteOpen,
    setDeleteOpen,
    canDelete,
    canSubmit,
    onDeleteAccount,
  } = useAccountSettings();
  const { workspaces } = useCryptoSession();

  const workspaceName = (workspaceId: string) =>
    workspaces.find((w) => w.id === workspaceId)?.name ?? tShell("workspace");

  if (error && !account) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  if (!account) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> {t("loadingAccount")}
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">{t("whatDeletionDoes")}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>{t("deletionBulletAuth")}</li>
          <li>{t("deletionBulletSolo")}</li>
          <li>{t("deletionBulletPro")}</li>
          <li>{t("deletionBulletShared")}</li>
          <li>{t("deletionBulletInvites")}</li>
        </ul>
      </section>

      {account.soloOwnedWorkspaces.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{t("willBeDeleted")}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {account.soloOwnedWorkspaces.map((ws) => (
              <li
                key={ws.id}
                className="rounded-md border border-border px-2 py-1.5"
              >
                {workspaceName(ws.id)}
                {ws.kind === "personal" ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {t("personalBadge")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {account.leavingWorkspaces.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">{t("youWillLeave")}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {account.leavingWorkspaces.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
              >
                <span>{workspaceName(ws.id)}</span>
                <span className="text-xs text-muted-foreground">
                  {roleLabel(ws.role, t)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!canDelete ? (
        <section className="flex flex-col gap-2 rounded-lg border border-amber-500/40 p-4">
          <h2 className="text-sm font-medium">{t("cannotDeleteYet")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("cannotDeleteYetBody")}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {account.blockingWorkspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/app/w/${ws.id}/settings/general`}
                  className="underline underline-offset-4"
                >
                  {workspaceName(ws.id)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
        <h2 className="text-sm font-medium text-destructive">{t("danger")}</h2>
        <p className="text-xs text-muted-foreground">
          {t.rich("dangerZonePasskeyCleanup", {
            file: () => (
              <code className="text-[11px]">helvety-recovery.json</code>
            ),
          })}
        </p>

        <div className="flex items-start gap-2">
          <Checkbox
            id="cleanup-ack"
            checked={cleanupAck}
            disabled={pending || !canDelete}
            onCheckedChange={(value) => setCleanupAck(value === true)}
          />
          <Label htmlFor="cleanup-ack" className="text-xs leading-snug">
            {t("cleanupAck")}
          </Label>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="account-delete-confirm" className="text-xs">
            {t.rich("typeEmailToConfirm", {
              email: () => (
                <span className="font-medium">{account.email}</span>
              ),
            })}
          </Label>
          <Input
            id="account-delete-confirm"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            disabled={pending || !canDelete}
            autoComplete="off"
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={!canSubmit}
          onClick={() => setDeleteOpen(true)}
        >
          {t("deleteAccount")}
        </Button>

        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={t("deleteAccountTitle")}
          description={t("deleteAccountDescription")}
          confirmLabel={t("deleteAccountPermanently")}
          busy={pending}
          onConfirm={onDeleteAccount}
        />
      </section>
    </div>
  );
}
