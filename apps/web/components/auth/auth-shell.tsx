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
        <CardHeader className="justify-items-center border-b border-border/50 text-center">
          <Image
            src="/icon.svg"
            width={48}
            height={48}
            alt=""
            className="size-12 rounded-md"
            priority
          />
          <CardTitle>Helvety Cloud</CardTitle>
          <CardDescription className="flex flex-col gap-0.5">
            <span>End-to-end encrypted workspace</span>
            <span className="text-xs text-muted-foreground/70">
              Engineered, designed & made in{" "}
              <span className="text-[#DA291C]">Switzerland</span>
            </span>
          </CardDescription>
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
          <p className="text-center text-xs text-muted-foreground/70">
            Developed by{" "}
            <a
              href="https://helvety.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              Helvety
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
