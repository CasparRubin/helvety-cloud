import Image from "next/image";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="auth-shell relative flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="justify-items-center text-center">
          <Image
            src="/icon.svg"
            width={48}
            height={48}
            alt=""
            className="size-12 rounded-md"
            priority
          />
          <CardTitle>Helvety Cloud</CardTitle>
          <CardDescription>End-to-end encrypted workspace</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-center">
            <h2 className="text-base font-medium text-foreground">{title}</h2>
            {subtitle ? (
              <p className="text-balance text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
          {footer ? (
            <p className="text-center text-xs text-muted-foreground">{footer}</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
