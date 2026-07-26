import type { LegalDocument } from "../types";

export const privacyDoc: LegalDocument = {
  slug: "privacy",
  title: "Datenschutzerklärung",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Verantwortlicher",
      paragraphs: [
        "Verantwortlicher für die Verarbeitung personenbezogener Daten für Helvety Cloud: Helvety by Rubin (Caspar Camille Rubin), Holeestrasse 116, 4054 Basel, Schweiz. UID CHE-356.266.592.",
        "Kontakt für Datenschutzanfragen: contact@helvety.com.",
      ],
    },
    {
      heading: "Geltungsbereich",
      paragraphs: [
        "Diese Datenschutzerklärung erläutert, wie Helvety personenbezogene Daten verarbeitet, wenn Sie helvety.cloud nutzen. Sie gilt nach dem Schweizer Bundesgesetz über den Datenschutz (DSG / nDSG). Wenn Sie sich im EWR/UK befinden und Helvety Ihnen den Dienst anbietet, beabsichtigt Helvety zudem, die anwendbaren Grundsätze der DSGVO/UK GDPR für die personenbezogenen Daten zu beachten, die Helvety tatsächlich verarbeitet.",
        "Verschlüsselte Inhalte (Ciphertext) sind für Helvety undurchsichtig. Helvety ist kein Verantwortlicher für Klartext, auf den Helvety keinen Zugriff hat.",
      ],
    },
    {
      heading: "Daten, die Helvety verarbeitet (Konto / Metadaten)",
      paragraphs: [
        "E-Mail-Adresse und Authentifizierungsmetadaten (zum Beispiel OTP-Zustellung über Supabase Auth).",
        "Profil- und Mitgliedschaftsdaten (Benutzer-ID, Workspace-Mitgliedschaftsrollen, Zeitstempel).",
        "Öffentliches kryptografisches Material, das für das Produkt benötigt wird (zum Beispiel öffentliche Benutzerschlüssel), sowie gewrappte oder verschlüsselte Blobs, die Helvety nicht entschlüsseln kann.",
        "Aufzeichnungen zur Richtlinienannahme (welche Richtlinienversionen Sie wann akzeptiert haben).",
        "Technische Logs, die vernünftigerweise zum Betrieb und zur Sicherung des Dienstes nötig sind (zum Beispiel IP-Adressen in Hosting-/Auth-Logs, Anfragemetadaten).",
        "Abrechnungsmetadaten, wenn bezahlte Pläne aktiviert sind (zum Beispiel Abonnementstatus und Zählerstände). Die Abrechnung enthält niemals verschlüsselten Klartext oder rohe Verschlüsselungsschlüssel.",
      ],
    },
    {
      heading: "Daten, auf die Helvety keinen Zugriff hat",
      paragraphs: [
        "Verschlüsselter Content-Ciphertext ist für Helvety undurchsichtig. Mitarbeitende, Datenbankadministratoren und privilegierte Datenbankrollen können aus Ihren verschlüsselten Daten weder Titel, Inhalte noch sonstigen Klartext entschlüsseln.",
        "Helvety erhält keine PRF-Ausgabe, Unlock-Schlüssel, Recovery-Key-Klartext oder rohe private Schlüssel. Helvety kann Ihre Daten nicht wiederherstellen, wenn Sie Unlock- oder Recovery-Material verlieren.",
      ],
    },
    {
      heading: "Zwecke und Rechtsgrundlagen",
      paragraphs: [
        "Bereitstellung und Sicherung des Dienstes (Vertrag / Vertragsvorbereitung; berechtigte Interessen am sicheren Betrieb).",
        "Authentifizierung und Verwaltung Ihres Kontos (Vertrag).",
        "Aufzeichnung von Richtlinienannahmen (rechtliche Verpflichtung / Vertrag / berechtigte Interessen am Nachweis von Einwilligung und Annahme der Bedingungen).",
        "Versand dienstbezogener Mitteilungen (Vertrag / berechtigte Interessen).",
        "Einhaltung von Recht und Beantwortung rechtmässiger Anfragen, beschränkt auf Daten, die Helvety hält (rechtliche Verpflichtung).",
        "Abrechnung und Buchhaltung, wenn bezahlte Pläne gelten (Vertrag / rechtliche Verpflichtung).",
      ],
    },
    {
      heading: "Auftragsverarbeiter",
      paragraphs: [
        "Helvety setzt Auftragsverarbeiter ein, die auf der Seite Unterauftragsverarbeiter aufgeführt sind (einschliesslich Supabase für Auth/Datenbank in Zürich, Vercel für Hosting, E-Mail-Zustellung für Auth-OTPs und Stripe, wenn die Abrechnung aktiviert ist). Auftragsverarbeiter handeln nach Weisung von Helvety für den Dienst.",
      ],
    },
    {
      heading: "Internationale Übermittlungen",
      paragraphs: [
        "Primäre Datenbank und Auth für diesen Dienst sind in der EU gehostet (Zürich / eu-central-2). Hosting und E-Mail-Tools können je nach Anbieterkonfiguration Verarbeitungen in anderen Regionen umfassen. Soweit erforderlich, stützt sich Helvety auf geeignete Übermittlungsmechanismen dieser Anbieter (zum Beispiel Standardvertragsklauseln) und vertragliche Absicherungen.",
      ],
    },
    {
      heading: "Aufbewahrung",
      paragraphs: [
        "Konto- und Mitgliedschaftsdaten werden aufbewahrt, solange Ihr Konto aktiv ist, und danach für einen angemessenen Zeitraum, soweit für Sicherheit, Streitbeilegung und gesetzliche Aufbewahrung nötig.",
        "Ciphertext und zugehörige Verschlüsselungsmetadaten werden aufbewahrt, solange sie mit Ihrem Konto/Ihren Workspaces verknüpft sind oder bis sie über den Dienst oder Kontoschliessungsprozesse gelöscht werden.",
        "Aufzeichnungen zur Richtlinienannahme werden aufbewahrt, um nachzuweisen, welche Bedingungen galten.",
        "Logs werden für einen begrenzten Betriebszeitraum aufbewahrt, es sei denn, ein längerer Zeitraum ist aus Sicherheits- oder Rechtsgründen erforderlich.",
      ],
    },
    {
      heading: "Ihre Rechte",
      paragraphs: [
        "Je nach anwendbarem Recht können Sie Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit hinsichtlich der personenbezogenen Daten haben, die Helvety über Sie verarbeitet.",
        "Zur Ausübung Ihrer Rechte schreiben Sie an contact@helvety.com. Helvety kann Ihre Identität überprüfen müssen. Helvety kann keinen verschlüsselten Klartext erzeugen, den Helvety nie gehalten hat.",
        "Die Löschung von Kontodaten stellt verlorene Verschlüsselungsschlüssel nicht wieder her. Das Löschen von Ciphertext entfernt gespeicherte Blobs; es bedeutet nicht, dass Helvety jemals Klartext gehalten hat.",
        "Sie können eine Beschwerde beim Schweizer EDÖB oder einer anderen zuständigen Aufsichtsbehörde einreichen, soweit anwendbar.",
      ],
    },
    {
      heading: "Kinder",
      paragraphs: [
        "Der Dienst richtet sich nicht an Kinder unter 16 Jahren. Nutzen Sie den Dienst nicht, wenn Sie unter dem Alter liegen, das in Ihrer Rechtsordnung für die Einwilligung in Datenverarbeitung und Verträge erforderlich ist.",
      ],
    },
    {
      heading: "Änderungen",
      paragraphs: [
        "Wir können diese Datenschutzerklärung aktualisieren, indem wir eine neue Version veröffentlichen. Wesentliche Änderungen, die eine bei der Anmeldung/Einrichtung erforderliche Annahme betreffen, verwenden eine neue Versionszeichenfolge, die Sie akzeptieren müssen, bevor die Verschlüsselungseinrichtung oder die Nutzung fortgesetzt wird, soweit dies gated ist.",
      ],
    },
  ],
};
