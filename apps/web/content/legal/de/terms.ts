import type { LegalDocument } from "../types";

export const termsDoc: LegalDocument = {
  slug: "terms",
  title: "Nutzungsbedingungen",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Vereinbarung",
      paragraphs: [
        "Diese Nutzungsbedingungen («Bedingungen») regeln den Zugang zu und die Nutzung von Helvety Cloud unter helvety.cloud (der «Dienst»), bereitgestellt von Helvety by Rubin, Basel, Schweiz («Helvety», «wir», «uns»).",
        "Mit der Erstellung eines Kontos, der Annahme dieser Bedingungen im Produkt oder der Nutzung des Dienstes erklären Sie sich mit diesen Bedingungen, der Nutzungsrichtlinie (AUP), der Datenschutzerklärung und dem E2EE-/Zero-Access-Hinweis einverstanden. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst nicht.",
      ],
    },
    {
      heading: "Der Dienst",
      paragraphs: [
        "Helvety Cloud ist ein passwortloser, ende-zu-ende-verschlüsselter (E2EE) Workspace-Dienst. Die Authentifizierung erstellt eine Kontositzung über einmalige E-Mail-Codes. Entsperren und Entschlüsselung finden nur auf Ihrem Gerät statt, mit Schlüsseln, die aus Ihrem Unlock-Passkey (WebAuthn PRF) und zugehörigem clientseitig gehaltenem Material abgeleitet werden.",
        "Helvety hält keine Master-Keys, verwahrt keine Verschlüsselungsschlüssel (kein Escrow) und kann Ihre Daten weder entschlüsseln noch wiederherstellen. Verlorene Unlock-Zugangsdaten oder Recovery-Material können den dauerhaften Verlust Ihrer Daten bedeuten.",
        "Der Dienst kann sich über die Zeit ändern. Wir können Funktionen hinzufügen, ändern oder einstellen. Wesentliche Änderungen dieser Bedingungen werden durch eine neue Richtlinienversion abgebildet, die Sie möglicherweise erneut akzeptieren müssen, bevor Sie verschlüsselte Funktionen weiter nutzen.",
      ],
    },
    {
      heading: "Konto",
      paragraphs: [
        "Der Zugang erfordert eine gültige E-Mail-Adresse und einmalige Codes. Helvety Cloud verwendet keine Kontopasswörter. Das Entsperren der Verschlüsselung nutzt einen separaten Passkey auf Ihrem Gerät und ist nicht dasselbe wie die Anmeldung.",
        "Sie müssen nach anwendbarem Recht in der Lage sein, verbindliche Verträge einzugehen. Wenn Sie den Dienst im Namen einer Organisation nutzen, versichern Sie, dass Sie bevollmächtigt sind, diese Organisation zu binden.",
        "Sie sind dafür verantwortlich, den Zugang zu Ihrer E-Mail, Ihrem Unlock-Passkey, Ihren Geräten und jedem Recovery-Export unter Ihrer Kontrolle zu halten. Helvety kann den Verschlüsselungszugang für Sie nicht zurücksetzen und wird Sie nicht auffordern, Recovery-Keys oder Unlock-Material an Helvety zu senden.",
      ],
    },
    {
      heading: "Lizenz und zulässige Nutzung",
      paragraphs: [
        "Vorbehaltlich dieser Bedingungen und der AUP (durch Verweis einbezogen) gewährt Ihnen Helvety ein beschränktes, nicht ausschliessliches, nicht übertragbares, widerrufliches Recht, den Dienst für rechtmässige Zwecke zu nutzen.",
        "Helvety kann Konten wegen AUP-Verstössen, Missbrauch, Nichtzahlung (wenn Abrechnung gilt), rechtlichem Risiko oder zum Schutz des Dienstes sperren oder beenden. Weil Ihre Daten ende-zu-ende-verschlüsselt sind, beschränkt sich die Durchsetzung bei verschlüsselten Inhalten auf Massnahmen auf Konto- und Ciphertext-Ebene (zum Beispiel Sperren des Zugangs oder Löschen verschlüsselter Blobs). Helvety kann Klartext nicht lesen, um ihn zu moderieren.",
      ],
    },
    {
      heading: "Ihre Inhalte und Verantwortung",
      paragraphs: [
        "Sie behalten das Eigentum an Inhalten, die Sie erstellen. Sie gewähren Helvety nur die Rechte, die nötig sind, um Ciphertext und zugehörige Metadaten zu speichern und zu übertragen, um den Dienst zu betreiben.",
        "Sie sind allein für die Rechtmässigkeit der von Ihnen verschlüsselten Inhalte und für die Einhaltung des anwendbaren Rechts verantwortlich. Die Unfähigkeit von Helvety, Ihre Daten zu lesen, legitimiert keine illegale Nutzung.",
      ],
    },
    {
      heading: "Was der Dienst nicht ist",
      paragraphs: [
        "Helvety Cloud ist kein Klartext-Backup Ihrer Daten, kein Dienst zur Schlüssel- oder forensischen Wiederherstellung und kein Inhalts-Host, der Ihre verschlüsselten Workspace-Inhalte einsehen oder wiederherstellen kann.",
        "Limits der Free-Stufe, sofern vorhanden, sind im Produkt und in den Abrechnungsbedingungen angegeben. Bezahlte Funktionen, sofern angeboten, unterliegen den Abrechnungsbedingungen und diesen Bedingungen.",
      ],
    },
    {
      heading: "Verfügbarkeit und Support",
      paragraphs: [
        "Wir streben eine zuverlässige Verfügbarkeit an, garantieren aber keinen unterbrechungsfreien oder fehlerfreien Betrieb. Geplante Wartung, Ausfälle Dritter (zum Beispiel Hosting- oder Auth-Anbieter) und höhere Gewalt können den Zugang beeinträchtigen.",
        "Support beschränkt sich auf Konto- und Dienstbetrieb. Support kann Ihre Daten weder entschlüsseln noch verlorene Schlüssel wiederherstellen.",
      ],
    },
    {
      heading: "Haftungsausschlüsse",
      paragraphs: [
        "Soweit zwingendes Recht es zulässt, wird der Dienst «wie besehen» und «wie verfügbar» bereitgestellt, ohne Gewährleistung der Marktgängigkeit, der Eignung für einen bestimmten Zweck oder der Nichtverletzung von Rechten Dritter.",
        "Helvety gewährleistet nicht, dass verschlüsselte Daten wiederherstellbar bleiben, wenn Sie Unlock- oder Recovery-Material verlieren, oder dass Browser Dritter, OS-Passkey-Speicher oder Geräte stets kompatibel bleiben.",
      ],
    },
    {
      heading: "Haftungsbeschränkung",
      paragraphs: [
        "Soweit zwingendes anwendbares Recht es zulässt, haften Helvety und Caspar Camille Rubin (als Einzelunternehmer) nicht für indirekte, Neben-, besondere, Folgeschäden oder Strafschadensersatz sowie nicht für den Verlust von Gewinnen, Einnahmen, Daten, Goodwill oder Geschäftschancen, die aus dem Dienst oder diesen Bedingungen entstehen oder damit zusammenhängen, einschliesslich des dauerhaften Verlusts Ihrer Daten wegen verlorener Schlüssel oder Recovery-Materials.",
        "Soweit zwingendes Recht es zulässt, ist die Gesamthaftung von Helvety für alle Ansprüche aus oder im Zusammenhang mit dem Dienst oder diesen Bedingungen auf den höheren der folgenden Beträge begrenzt: (a) CHF 100 oder (b) die Beträge, die Sie Helvety für den Dienst in den zwölf (12) Monaten vor dem Anspruch gezahlt haben (oder CHF 0, wenn Sie nur ein kostenloses Angebot genutzt haben).",
        "Nichts in diesen Bedingungen schliesst eine Haftung aus oder beschränkt sie, die nach zwingendem Schweizer Recht (oder anderen zwingenden Verbraucherschutzbestimmungen, die für Sie gelten) nicht ausgeschlossen oder beschränkt werden kann, einschliesslich der Haftung für Tod oder Personenschäden durch Fahrlässigkeit, soweit eine solche Beschränkung verboten ist, oder für Betrug oder vorsätzliches Fehlverhalten.",
      ],
    },
    {
      heading: "Freistellung",
      paragraphs: [
        "Sie werden Helvety gegen Ansprüche, Schäden und angemessene Kosten freistellen und verteidigen, die aus Ihrer unrechtmässigen Nutzung des Dienstes, Ihren verschlüsselten Inhalten oder Ihrer Verletzung dieser Bedingungen oder der AUP entstehen, soweit sie nicht durch vorsätzliches Fehlverhalten von Helvety verursacht wurden.",
      ],
    },
    {
      heading: "Anwendbares Recht und Streitigkeiten",
      paragraphs: [
        "Diese Bedingungen unterliegen dem materiellen Recht der Schweiz unter Ausschluss der Kollisionsnormen. Vorbehaltlich zwingender Verbraucherschutzbestimmungen, die Ihnen andere Gerichtsstände einräumen können, liegt die ausschliessliche Zuständigkeit bei den Gerichten von Basel-Stadt, Schweiz.",
        "Zwingende Verbraucherrechte, auf die nach anwendbarem Recht nicht verzichtet werden kann, bleiben unberührt.",
      ],
    },
    {
      heading: "Änderungen und Kontakt",
      paragraphs: [
        "Wir können diese Bedingungen aktualisieren, indem wir eine neue Version veröffentlichen und die Annahme der neuen Version verlangen, soweit dies für die fortgesetzte Nutzung verschlüsselter Funktionen erforderlich ist. Die fortgesetzte Nutzung nach erforderlicher Annahme gilt als Zustimmung zu den aktualisierten Bedingungen.",
        "Kontakt: contact@helvety.com. Anbieterangaben: siehe Impressum.",
      ],
    },
  ],
};
