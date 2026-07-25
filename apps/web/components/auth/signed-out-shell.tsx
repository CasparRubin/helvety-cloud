import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignedOutShell({
  accountDeleted = false,
}: {
  accountDeleted?: boolean;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {accountDeleted ? "Account deleted" : "Helvety Cloud"}
        </CardTitle>
        <CardDescription>
          {accountDeleted
            ? "Your Helvety account and solo-owned workspaces are gone. Helvety cannot recover vault data."
            : "Passwordless E2EE workspace. Sign in to create a session."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {accountDeleted ? (
          <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              One more step on your devices
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              <li>
                Remove Helvety Cloud passkeys from your password manager or
                device (sign-in and vault-unlock entries if both exist).
              </li>
              <li>
                Securely delete any{" "}
                <code className="text-[11px]">helvety-recovery.json</code> or
                other recovery-key backups.
              </li>
            </ul>
            <p className="mt-2 text-xs">
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
        <p className="text-center text-xs text-muted-foreground">
          <a href="/legal" className="underline underline-offset-4">
            Legal
          </a>
          {" · "}
          Free plan limits are listed in the{" "}
          <a href="/legal/billing" className="underline underline-offset-4">
            Billing terms
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
