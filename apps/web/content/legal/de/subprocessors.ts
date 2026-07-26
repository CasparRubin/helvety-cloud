import type { LegalDocument } from "../types";

export const subprocessorsDoc: LegalDocument = {
  slug: "subprocessors",
  title: "Unterauftragsverarbeiter",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Lebende Liste",
      paragraphs: [
        "Helvety setzt die folgenden Auftragsverarbeiter ein, um Helvety Cloud zu betreiben. Diese Liste kann sich ändern; wesentliche Änderungen werden hier abgebildet und, soweit erforderlich, gemäss der Datenschutzerklärung kommuniziert.",
      ],
    },
    {
      heading: "Aktuelle Auftragsverarbeiter",
      paragraphs: [
        "Supabase: Authentifizierung und Postgres-Datenbank. Das Projekt helvety-cloud befindet sich in eu-central-2 (Zürich). Verarbeitet Konto-E-Mail-/Auth-Metadaten sowie Ciphertext/Metadaten wie in der Datenschutzerklärung beschrieben.",
        "Vercel: Anwendungs-Hosting. Verarbeitet HTTP-Traffic und Hosting-Logs für die Web-App.",
        "E-Mail-Zustellung über Supabase Auth: OTP- und Auth-E-Mails. Die Region hängt von der E-Mail-Konfiguration von Supabase Auth ab.",
        "Stripe: Zahlungsabwicklung, wenn die Abrechnung aktiviert ist. Verarbeitet nur Abrechnungsidentität und Zahlungsmetadaten, niemals verschlüsselten Klartext oder rohe Verschlüsselungsschlüssel. Es wird nichts belastet, bis bezahlte Pläne im Produkt aktiviert sind.",
      ],
    },
    {
      heading: "Aktualisierungen",
      paragraphs: [
        "Wir können diese Liste aktualisieren, wenn sich Anbieter ändern. Die fortgesetzte Nutzung des Dienstes nach der Veröffentlichung gilt als Kenntnisnahme der aktualisierten Liste, vorbehaltlich der Anforderungen der Datenschutzerklärung bei wesentlichen Änderungen.",
      ],
    },
  ],
};
