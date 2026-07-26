import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export function SignedOutShell({
  accountDeleted = false,
}: {
  accountDeleted?: boolean;
}) {
  return (
    <AuthShell
      title={accountDeleted ? "Account deleted" : "Helvety Cloud"}
      subtitle={
        accountDeleted
          ? "Your Helvety account and solo-owned workspaces are gone. Helvety cannot recover vault data."
          : "Passwordless E2EE workspace. Sign in to create a session."
      }
      footer={
        <>
          <a href="/legal" className="underline underline-offset-4">
            Legal
          </a>
          {" · "}
          Free plan limits are listed in the{" "}
          <a href="/legal/billing" className="underline underline-offset-4">
            Billing terms
          </a>
          .
        </>
      }
    >
      {accountDeleted ? (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            One more step on your devices
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>
              Remove your Helvety Cloud vault unlock passkey from your password
              manager or device.
            </li>
            <li>
              Securely delete any{" "}
              <code className="text-[11px]">helvety-recovery.json</code> or other
              recovery-key backups.
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Helvety cannot inspect or remove passkeys stored on your device.
            Stale credentials cannot restore deleted server data.
          </p>
        </div>
      ) : null}
      <Button
        render={<a href="/login" />}
        nativeButton={false}
        className="w-full"
      >
        {accountDeleted ? "Back to sign in" : "Sign in"}
      </Button>
    </AuthShell>
  );
}
