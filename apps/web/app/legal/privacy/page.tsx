import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function PrivacyPage() {
  return <LegalDocPage doc={getLegalDocument("privacy")} />;
}
