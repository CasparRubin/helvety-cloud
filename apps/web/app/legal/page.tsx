import Link from "next/link";
import type { Metadata } from "next";

import { LEGAL_DOC_META, LEGAL_DOC_SLUGS } from "@/lib/legal/policies";

export const metadata: Metadata = {
  title: "Legal — Helvety Cloud",
  description: "Legal documents for Helvety Cloud (helvety.cloud)",
};

export default function LegalIndexPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Legal</h1>
          <p className="text-sm text-muted-foreground">
            Product legal pack for Helvety Cloud, provided by Helvety by Rubin
            (Basel). You must accept the Terms, Privacy Policy, AUP, and E2EE
            notice before vault setup.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {LEGAL_DOC_SLUGS.map((slug) => {
            const meta = LEGAL_DOC_META[slug];
            return (
              <li key={slug}>
                <Link
                  href={meta.href}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {meta.title}
                </Link>
              </li>
            );
          })}
        </ul>

        <footer className="border-t pt-6 text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            Back to Helvety Cloud
          </Link>
        </footer>
      </div>
    </main>
  );
}
