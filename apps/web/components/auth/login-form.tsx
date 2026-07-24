"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";

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
    return `Auth error (${error.code})`;
  }
  if (error.status) {
    return `Auth error (HTTP ${error.status})`;
  }
  return "Auth request failed. Check Supabase Auth logs and SMTP.";
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

    router.replace("/");
    router.refresh();
  }

  async function signInWithPasskey() {
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: passkeyError } = await supabase.auth.signInWithPasskey();

    setPending(false);

    if (passkeyError) {
      setError(formatAuthError(passkeyError));
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Passwordless email code or passkey. No passwords.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Could not sign in</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {step === "email" ? (
          <form onSubmit={sendOtp}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
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
                <FieldDescription>
                  We email a one-time code. Helvety cannot recover vault content
                  later — this only creates a session.
                </FieldDescription>
              </Field>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Send code
              </Button>
            </FieldGroup>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="otp">One-time code</FieldLabel>
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
                <FieldDescription>
                  Enter the 6-digit code sent to {email}.
                </FieldDescription>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Button
                type="submit"
                disabled={pending || code.length !== 6}
                className="w-full"
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Verify and continue
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
                Use a different email
              </Button>
            </FieldGroup>
          </form>
        )}

        <FieldSeparator>or</FieldSeparator>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() => void signInWithPasskey()}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Sign in with passkey
        </Button>
      </CardContent>
    </Card>
  );
}
