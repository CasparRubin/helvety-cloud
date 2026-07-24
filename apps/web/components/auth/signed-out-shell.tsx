import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignedOutShell() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Helvety Cloud</CardTitle>
        <CardDescription>
          Passwordless E2EE workspace. Sign in to create a session.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          render={<a href="/login" />}
          nativeButton={false}
          className="w-full"
        >
          Sign in
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
