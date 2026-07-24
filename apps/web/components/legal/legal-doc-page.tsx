import Link from "next/link";

import type { LegalDocument } from "@/content/legal";

type LegalDocPageProps = {
  doc: LegalDocument;
};

export function LegalDocPage({ doc }: LegalDocPageProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <Link href="/legal" className="underline underline-offset-4">
              Legal
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            Version: {doc.versionLabel}
          </p>
        </header>

        {doc.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="text-sm leading-relaxed text-foreground/90"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <footer className="border-t pt-6 text-sm text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            Back to Helvety Cloud
          </Link>
        </footer>
      </article>
    </main>
  );
}
