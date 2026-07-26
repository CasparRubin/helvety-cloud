"use client";

import { useTranslations } from "next-intl";

import { LegalChrome } from "@/components/legal/legal-chrome";
import { Link } from "@/i18n/navigation";
import type { LegalDocument } from "@/content/legal";

type LegalDocPageProps = {
  doc: LegalDocument;
};

export function LegalDocPage({ doc }: LegalDocPageProps) {
  const t = useTranslations("legalChrome");

  return (
    <LegalChrome>
      <header className="flex flex-col gap-4 pr-16">
        <p className="text-sm text-muted-foreground">
          <Link href="/legal" className="underline underline-offset-4">
            {t("title")}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t("version", { version: doc.versionLabel })}
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
    </LegalChrome>
  );
}
