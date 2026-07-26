"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PolicyAcceptanceGate } from "@/components/legal/policy-acceptance-gate";
import { useCryptoSession } from "@/components/unlock/crypto-session-provider";
import { Link, useRouter } from "@/i18n/navigation";
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
  const t = useTranslations("unlock");
  const tShell = useTranslations("shell");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { recovery, setupUserCrypto, unlockUserCrypto, clearRecovery, lock } =
    useCryptoSession();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [cryptoReadyStep, setCryptoReadyStep] = useState<"locked" | "needs_setup">(
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
          err instanceof Error ? err.message : t("checkFailed"),
        );
        setStep("needs_acceptance");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

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
    router.replace("/");
  }

  async function onSetup() {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      await setupUserCrypto(userId, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("setupFailed"));
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
        setError(t("noKeysYet"));
      } else {
        setError(err instanceof Error ? err.message : t("unlockFailed"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title={t("titleUnlock")}
      subtitle={t("signedInAs", { email })}
      footer={
        <Link href="/legal" className="underline underline-offset-4">
          {tCommon("legal")}
        </Link>
      }
    >
      <Alert>
        <AlertTitle>{t("cannotUnlockTitle")}</AlertTitle>
        <AlertDescription>{t("cannotUnlockBody")}</AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{t("actionFailed")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertTitle>{t("status")}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {!recovery && step === "needs_acceptance" ? (
        <PolicyAcceptanceGate
          pending={pending}
          onPendingChange={setPending}
          onError={setError}
          onAccepted={() => {
            setMessage(t("policyAcceptanceRecorded"));
            setStep(cryptoReadyStep);
          }}
        />
      ) : null}

      {recovery ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">{t("recoveryMaterialTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("recoveryMaterialIntro")}
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("recoveryKeyLabel")}
            </p>
            <div className="relative rounded-md bg-muted">
              <code className="block break-all p-2 pr-10 text-xs">
                {recovery.recoveryKeyExported}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1.5 right-1.5"
                disabled={pending}
                aria-label={t("copyRecoveryKey")}
                onClick={() => {
                  void navigator.clipboard.writeText(
                    recovery.recoveryKeyExported,
                  );
                  setMessage(t("recoveryKeyCopied"));
                }}
              >
                <CopyIcon />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("recoveryWrapLabel")}
            </p>
            <div className="relative rounded-md bg-muted">
              <code className="block max-h-32 overflow-auto break-all p-2 pr-10 text-xs">
                {JSON.stringify(recovery.recoveryWrappedUserKey)}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1.5 right-1.5"
                disabled={pending}
                aria-label={t("copyRecoveryWrap")}
                onClick={() => {
                  void navigator.clipboard.writeText(
                    JSON.stringify(recovery.recoveryWrappedUserKey),
                  );
                  setMessage(t("recoveryWrapCopied"));
                }}
              >
                <CopyIcon />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() => {
              downloadRecoveryFile(recovery);
              setMessage(t("recoveryDownloaded"));
            }}
          >
            {t("downloadRecoveryFile")}
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={clearRecovery}
          >
            {t("recoverySavedContinue")}
          </Button>
        </div>
      ) : null}

      {!recovery ? (
        <div className="flex flex-col gap-2">
          {step === "loading" ? (
            <p className="text-sm text-muted-foreground">{t("checking")}</p>
          ) : null}

          {step === "needs_setup" ? (
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => void onSetup()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t("setupWithPasskey")}
            </Button>
          ) : null}

          {step === "locked" ? (
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => void onUnlock()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t("unlockWithPasskey")}
            </Button>
          ) : null}

          {step !== "loading" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void signOut()}
            >
              {tShell("signOut")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </AuthShell>
  );
}
