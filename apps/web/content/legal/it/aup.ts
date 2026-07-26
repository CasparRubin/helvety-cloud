import type { LegalDocument } from "../types";

export const aupDoc: LegalDocument = {
  slug: "aup",
  title: "Politica di uso accettabile",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Scopo",
      paragraphs: [
        "La presente Politica di uso accettabile («AUP») stabilisce le regole per l'utilizzo di Helvety Cloud. Fa parte dei Termini di servizio.",
      ],
    },
    {
      heading: "Usi vietati",
      paragraphs: [
        "Non devi usare Helvety Cloud per attività illegali, inclusa la memorizzazione o la distribuzione di contenuti illegali, materiale di abuso sessuale su minori, contenuti di terrorismo ove vietati, molestie, frode, distribuzione di malware, accesso non autorizzato a sistemi, o violazione dei diritti di proprietà intellettuale o della privacy di terzi.",
        "Non devi tentare di interrompere il Servizio, sovraccaricare l'infrastruttura oltre l'uso ordinario, fare scraping o raccogliere account senza autorizzazione, sondare sistemi salvo nell'ambito di una divulgazione responsabile coordinata con Helvety, o aggirare limiti tecnici o di account.",
        "Non devi rappresentare falsamente un'affiliazione con Helvety né usare il Servizio per inviare spam o comunicazioni ingannevoli.",
      ],
    },
    {
      heading: "Enforcement senza lettura del contenuto crittografato",
      paragraphs: [
        "Poiché i tuoi dati sono crittografati end-to-end, Helvety non può moderare il testo in chiaro. Le opzioni di enforcement si limitano a misure a livello di account e di ciphertext (ad esempio sospensione di account, eliminazione di blob o workspace crittografati, o blocco dell'accesso) basate su segnali che Helvety può vedere, come abuso di API, attività di account illegali o richieste legittime relative ai metadati detenuti da Helvety.",
        "Helvety non afferma di poter ispezionare o «pulire» contenuti crittografati.",
      ],
    },
    {
      heading: "La tua responsabilità",
      paragraphs: [
        "Sei responsabile della liceità dei contenuti che crittografi e del rispetto della legge applicabile. L'incapacità di Helvety di leggere i tuoi dati non autorizza un uso illegale.",
        "Se Helvety ritiene ragionevolmente che il tuo uso crei un rischio legale o danneggi il Servizio o terzi, Helvety può sospendere o terminare l'accesso senza preavviso quando l'urgenza lo richieda ragionevolmente.",
      ],
    },
    {
      heading: "Segnalazioni",
      paragraphs: [
        "Abusi o comunicazioni legali relative ad account/metadati su cui Helvety può agire: contact@helvety.com. Le segnalazioni che richiederebbero a Helvety di leggere testo in chiaro crittografato non possono essere soddisfatte; Helvety può agire solo su ciò che memorizza.",
      ],
    },
  ],
};
