"use client";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import { useAccountSettings } from "@/components/app/account-settings/provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";

export function AccountGeneralSettings() {
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
        <Spinner className="size-4" /> Loading account…
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
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Sign-in</h2>
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{account.email}</span>.
          Helvety Cloud uses email OTP for account access, so there is no
          account password to manage here.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">What belongs here</h2>
        <p className="text-sm text-muted-foreground">
          Account settings cover sign-in and account deletion. Workspace plan,
          members, task categorizations, and project settings stay inside each
          workspace.
        </p>
      </section>
    </div>
  );
}

export function AccountDangerSettings() {
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
    canSubmit,
    onDeleteAccount,
  } = useAccountSettings();
  const { workspaces } = useCryptoSession();

  const workspaceName = (workspaceId: string) =>
    workspaces.find((w) => w.id === workspaceId)?.name ?? "Workspace";

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
        <Spinner className="size-4" /> Loading account…
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
        <h2 className="text-sm font-medium">What deletion does</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Your auth account, profile, encryption metadata, policy
            acceptances, and sessions are permanently removed.
          </li>
          <li>
            Solo workspaces where you are the only member (including Personal)
            and everything inside them (projects, tasks, notes, contacts, links,
            ciphertext, and wrapped keys) are permanently deleted. Helvety cannot
            decrypt or recover your data.
          </li>
          <li>
            Pro subscriptions on those deleted solo workspaces are cancelled.
          </li>
          <li>
            Shared workspaces remain for others. You leave them: your membership
            and wrapped keys are removed, so you lose access while other members
            keep the workspace.
          </li>
          <li>Pending invitations tied to you are removed or cancelled.</li>
        </ul>
      </section>

      {account.soloOwnedWorkspaces.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Will be deleted</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {account.soloOwnedWorkspaces.map((ws) => (
              <li
                key={ws.id}
                className="rounded-md border border-border px-2 py-1.5"
              >
                {workspaceName(ws.id)}
                {ws.kind === "personal" ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (Personal)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {account.leavingWorkspaces.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">You will leave</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {account.leavingWorkspaces.map((ws) => (
              <li
                key={ws.id}
                className="rounded-md border border-border px-2 py-1.5"
              >
                {workspaceName(ws.id)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          After deletion, remove your Helvety Cloud unlock passkey from your
          device or password manager (Apple Passwords, Google Password Manager,
          Windows Hello, etc.). The site cannot erase it from your device. Also
          securely delete any downloaded{" "}
          <code className="text-[11px]">helvety-recovery.json</code> or other
          recovery-key backups. Stale passkeys and recovery files cannot restore
          deleted server data.
        </p>

        <div className="flex items-start gap-2">
          <Checkbox
            id="cleanup-ack"
            checked={cleanupAck}
            disabled={pending}
            onCheckedChange={(value) => setCleanupAck(value === true)}
          />
          <Label htmlFor="cleanup-ack" className="text-xs leading-snug">
            I understand deletion is permanent, and I will remove my Helvety
            Cloud unlock passkey from my devices/password managers and destroy
            any recovery backups after deletion.
          </Label>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="account-delete-confirm" className="text-xs">
            Type <span className="font-medium">{account.email}</span> to confirm
          </Label>
          <Input
            id="account-delete-confirm"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            disabled={pending}
            autoComplete="off"
          />
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={!canSubmit}
          onClick={() => setDeleteOpen(true)}
        >
          Delete account
        </Button>

        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete your Helvety Cloud account?"
          description="This permanently deletes your account and solo workspaces. Shared workspaces stay for other members. Helvety cannot recover your data. This cannot be undone."
          confirmLabel="Delete account permanently"
          busy={pending}
          onConfirm={onDeleteAccount}
        />
      </section>
    </div>
  );
}
