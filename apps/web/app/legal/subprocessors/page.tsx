import { LegalDocPage } from "@/components/legal/legal-doc-page";
import { getLegalDocument } from "@/content/legal";

export default function SubprocessorsPage() {
  return <LegalDocPage doc={getLegalDocument("subprocessors")} />;
}
