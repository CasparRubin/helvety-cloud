"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircleIcon } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PolicyAcceptanceGate } from "@/components/legal/policy-acceptance-gate";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { ApiClientError, getMePolicyAcceptances } from "@/lib/api/v1-client";
import { createClient } from "@/lib/supabase/client";
import type { RecoveryExport } from "@/lib/client-crypto/recovery";
import { hasUserCrypto } from "@/lib/client-crypto/user-keys";

type UnlockGateProps = {
  email: string;
  userId: string;
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

export function UnlockGate({ email, userId }: UnlockGateProps) {
  const {
    recovery,
    setupUserCrypto,
    unlockUserCrypto,
    unlockUserCryptoWithRecoveryFile,
    clearRecovery,
    lock,
  } = useCryptoSession();
  const recoveryFileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [cryptoReadyStep, setCryptoReadyStep] = useState<
    "locked" | "needs_setup"
  >("needs_setup");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [policyStatus, exists] = await Promise.all([
          getMePolicyAcceptances(),
          hasUserCrypto(),
        ]);
        if (cancelled) return;
        const nextCryptoStep = exists ? "locked" : "needs_setup";
        setCryptoReadyStep(nextCryptoStep);
        if (!policyStatus.allCurrentAccepted) {
          setStep("needs_acceptance");
          return;
        }
        setStep(nextCryptoStep);
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
      await setupUserCrypto(userId, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption setup failed");
    } finally {
      setPending(false);
    }
  }

  async function onUnlock() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await unlockUserCrypto(userId);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setStep("needs_setup");
        setError("No encryption keys yet. Set up encryption first.");
      } else {
        setError(err instanceof Error ? err.message : "Unlock failed");
      }
    } finally {
      setPending(false);
    }
  }

  async function onRecoveryFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await unlockUserCryptoWithRecoveryFile(userId, file);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setStep("needs_setup");
        setError("No encryption keys yet. Set up encryption first.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unlock with recovery file failed",
        );
      }
    } finally {
      setPending(false);
      if (recoveryFileInputRef.current) {
        recoveryFileInputRef.current.value = "";
      }
    }
  }

  return (
    <AuthShell
      title="Unlock your data"
      subtitle={
        <>
          Signed in as <span className="text-foreground">{email}</span>.
        </>
      }
      footer={
        <a
          href="https://helvety.com/impressum"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Legal
        </a>
      }
    >
      <Alert>
        <AlertTitle>Helvety cannot unlock this</AlertTitle>
        <AlertDescription>
          Your data is encrypted on your device. Helvety cannot decrypt or
          restore it. If you lose your unlock passkey and offline recovery file,
          your data is gone permanently.
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

      {!recovery && step === "needs_acceptance" ? (
        <PolicyAcceptanceGate
          pending={pending}
          onPendingChange={setPending}
          onError={setError}
          onAccepted={() => {
            setMessage("Policy acceptance recorded.");
            setStep(cryptoReadyStep);
          }}
        />
      ) : null}

      {recovery ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Save your recovery file</p>
          <p className="text-sm text-muted-foreground">
            Download helvety-recovery.json and store it offline. It is not sent
            to Helvety. Use it later if you lose your unlock passkey. Losing
            both means permanent data loss.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() => {
              downloadRecoveryFile(recovery);
              setMessage(
                "Downloaded helvety-recovery.json (device only, never upload).",
              );
            }}
          >
            Download helvety-recovery.json
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={clearRecovery}
          >
            I saved the file offline, continue
          </Button>
        </div>
      ) : null}

      {!recovery ? (
        <div className="flex flex-col gap-2">
          {step === "loading" ? (
            <p className="text-sm text-muted-foreground">
              Checking policies and encryption…
            </p>
          ) : null}

          {step === "needs_setup" ? (
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => void onSetup()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Set up encryption with passkey
            </Button>
          ) : null}

          {step === "locked" ? (
            <>
              <Button
                type="button"
                className="w-full"
                disabled={pending}
                onClick={() => void onUnlock()}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Unlock with passkey
              </Button>
              <input
                ref={recoveryFileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  void onRecoveryFileSelected(event.target.files?.[0]);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => recoveryFileInputRef.current?.click()}
              >
                Unlock with recovery file
              </Button>
            </>
          ) : null}

          {step !== "loading" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          ) : null}
        </div>
      ) : null}
    </AuthShell>
  );
}
