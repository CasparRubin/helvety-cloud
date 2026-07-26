import type { LegalDocument } from "../types";

export const privacyDoc: LegalDocument = {
  slug: "privacy",
  title: "Informativa sulla privacy",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Titolare del trattamento",
      paragraphs: [
        "Titolare del trattamento dei dati personali per Helvety Cloud: Helvety by Rubin (Caspar Camille Rubin), Holeestrasse 116, 4054 Basel, Svizzera. UID CHE-356.266.592.",
        "Contatto per richieste sulla privacy: contact@helvety.com.",
      ],
    },
    {
      heading: "Ambito",
      paragraphs: [
        "La presente Informativa sulla privacy spiega come Helvety tratta i dati personali quando usi helvety.cloud. Si applica ai sensi della Legge federale svizzera sulla protezione dei dati (LPD / nDSG). Se ti trovi nello SEE/Regno Unito e Helvety ti offre il Servizio, Helvety mira inoltre a rispettare i principi applicabili del GDPR/UK GDPR per i dati personali che Helvety tratta effettivamente.",
        "I contenuti crittografati (ciphertext) sono opachi per Helvety. Helvety non è titolare del trattamento del testo in chiaro a cui non ha accesso.",
      ],
    },
    {
      heading: "Dati che Helvety tratta (account / metadati)",
      paragraphs: [
        "Indirizzo e-mail e metadati di autenticazione (ad esempio consegna OTP tramite Supabase Auth).",
        "Profilo e record di appartenenza (id utente, ruoli di appartenenza al workspace, timestamp).",
        "Materiale crittografico pubblico necessario per il prodotto (ad esempio chiavi pubbliche utente) e blob wrappati o crittografati che Helvety non può decrittare.",
        "Record di accettazione delle policy (quali versioni di policy hai accettato e quando).",
        "Log tecnici ragionevolmente necessari per operare e proteggere il Servizio (ad esempio indirizzi IP nei log di hosting/auth, metadati delle richieste).",
        "Metadati di fatturazione quando i piani a pagamento sono abilitati (ad esempio stato dell'abbonamento e conteggi dei meter). La fatturazione non include mai testo in chiaro crittografato o chiavi di crittografia grezze.",
      ],
    },
    {
      heading: "Dati a cui Helvety non può accedere",
      paragraphs: [
        "Il ciphertext dei contenuti crittografati è opaco per Helvety. Il personale, gli amministratori di database e i ruoli di database privilegiati non possono decrittare titoli, corpi o altro testo in chiaro dai tuoi dati crittografati.",
        "Helvety non riceve output PRF, chiavi di sblocco, testo in chiaro delle recovery key o chiavi private grezze. Helvety non può ripristinare i tuoi dati se perdi materiale di sblocco o di recupero.",
      ],
    },
    {
      heading: "Finalità e basi giuridiche",
      paragraphs: [
        "Fornire e proteggere il Servizio (contratto / preparazione del contratto; interessi legittimi nel funzionamento sicuro).",
        "Autenticarti e gestire il tuo account (contratto).",
        "Registrare le accettazioni delle policy (obbligo legale / contratto / interessi legittimi nel dimostrare consenso e accettazione dei termini).",
        "Comunicare avvisi relativi al servizio (contratto / interessi legittimi).",
        "Rispettare la legge e rispondere a richieste legittime limitate ai dati detenuti da Helvety (obbligo legale).",
        "Fatturazione e contabilità quando si applicano piani a pagamento (contratto / obbligo legale).",
      ],
    },
    {
      heading: "Responsabili del trattamento",
      paragraphs: [
        "Helvety utilizza i responsabili del trattamento elencati nella pagina Sub-responsabili del trattamento (incluso Supabase per auth/database a Zurigo, Vercel per l'hosting, consegna e-mail usata per gli OTP di auth e Stripe quando la fatturazione è abilitata). I responsabili del trattamento agiscono su istruzione di Helvety per il Servizio.",
      ],
    },
    {
      heading: "Trasferimenti internazionali",
      paragraphs: [
        "Il database e l'auth principali di questo Servizio sono ospitati nell'UE (Zurigo / eu-central-2). Hosting e strumenti e-mail possono comportare trattamenti in altre regioni a seconda della configurazione dei fornitori. Ove richiesto, Helvety si basa su meccanismi di trasferimento appropriati offerti da tali fornitori (ad esempio clausole contrattuali standard) e su tutele contrattuali.",
      ],
    },
    {
      heading: "Conservazione",
      paragraphs: [
        "I dati di account e appartenenza sono conservati mentre il tuo account è attivo e per un periodo ragionevole successivo, come necessario per sicurezza, gestione delle controversie e conservazione legale.",
        "Il ciphertext e i metadati di crittografia correlati sono conservati finché associati al tuo account/ai tuoi workspace o fino all'eliminazione tramite il Servizio o i processi di chiusura account.",
        "I record di accettazione delle policy sono conservati per documentare quali termini si applicavano.",
        "I log sono conservati per un periodo operativo limitato, salvo che un periodo più lungo sia richiesto per motivi di sicurezza o legali.",
      ],
    },
    {
      heading: "I tuoi diritti",
      paragraphs: [
        "A seconda della legge applicabile, puoi avere diritti di accesso, rettifica, cancellazione, limitazione, opposizione e portabilità dei dati riguardo ai dati personali che Helvety tratta su di te.",
        "Per esercitare i diritti, scrivi a contact@helvety.com. Helvety potrebbe dover verificare la tua identità. Helvety non può produrre testo in chiaro crittografato che non ha mai detenuto.",
        "La cancellazione dei dati dell'account non ricrea le chiavi di crittografia perdute. L'eliminazione del ciphertext rimuove i blob memorizzati; non significa che Helvety abbia mai detenuto testo in chiaro.",
        "Puoi presentare un reclamo all'IFPDT svizzero o a un'altra autorità di controllo competente, ove applicabile.",
      ],
    },
    {
      heading: "Minori",
      paragraphs: [
        "Il Servizio non è rivolto a minori di 16 anni. Non usare il Servizio se non hai l'età richiesta nella tua giurisdizione per acconsentire al trattamento dei dati e ai contratti.",
      ],
    },
    {
      heading: "Modifiche",
      paragraphs: [
        "Possiamo aggiornare questa Informativa sulla privacy pubblicando una nuova versione. Le modifiche sostanziali che riguardano l'accettazione vincolata alla registrazione useranno una nuova stringa di versione che dovrai accettare prima di continuare la configurazione della crittografia o l'uso ove vincolato.",
      ],
    },
  ],
};
