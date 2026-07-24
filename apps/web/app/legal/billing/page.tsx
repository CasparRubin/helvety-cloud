import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function BillingPage() {
  return <LegalDocPage doc={getLegalDocument("billing")} />;
}
