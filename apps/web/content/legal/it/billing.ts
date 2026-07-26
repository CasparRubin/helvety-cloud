import type { LegalDocument } from "../types";

export const billingDoc: LegalDocument = {
  slug: "billing",
  title: "Termini di fatturazione",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Stato",
      paragraphs: [
        "Helvety Cloud offre un piano gratuito e un piano Pro a pagamento per workspace, elaborati tramite Stripe, più add-on a pagamento opzionali che aumentano limiti specifici. Non viene addebitato nulla a meno che un proprietario del workspace non avvii esplicitamente Checkout (dove il prezzo è mostrato prima di qualsiasi addebito) o modifichi add-on a pagamento.",
        "I proprietari del workspace possono riscattare un codice sconto o complimentary emesso da Helvety. Un codice complimentary al 100% concede l'accesso Pro per quel workspace senza raccogliere un metodo di pagamento. I codici di sconto parziale riducono il prezzo di Pro e degli add-on a pagamento per quel workspace quando Checkout o gli aggiornamenti di fatturazione passano da Stripe.",
        "Questi termini non creano di per sé un obbligo di acquisto. Il piano gratuito resta utilizzabile entro i limiti indicati senza metodo di pagamento.",
      ],
    },
    {
      heading: "Piano gratuito",
      paragraphs: [
        "Il piano gratuito applica limiti di uso ragionevole per workspace (ad esempio conteggi di progetti, membri, task per progetto, note e contatti). Upload di file e archiviazione documenti non sono disponibili sul piano gratuito, anche nei workspace Personal gratuiti. I limiti attuali sono mostrati nel prodotto dove si applicano, prima che un limite blocchi un'azione, non dopo un pagamento.",
        "Ogni account può possedere due workspace free-tier (incluso il workspace Personal). Workspace aggiuntivi in proprietà richiedono Pro (a pagamento o complimentary) per quel workspace.",
        "Se un workspace Pro a pagamento o complimentary termina e possiederesti quindi più di due workspace free-tier, Helvety può soft-lockare il o i workspace in eccesso: il contenuto crittografato esistente resta disponibile per aprire, modificare, scaricare, esportare ed eliminare, ma la creazione di nuove risorse in quel workspace è sospesa finché non lo aggiorni a Pro o riduci i workspace gratuiti posseduti entro l'assegnazione. Helvety non elimina il ciphertext né trattiene le chiavi wrappate solo perché un workspace è soft-lockato.",
        "Helvety può modificare i limiti gratuiti con avviso nel prodotto. L'uso continuato dopo una modifica significa che accetti i limiti aggiornati. Cap ridotti non eliminano i tuoi dati; le nuove creazioni possono essere bloccate finché non sei sotto il nuovo cap o aggiorni.",
      ],
    },
    {
      heading: "Piani a pagamento e add-on",
      paragraphs: [
        "Gli abbonamenti sono legati al workspace: il proprietario del workspace paga il piano Pro di quel workspace e qualsiasi add-on su quel workspace.",
        "Pro include limiti operativi più alti e archiviazione crittografata di file e documenti per quel workspace, entro i limiti di storage, dimensione per file e file per task mostrati nel prodotto. I file caricati sono crittografati end-to-end sul tuo dispositivo; Helvety memorizza solo ciphertext e meter operativi di dimensione e non può decrittare i contenuti dei file.",
        "Gli add-on consentono di acquistare capacità aggiuntiva per meter individuali (ad esempio più progetti) senza aumentare limiti non correlati. Gli add-on richiedono un abbonamento Pro a pagamento attivo su quel workspace; i workspace complimentary ricevono già cap operativi non misurati come mostrato nel prodotto.",
        "Prezzi, intervalli di fatturazione (inclusa la fatturazione annuale Pro quando offerta), rinnovi, imposte e qualsiasi percentuale di sconto applicata sono mostrati in Stripe Checkout o nel portale di fatturazione. Salvo diversa indicazione, gli abbonamenti si rinnovano automaticamente fino alla cancellazione.",
        "Puoi annullare il rinnovo in qualsiasi momento nel portale di fatturazione Stripe (disponibile dalle impostazioni di fatturazione del workspace); l'accesso ai limiti a pagamento continua per il periodo già acquistato salvo diversa indicazione. Nessuna penale di cancellazione, nessun trucco di retention. L'accesso complimentary può essere revocato da Helvety; il ciphertext non viene eliminato solo perché un'assegnazione complimentary termina. Possono quindi applicarsi i limiti gratuiti e, ove applicabile, i gate di creazione in soft-lock.",
        "Fatture ed elaborazione dei pagamenti usano Stripe (vedi Sub-responsabili del trattamento). Helvety non ha mai bisogno di testo in chiaro crittografato o chiavi di crittografia grezze per la fatturazione. I meter usano solo conteggi operativi in chiaro e dimensioni in byte del ciphertext.",
      ],
    },
    {
      heading: "Recesso del consumatore",
      paragraphs: [
        "Se il diritto imperativo dei consumatori ti concede un diritto di recesso per servizi digitali, Helvety rispetterà tale diritto come richiesto. Ove tu richieda espressamente l'esecuzione immediata di un servizio digitale e riconosca la perdita del recesso dopo l'inizio dell'esecuzione, Helvety può fare affidamento su tale riconoscimento ove consentito dalla legge.",
      ],
    },
    {
      heading: "Pagamenti falliti e soft-lock",
      paragraphs: [
        "Se un piano a pagamento è attivo e il pagamento fallisce, Helvety può ritentare gli addebiti e può terminare le entitlement a pagamento dopo avviso, così che si applichino i limiti del piano gratuito. Se ciò ti lascia oltre l'assegnazione di workspace gratuiti posseduti, i workspace in eccesso possono essere soft-lockati come descritto in Piano gratuito: il contenuto esistente resta accessibile; le nuove creazioni sono sospese. Il ciphertext può essere conservato o eliminato secondo le pratiche di chiusura account e conservazione dell'Informativa sulla privacy. Helvety non può comunque decrittarlo.",
      ],
    },
    {
      heading: "Contatti",
      paragraphs: [
        "Domande sulla fatturazione: contact@helvety.com. Dettagli del fornitore: vedi Impressum.",
      ],
    },
  ],
};
