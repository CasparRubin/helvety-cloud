import type { LegalDocSlug } from "@/lib/legal/policies";

import { aupDoc } from "./aup";
import { billingDoc } from "./billing";
import { e2eeDoc } from "./e2ee";
import { impressumDoc } from "./impressum";
import { privacyDoc } from "./privacy";
import { subprocessorsDoc } from "./subprocessors";
import { termsDoc } from "./terms";
import type { LegalDocument } from "./types";

export type { LegalDocument, LegalSection } from "./types";

export const LEGAL_DOCUMENTS: Record<LegalDocSlug, LegalDocument> = {
  impressum: impressumDoc,
  terms: termsDoc,
  privacy: privacyDoc,
  aup: aupDoc,
  e2ee: e2eeDoc,
  billing: billingDoc,
  subprocessors: subprocessorsDoc,
};

export function getLegalDocument(slug: LegalDocSlug): LegalDocument {
  return LEGAL_DOCUMENTS[slug];
}
