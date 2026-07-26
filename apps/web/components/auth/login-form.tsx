"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { AlertCircleIcon } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function formatAuthError(error: {
    message?: string;
    code?: string;
    status?: number;
  }): string {
    const message = error.message?.trim();
    if (message && message !== "{}") {
      return message;
    }
    if (error.code) {
      return t("errorWithCode", { code: error.code });
    }
    if (error.status) {
      return t("errorWithStatus", { status: error.status });
    }
    return t("requestFailed");
  }

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });

    setPending(false);

    if (otpError) {
      setError(formatAuthError(otpError));
      return;
    }

    setStep("code");
    setCode("");
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    setPending(false);

    if (verifyError) {
      setError(formatAuthError(verifyError));
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <AuthShell
      title={t("signInTitle")}
      subtitle={
        step === "email"
          ? t("signInSubtitle")
          : t("verifySubtitle", { email })
      }
      footer={
        <Link href="/legal" className="underline underline-offset-4">
          {tCommon("legal")}
        </Link>
      }
    >
      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{t("couldNotSignIn")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === "email" ? (
        <form onSubmit={sendOtp}>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={pending}
                aria-invalid={error ? true : undefined}
              />
            </Field>
            <Button
              type="submit"
              disabled={pending || !isValidEmail(email)}
              className="w-full"
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t("sendCode")}
            </Button>
          </FieldGroup>
        </form>
      ) : (
        <form onSubmit={verifyOtp}>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="otp">{t("codeLabel")}</FieldLabel>
              <InputOTP
                id="otp"
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={pending}
                containerClassName="justify-center"
                aria-invalid={error ? true : undefined}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </Field>
            <Button
              type="submit"
              disabled={pending || code.length !== 6}
              className="w-full"
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {t("verifyContinue")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="w-full"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              {t("useDifferentEmail")}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthShell>
  );
}
