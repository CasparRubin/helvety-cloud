import type { LegalDocument } from "../types";

export const termsDoc: LegalDocument = {
  slug: "terms",
  title: "Termini di servizio",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Accordo",
      paragraphs: [
        "I presenti Termini di servizio («Termini») disciplinano l'accesso e l'uso di Helvety Cloud su helvety.cloud (il «Servizio»), fornito da Helvety by Rubin, Basel, Svizzera («Helvety», «noi»).",
        "Creando un account, accettando questi Termini nel prodotto o usando il Servizio, accetti questi Termini, la Politica di uso accettabile (AUP), l'Informativa sulla privacy e l'avviso E2EE / zero-access. Se non sei d'accordo, non usare il Servizio.",
      ],
    },
    {
      heading: "Il servizio",
      paragraphs: [
        "Helvety Cloud è un servizio di workspace senza password, crittografato end-to-end (E2EE). L'autenticazione crea una sessione di account tramite codici e-mail monouso. Lo sblocco della crittografia e la decrittazione avvengono solo sul tuo dispositivo usando chiavi derivate dalla tua passkey di sblocco (WebAuthn PRF) e dal materiale correlato detenuto lato client.",
        "Helvety non detiene master key, non effettua escrow delle chiavi di crittografia e non può decrittare né ripristinare i tuoi dati. Credenziali di sblocco o materiale di recupero perduti possono comportare la perdita permanente dei tuoi dati.",
        "Il Servizio può evolversi nel tempo. Possiamo aggiungere, modificare o interrompere funzionalità. Le modifiche sostanziali a questi Termini saranno riflesse da una nuova versione della policy che potresti dover accettare di nuovo prima di continuare a usare le funzionalità crittografate.",
      ],
    },
    {
      heading: "Account",
      paragraphs: [
        "L'accesso richiede un'e-mail valida e codici monouso. Helvety Cloud non usa password di account. Lo sblocco della crittografia usa una passkey separata sul tuo dispositivo e non è la stessa cosa dell'accesso.",
        "Devi essere in grado di stipulare contratti vincolanti ai sensi della legge applicabile. Se usi il Servizio per conto di un'organizzazione, dichiari di avere l'autorità di vincolare tale organizzazione.",
        "Sei responsabile di mantenere sotto il tuo controllo l'accesso alla tua e-mail, alla passkey di sblocco, ai dispositivi e a qualsiasi export di recupero. Helvety non può reimpostare l'accesso alla crittografia per te e non ti chiederà di inviare recovery key o materiale di sblocco a Helvety.",
      ],
    },
    {
      heading: "Licenza e uso accettabile",
      paragraphs: [
        "Fatti salvi questi Termini e l'AUP (incorporata per riferimento), Helvety ti concede un diritto limitato, non esclusivo, non trasferibile e revocabile di usare il Servizio per scopi leciti.",
        "Helvety può sospendere o terminare account per violazioni dell'AUP, abusi, mancato pagamento (quando si applica la fatturazione), rischio legale o per proteggere il Servizio. Poiché i tuoi dati sono crittografati end-to-end, l'enforcement per i contenuti crittografati si limita a misure a livello di account e di ciphertext (ad esempio sospensione dell'accesso o eliminazione di blob crittografati). Helvety non può leggere il testo in chiaro per moderarlo.",
      ],
    },
    {
      heading: "I tuoi contenuti e la tua responsabilità",
      paragraphs: [
        "Mantieni la proprietà dei contenuti che crei. Concedi a Helvety solo i diritti necessari per memorizzare e trasmettere ciphertext e metadati correlati per operare il Servizio.",
        "Sei l'unico responsabile della liceità dei contenuti che crittografi e del rispetto della legge applicabile. L'incapacità di Helvety di leggere i tuoi dati non autorizza un uso illegale.",
      ],
    },
    {
      heading: "Cosa il servizio non è",
      paragraphs: [
        "Helvety Cloud non è un backup in chiaro dei tuoi dati, non è un servizio di recupero chiavi o di recupero forense, e non è un host di contenuti in grado di ispezionare o ripristinare i contenuti crittografati del tuo workspace.",
        "I limiti del piano gratuito, se presenti, sono indicati nel prodotto e nei Termini di fatturazione. Le funzionalità a pagamento, quando offerte, sono disciplinate dai Termini di fatturazione e da questi Termini.",
      ],
    },
    {
      heading: "Disponibilità e supporto",
      paragraphs: [
        "Puntiamo a una disponibilità affidabile, ma non garantiamo un funzionamento ininterrotto o privo di errori. Manutenzione pianificata, interruzioni di terzi (ad esempio hosting o provider di autenticazione) e forza maggiore possono influire sull'accesso.",
        "Il supporto è limitato al funzionamento dell'account e del Servizio. Il supporto non può decrittare i tuoi dati né ripristinare chiavi perdute.",
      ],
    },
    {
      heading: "Dichiarazioni di non responsabilità",
      paragraphs: [
        "Nella massima misura consentita dal diritto imperativo, il Servizio è fornito «così com'è» e «come disponibile», senza garanzie di commerciabilità, idoneità a uno scopo particolare o non violazione.",
        "Helvety non garantisce che i dati crittografati rimangano recuperabili se perdi materiale di sblocco o di recupero, né che browser di terzi, archivi di passkey del sistema operativo o dispositivi rimangano sempre compatibili.",
      ],
    },
    {
      heading: "Limitazione di responsabilità",
      paragraphs: [
        "Nella massima misura consentita dal diritto applicabile imperativo, Helvety e Caspar Camille Rubin (come titolare di ditta individuale) non sono responsabili per danni indiretti, incidentali, speciali, consequenziali o punitivi, né per perdita di profitti, ricavi, dati, goodwill o opportunità commerciali, derivanti da o relativi al Servizio o a questi Termini, inclusa la perdita permanente dei tuoi dati dovuta a chiavi o materiale di recupero perduti.",
        "Nella massima misura consentita dal diritto imperativo, la responsabilità aggregata totale di Helvety per tutte le rivendicazioni derivanti da o relative al Servizio o a questi Termini è limitata al maggiore tra (a) CHF 100 o (b) gli importi che hai pagato a Helvety per il Servizio nei dodici (12) mesi precedenti la rivendicazione (o CHF 0 se hai usato solo un'offerta gratuita).",
        "Nulla in questi Termini esclude o limita una responsabilità che non può essere esclusa o limitata ai sensi del diritto svizzero imperativo (o di altre tutele imperative dei consumatori che ti si applicano), inclusa la responsabilità per morte o lesioni personali causate da negligenza ove tale limitazione sia vietata, o per frode o condotta dolosa.",
      ],
    },
    {
      heading: "Indennizzo",
      paragraphs: [
        "Difenderai e indennizzerai Helvety da rivendicazioni, danni e costi ragionevoli derivanti dal tuo uso illecito del Servizio, dai tuoi contenuti crittografati o dalla violazione di questi Termini o dell'AUP, salvo nella misura causata dalla condotta dolosa di Helvety.",
      ],
    },
    {
      heading: "Legge applicabile e controversie",
      paragraphs: [
        "Questi Termini sono regolati dal diritto sostanziale della Svizzera, esclusi i conflitti di legge. Fatte salve le tutele imperative dei consumatori che possano concederti altri fori, la giurisdizione esclusiva spetta ai tribunali di Basel-Stadt, Svizzera.",
        "I diritti imperativi dei consumatori a cui non si può rinunciare ai sensi della legge applicabile restano impregiudicati.",
      ],
    },
    {
      heading: "Modifiche e contatti",
      paragraphs: [
        "Possiamo aggiornare questi Termini pubblicando una nuova versione e richiedendo l'accettazione della nuova versione ove necessario per continuare a usare le funzionalità crittografate. L'uso continuato dopo l'accettazione richiesta costituisce accordo ai Termini aggiornati.",
        "Contatto: contact@helvety.com. Dettagli del fornitore: vedi Impressum.",
      ],
    },
  ],
};
