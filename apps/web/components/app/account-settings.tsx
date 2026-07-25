"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GetMeAccountResponse } from "@helvety-cloud/api-contract";

import { ConfirmDeleteDialog } from "@/components/app/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useVaultSession } from "@/components/vault/vault-session-provider";
import { deleteAccount, getMeAccount } from "@/lib/api/v1-client";
import { createClient } from "@/lib/supabase/client";
import { clearStoredPrfCredentialId } from "@/lib/vault/prf";

export function AccountSettings() {
  const { lock } = useVaultSession();
  const [account, setAccount] = useState<GetMeAccountResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [cleanupAck, setCleanupAck] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getMeAccount();
        if (!cancelled) setAccount(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load account",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onDeleteAccount() {
    if (!account) return;
    setPending(true);
    setError(null);
    try {
      await deleteAccount();
      clearStoredPrfCredentialId(account.userId);
      lock();
      await createClient().auth.signOut();
      window.location.href = "/?account-deleted=1";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed");
      setPending(false);
      throw err;
    }
  }

  if (error && !account) {
    return (
      <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto w-full max-w-xl p-4 sm:p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Loading account…
        </p>
      </div>
    );
  }

  const canDelete = account.blockingWorkspaces.length === 0;
  const canSubmit =
    canDelete && confirmEmail === account.email && cleanupAck && !pending;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{account.email}</span>.
          Auth is email OTP and optional sign-in passkeys — there is no account
          password. Billing is per workspace (owner manages Plan in workspace
          settings).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">What deletion does</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Your auth account, profile, vault crypto metadata, policy
            acceptances, sessions, and server-side sign-in passkey registrations
            are permanently removed.
          </li>
          <li>
            Solo workspaces you own (including Personal) and everything inside
            them — projects, tasks, notes, contacts, links, ciphertext, and
            wrapped keys — are permanently deleted. Helvety cannot decrypt or
            recover vault data.
          </li>
          <li>Pro subscriptions on those deleted solo workspaces are cancelled.</li>
          <li>
            Shared workspaces you do not solely own remain. You leave them: your
            membership and wrapped keys are removed, so you lose access while
            other members keep the workspace.
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
                {ws.name}
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
                className="flex items-center justify-between rounded-md border border-border px-2 py-1.5"
              >
                <span>{ws.name}</span>
                <span className="text-xs text-muted-foreground">{ws.role}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!canDelete ? (
        <section className="flex flex-col gap-2 rounded-lg border border-amber-500/40 p-4">
          <h2 className="text-sm font-medium">Cannot delete yet</h2>
          <p className="text-xs text-muted-foreground">
            You still own shared workspaces with other members. Delete those
            workspaces from settings before deleting your account. Helvety will
            not delete shared workspaces for other members.
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {account.blockingWorkspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/app/w/${ws.id}/settings`}
                  className="underline underline-offset-4"
                >
                  {ws.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground">
          After deletion, remove Helvety Cloud passkeys from your device or
          password manager (Apple Passwords, Google Password Manager, Windows
          Hello, etc.). There are usually two kinds: a{" "}
          <span className="font-medium text-foreground">sign-in</span> passkey
          and a{" "}
          <span className="font-medium text-foreground">vault unlock</span>{" "}
          passkey. The site cannot erase them from your device. Also securely
          delete any downloaded{" "}
          <code className="text-[11px]">helvety-recovery.json</code> or other
          recovery-key backups. Stale passkeys and recovery files cannot restore
          deleted server data.
        </p>

        <div className="flex items-start gap-2">
          <Checkbox
            id="cleanup-ack"
            checked={cleanupAck}
            disabled={pending || !canDelete}
            onCheckedChange={(value) => setCleanupAck(value === true)}
          />
          <Label htmlFor="cleanup-ack" className="text-xs leading-snug">
            I understand deletion is permanent, and I will remove Helvety Cloud
            passkeys from my devices/password managers and destroy any recovery
            backups after deletion.
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
          Delete account
        </Button>

        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete your Helvety account?"
          description="This permanently deletes your account and solo-owned workspaces. Shared workspaces you leave stay for other members. Helvety cannot recover vault data. This cannot be undone."
          confirmLabel="Delete account permanently"
          busy={pending}
          onConfirm={onDeleteAccount}
        />
      </section>
    </div>
  );
}
