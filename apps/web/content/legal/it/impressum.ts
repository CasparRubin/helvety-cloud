import type { LegalDocument } from "../types";

export const impressumDoc: LegalDocument = {
  slug: "impressum",
  title: "Impressum",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Fornitore del servizio",
      paragraphs: [
        "Fornitore del servizio Helvety Cloud su helvety.cloud:",
        "Helvety by Rubin",
        "Titolare: Caspar Camille Rubin",
        "Forma giuridica: Einzelunternehmen svizzero (ditta individuale)",
        "Indirizzo registrato: Holeestrasse 116, 4054 Basel, Svizzera",
        "UID: CHE-356.266.592",
        "Registro di commercio: CH-270.1.021.985-7 (Basel-Stadt)",
        "Contatto: contact@helvety.com",
      ],
    },
    {
      heading: "Responsabilità dei contenuti",
      paragraphs: [
        "I metadati di account e di servizio sono trattati come descritto nell'Informativa sulla privacy. I tuoi dati in Helvety Cloud sono crittografati end-to-end: Helvety non può leggere, decrittare o ripristinare il testo in chiaro. Questo Impressum non crea alcun obbligo né capacità di recuperare contenuti utente crittografati.",
      ],
    },
  ],
};
