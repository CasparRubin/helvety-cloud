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
      <CardContent>
        <Button
          render={<a href="/login" />}
          nativeButton={false}
          className="w-full"
        >
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}
