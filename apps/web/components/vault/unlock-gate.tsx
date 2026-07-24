"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PolicyAcceptanceGate } from "@/components/legal/policy-acceptance-gate";
import {
  hasUserCrypto,
  useVaultSession,
} from "@/components/vault/vault-session-provider";
import { ApiClientError, getMePolicyAcceptances } from "@/lib/api/v1-client";
import { createClient } from "@/lib/supabase/client";
import type { RecoveryExport } from "@/lib/vault/recovery";

type UnlockGateProps = {
  email: string;
  userId: string;
  onUnlocked: () => void;
};

type Step = "loading" | "needs_acceptance" | "locked" | "needs_setup";

function downloadRecoveryFile(recovery: RecoveryExport): void {
  const payload = {
    recoveryKey: recovery.recoveryKeyExported,
    recoveryWrappedUserKey: recovery.recoveryWrappedUserKey,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "helvety-recovery.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function UnlockGate({ email, userId, onUnlocked }: UnlockGateProps) {
  const { recovery, setupVault, unlockVault, clearRecovery, lock } =
    useVaultSession();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [vaultReadyStep, setVaultReadyStep] = useState<"locked" | "needs_setup">(
    "needs_setup",
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [policyStatus, exists] = await Promise.all([
          getMePolicyAcceptances(),
          hasUserCrypto(),
        ]);
        if (cancelled) return;
        const nextVaultStep = exists ? "locked" : "needs_setup";
        setVaultReadyStep(nextVaultStep);
        if (!policyStatus.allCurrentAccepted) {
          setStep("needs_acceptance");
          return;
        }
        setStep(nextVaultStep);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to check account state",
        );
        setStep("needs_acceptance");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function registerPasskey() {
    setError(null);
    setMessage(null);
    setPending(true);
    const supabase = createClient();
    const { error: registerError } = await supabase.auth.registerPasskey();
    setPending(false);
    if (registerError) {
      setError(registerError.message);
      return;
    }
    setMessage("Auth passkey registered. You can use it to sign in next time.");
  }

  async function signOut() {
    setError(null);
    setPending(true);
    lock();
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    setPending(false);
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    window.location.href = "/";
  }

  async function onSetup() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await setupVault(userId, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vault setup failed");
    } finally {
      setPending(false);
    }
  }

  async function onUnlock() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await unlockVault(userId);
      onUnlocked();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setVaultReadyStep("needs_setup");
        setStep("needs_setup");
        setError("No vault keys yet — set up the vault first.");
      } else {
        setError(err instanceof Error ? err.message : "Vault unlock failed");
      }
    } finally {
      setPending(false);
    }
  }

  function acknowledgeRecovery() {
    clearRecovery();
    onUnlocked();
  }

  const showRecovery = Boolean(recovery);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Unlock Helvety</CardTitle>
        <CardDescription>
          Signed in as <span className="text-foreground">{email}</span>. Auth
          session does not decrypt your vault.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <AlertTitle>Zero knowledge — no recovery by Helvety</AlertTitle>
          <AlertDescription>
            Helvety cannot decrypt or restore vault content. If you lose your
            unlock methods (PRF passkey and offline recovery key + wrap), your
            data is gone permanently.
          </AlertDescription>
        </Alert>

        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {message ? (
          <Alert>
            <AlertTitle>Status</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {!showRecovery && step === "needs_acceptance" ? (
          <PolicyAcceptanceGate
            pending={pending}
            onPendingChange={setPending}
            onError={setError}
            onAccepted={() => {
              setMessage("Policy acceptance recorded.");
              setStep(vaultReadyStep);
            }}
          />
        ) : null}

        {showRecovery && recovery ? (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <p className="text-sm font-medium">Recovery material (shown once)</p>
            <p className="text-sm text-muted-foreground">
              Store both the recovery key and the recovery wrap offline. Neither
              is logged or sent to Helvety. Losing these with your PRF passkey
              means permanent data loss.
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Recovery key
            </p>
            <code className="break-all rounded bg-muted p-2 text-xs">
              {recovery.recoveryKeyExported}
            </code>
            <p className="text-xs font-medium text-muted-foreground">
              Recovery wrap
            </p>
            <code className="max-h-32 overflow-auto break-all rounded bg-muted p-2 text-xs">
              {JSON.stringify(recovery.recoveryWrappedUserKey)}
            </code>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                void navigator.clipboard.writeText(
                  recovery.recoveryKeyExported,
                );
                setMessage("Recovery key copied to clipboard (device only).");
              }}
            >
              Copy recovery key
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                downloadRecoveryFile(recovery);
                setMessage(
                  "Downloaded helvety-recovery.json (device only — never upload).",
                );
              }}
            >
              Download helvety-recovery.json
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => acknowledgeRecovery()}
            >
              I saved both offline — continue
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          {!showRecovery && step === "loading" ? (
            <p className="text-sm text-muted-foreground">
              Checking policies and vault…
            </p>
          ) : null}

          {!showRecovery && step === "needs_setup" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => void onSetup()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Set up vault (PRF)
            </Button>
          ) : null}

          {!showRecovery && step === "locked" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => void onUnlock()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Unlock vault (PRF)
            </Button>
          ) : null}

          {!showRecovery ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void registerPasskey()}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Register auth passkey
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <a href="/legal" className="underline underline-offset-4">
                  Legal
                </a>
              </p>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
