import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function E2eePage() {
  return <LegalDocPage doc={getLegalDocument("e2ee")} />;
}
