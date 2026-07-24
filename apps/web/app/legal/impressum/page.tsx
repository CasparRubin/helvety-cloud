import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function ImpressumPage() {
  return <LegalDocPage doc={getLegalDocument("impressum")} />;
}
