import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function TermsPage() {
  return <LegalDocPage doc={getLegalDocument("terms")} />;
}
