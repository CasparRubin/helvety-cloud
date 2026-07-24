import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function AupPage() {
  return <LegalDocPage doc={getLegalDocument("aup")} />;
}
