"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { HeaderControls } from "@/components/app/header-controls";
import { Link } from "@/i18n/navigation";

export function LegalChrome({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const t = useTranslations("legalChrome");

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="absolute top-4 right-4 z-20">
        <HeaderControls />
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        {title ? (
          <header className="flex flex-col gap-4 pr-16">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </header>
        ) : null}
        {children}
        <footer className="border-t pt-6 text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            {t("backToApp")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
