import type { LegalDocument } from "../types";

export const impressumDoc: LegalDocument = {
  slug: "impressum",
  title: "Impressum",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Dienstanbieter",
      paragraphs: [
        "Anbieter des Dienstes Helvety Cloud unter helvety.cloud:",
        "Helvety by Rubin",
        "Inhaber: Caspar Camille Rubin",
        "Rechtsform: Schweizer Einzelunternehmen",
        "Sitzadresse: Holeestrasse 116, 4054 Basel, Schweiz",
        "UID: CHE-356.266.592",
        "Handelsregister: CH-270.1.021.985-7 (Basel-Stadt)",
        "Kontakt: contact@helvety.com",
      ],
    },
    {
      heading: "Verantwortung für Inhalte",
      paragraphs: [
        "Konto- und Dienstmetadaten werden wie in der Datenschutzerklärung beschrieben verarbeitet. Ihre Daten in Helvety Cloud sind Ende-zu-Ende-verschlüsselt: Helvety kann Klartext weder lesen, entschlüsseln noch wiederherstellen. Dieses Impressum begründet weder eine Pflicht noch eine Fähigkeit, verschlüsselte Nutzerinhalte wiederherzustellen.",
      ],
    },
  ],
};
