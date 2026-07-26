import type { LegalDocument } from "../types";

export const e2eeDoc: LegalDocument = {
  slug: "e2ee",
  title: "Avviso E2EE / zero-access",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Conferma richiesta",
      paragraphs: [
        "Devi accettare questo avviso prima della configurazione della crittografia. È una parte centrale del funzionamento di Helvety Cloud.",
      ],
    },
    {
      heading: "Zero knowledge per i tuoi dati",
      paragraphs: [
        "Helvety non può decrittare i tuoi dati. Non esiste una master key aziendale, nessun key escrow e nessun flusso di supporto che ripristini il testo in chiaro crittografato.",
        "L'autenticazione (OTP e-mail per la sessione) è distinta dallo sblocco della crittografia. Una sessione autenticata non significa che Helvety possa leggere i dati crittografati del workspace.",
      ],
    },
    {
      heading: "Nessun recupero da parte di Helvety",
      paragraphs: [
        "Se perdi la capacità di sblocco passkey/PRF e qualsiasi export di recupero che ti è stato mostrato, Helvety non può recuperare i tuoi dati. Chiavi perdute significano la perdita permanente di quel contenuto crittografato.",
        "Qualsiasi recovery key e wrap mostrati durante la configurazione devono essere conservati offline da te. Non inviarli mai via e-mail a Helvety e non incollarli nei canali di supporto aspettandoti un ripristino.",
      ],
    },
    {
      heading: "Cosa Helvety può ancora conservare",
      paragraphs: [
        "Helvety può conservare identificatori di account (ad esempio e-mail), metadati di appartenenza, chiavi pubbliche, blob di ciphertext, dimensioni, timestamp e (quando abilitato) contatori di fatturazione. Un'eventuale divulgazione coercitiva può riguardare solo ciò che Helvety memorizza effettivamente, non il testo in chiaro che Helvety non può produrre.",
      ],
    },
    {
      heading: "La tua conferma",
      paragraphs: [
        "Accettando questo avviso confermi di comprendere che Helvety non può leggere né ripristinare i tuoi dati, che sei responsabile dei tuoi contenuti e delle tue chiavi, e che è possibile una perdita permanente di dati se il materiale di sblocco o di recupero viene perso.",
      ],
    },
  ],
};
