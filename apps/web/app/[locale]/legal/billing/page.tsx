import { setRequestLocale } from "next-intl/server";

import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BillingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDocPage doc={getLegalDocument("billing", locale)} />;
}
