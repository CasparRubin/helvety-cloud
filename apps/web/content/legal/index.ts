import type { LegalDocSlug } from "@/lib/legal/policies";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

import { catalog as de } from "./de";
import { catalog as en } from "./en";
import { catalog as fr } from "./fr";
import { catalog as it } from "./it";
import type { LegalDocument } from "./types";

export type { LegalDocument, LegalSection } from "./types";

const LEGAL_BY_LOCALE: Record<AppLocale, Record<LegalDocSlug, LegalDocument>> = {
  en,
  de,
  fr,
  it,
};

export function getLegalDocument(
  slug: LegalDocSlug,
  locale: string = routing.defaultLocale,
): LegalDocument {
  const catalog =
    LEGAL_BY_LOCALE[locale as AppLocale] ?? LEGAL_BY_LOCALE[routing.defaultLocale];
  return catalog[slug] ?? LEGAL_BY_LOCALE.en[slug];
}
