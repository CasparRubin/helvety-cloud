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
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="justify-items-center text-center">
          <Image
            src="/icon.svg"
            width={40}
            height={40}
            alt=""
            className="size-10 rounded-md"
            priority
          />
          <CardTitle>{title}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {children}
          {footer ? (
            <p className="text-center text-xs text-muted-foreground">{footer}</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
