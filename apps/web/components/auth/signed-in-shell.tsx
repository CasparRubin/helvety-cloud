"use client";

import { useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ApiClientError, getMeCrypto } from "@/lib/api/v1-client";
import { createClient } from "@/lib/supabase/client";
import { createPrfUnlock, assertPrfUnlock } from "@/lib/vault/prf";
import {
  createRecoveryExport,
  type RecoveryExport,
} from "@/lib/vault/recovery";
import {
  hasUserCrypto,
  setupUserKeys,
  unlockUserKeys,
  type UnlockedVault,
} from "@/lib/vault/user-keys";
import {
  loadProofIds,
  reloadAndDecryptIssue,
  runEncryptedIssueProof,
  storeProofIds,
  type ProofRoundTripResult,
} from "@/lib/vault/workspace-issue";

type SignedInShellProps = {
  email: string;
  userId: string;
};

type Step =
  | "loading"
  | "locked"
  | "needs_setup"
  | "show_recovery"
  | "unlocked"
  | "done";

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

export function SignedInShell({ email, userId }: SignedInShellProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("loading");
  const [vault, setVault] = useState<UnlockedVault | null>(null);
  const [recovery, setRecovery] = useState<RecoveryExport | null>(null);
  const [proof, setProof] = useState<ProofRoundTripResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const exists = await hasUserCrypto();
        if (cancelled) return;
        setStep(exists ? "locked" : "needs_setup");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to check vault");
        setStep("needs_setup");
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
    setVault(null);
    setRecovery(null);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    setPending(false);

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function setupVault() {
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const prf = await createPrfUnlock(userId, email);
      const unlocked = await setupUserKeys(userId, prf.unlockKey, prf.prfSalt);
      const recoveryExport = await createRecoveryExport(
        userId,
        unlocked.userSymmetricKey,
        unlocked.keyVersion,
      );
      setVault(unlocked);
      setRecovery(recoveryExport);
      setStep("show_recovery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vault setup failed");
    } finally {
      setPending(false);
    }
  }

  async function unlockVault() {
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const row = await getMeCrypto();
      const prf = await assertPrfUnlock(userId, row.prfSalt);
      const unlocked = await unlockUserKeys(userId, prf.unlockKey, row);
      setVault(unlocked);
      setStep("unlocked");

      const ids = loadProofIds(userId);
      if (ids) {
        const result = await reloadAndDecryptIssue(unlocked, ids);
        setProof(result);
        setStep("done");
        setMessage("Reloaded and decrypted existing proof issue from ciphertext.");
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
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
    setRecovery(null);
    setStep("unlocked");
  }

  async function runProof() {
    if (!vault) return;
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const result = await runEncryptedIssueProof(vault, {
        title: "P5 E2EE proof",
        body: "Helvety only stores ciphertext. This plaintext never leaves the device unencrypted.",
      });
      storeProofIds(userId, result.ids);
      setProof(result);
      setStep("done");
      setMessage("Round-trip OK: encrypt → PUT /api/v1 → GET → decrypt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proof failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Helvety Cloud</CardTitle>
        <CardDescription>
          Signed in as <span className="text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <AlertTitle>Zero knowledge — no recovery by Helvety</AlertTitle>
          <AlertDescription>
            Helvety cannot decrypt or restore vault content. If you lose your
            unlock methods (PRF passkey and offline recovery key + wrap), your
            data is gone permanently. Auth session ≠ vault unlock.
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

        {step === "show_recovery" && recovery ? (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <p className="text-sm font-medium">
              Recovery material (shown once)
            </p>
            <p className="text-sm text-muted-foreground">
              Store both the recovery key and the recovery wrap offline. Neither
              is logged or sent to Helvety. The key alone is not enough — you
              need the wrap too. Losing these with your PRF passkey means
              permanent data loss.
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

        {proof ? (
          <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
            <p className="font-medium">Decrypted on device</p>
            <p>
              <span className="text-muted-foreground">Title:</span>{" "}
              {proof.decrypted.title}
            </p>
            <p>
              <span className="text-muted-foreground">Body:</span>{" "}
              {proof.decrypted.body}
            </p>
            <Separator />
            <p className="font-medium">Ciphertext from GET /api/v1 (server view)</p>
            <code className="break-all rounded bg-muted p-2 text-xs">
              {JSON.stringify(proof.ciphertextFromApi)}
            </code>
            <p className="text-xs text-muted-foreground">
              IDs: {proof.ids.workspaceId} / {proof.ids.issueId}
            </p>
          </div>
        ) : null}

        <Separator />

        <div className="flex flex-col gap-2">
          {step === "loading" ? (
            <p className="text-sm text-muted-foreground">Checking vault…</p>
          ) : null}

          {step === "needs_setup" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => void setupVault()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Set up vault (PRF)
            </Button>
          ) : null}

          {step === "locked" ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => void unlockVault()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Unlock vault (PRF)
            </Button>
          ) : null}

          {step === "unlocked" || step === "done" ? (
            <Button
              type="button"
              disabled={pending || !vault}
              onClick={() => void runProof()}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {step === "done" ? "Run proof again" : "Encrypt issue → API → decrypt"}
            </Button>
          ) : null}

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
        </div>
      </CardContent>
    </Card>
  );
}
