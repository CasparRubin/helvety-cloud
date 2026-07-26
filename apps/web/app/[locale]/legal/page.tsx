import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalChrome } from "@/components/legal/legal-chrome";
import { Link } from "@/i18n/navigation";
import { LEGAL_DOC_SLUGS } from "@/lib/legal/policies";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legalChrome" });
  return {
    title: `${t("title")} · Helvety Cloud`,
    description: t("subtitle"),
  };
}

export default async function LegalIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legalChrome");

  return (
    <LegalChrome title={t("title")} subtitle={t("indexIntro")}>
      <ul className="flex flex-col gap-3">
        {LEGAL_DOC_SLUGS.map((slug) => (
          <li key={slug}>
            <Link
              href={`/legal/${slug}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              {t(slug)}
            </Link>
          </li>
        ))}
      </ul>
    </LegalChrome>
  );
}
