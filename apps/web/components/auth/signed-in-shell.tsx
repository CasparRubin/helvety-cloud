"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

type SignedInShellProps = {
  email: string;
};

export function SignedInShell({ email }: SignedInShellProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

    setMessage("Passkey registered. You can use it to sign in next time.");
  }

  async function signOut() {
    setError(null);
    setPending(true);

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

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Helvety Cloud</CardTitle>
        <CardDescription>
          Signed in. Session only — vault unlock comes later (P3+).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{email}</span>
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Action failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {message ? (
          <Alert>
            <AlertTitle>Passkey ready</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        <Separator />

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => void registerPasskey()}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Register passkey
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
