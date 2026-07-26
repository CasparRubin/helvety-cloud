import type { LegalDocument } from "../types";

export const subprocessorsDoc: LegalDocument = {
  slug: "subprocessors",
  title: "Sub-responsabili del trattamento",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Elenco dinamico",
      paragraphs: [
        "Helvety utilizza i seguenti responsabili del trattamento per operare Helvety Cloud. Questo elenco può cambiare; le modifiche sostanziali saranno riflesse qui e, ove richiesto, comunicate ai sensi dell'Informativa sulla privacy.",
      ],
    },
    {
      heading: "Responsabili del trattamento attuali",
      paragraphs: [
        "Supabase: autenticazione e database Postgres. Il progetto helvety-cloud si trova in eu-central-2 (Zurigo). Tratta metadati e-mail/auth dell'account e ciphertext/metadati come descritto nell'Informativa sulla privacy.",
        "Vercel: hosting dell'applicazione. Tratta traffico HTTP e log di hosting per l'app web.",
        "Consegna e-mail tramite Supabase Auth: OTP e e-mail di autenticazione. La regione dipende dalla configurazione e-mail di Supabase Auth.",
        "Stripe: elaborazione dei pagamenti quando la fatturazione è abilitata. Tratta solo identità di fatturazione e metadati di pagamento, mai testo in chiaro crittografato o chiavi di crittografia grezze. Nessun addebito finché i piani a pagamento non sono attivati nel prodotto.",
      ],
    },
    {
      heading: "Aggiornamenti",
      paragraphs: [
        "Possiamo aggiornare questo elenco quando cambiano i fornitori. L'uso continuato del Servizio dopo la pubblicazione costituisce notifica dell'elenco aggiornato, fatte salve le disposizioni dell'Informativa sulla privacy per le modifiche sostanziali.",
      ],
    },
  ],
};
