import type { LegalDocument } from "../types";

export const aupDoc: LegalDocument = {
  slug: "aup",
  title: "Nutzungsrichtlinie",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Zweck",
      paragraphs: [
        "Diese Nutzungsrichtlinie («AUP») legt Regeln für die Nutzung von Helvety Cloud fest. Sie ist Bestandteil der Nutzungsbedingungen.",
      ],
    },
    {
      heading: "Unzulässige Nutzung",
      paragraphs: [
        "Sie dürfen Helvety Cloud nicht für illegale Aktivitäten nutzen, einschliesslich Speicherung oder Verbreitung illegaler Inhalte, Materialien zum sexuellen Missbrauch von Kindern, Terrorismusinhalte soweit verboten, Belästigung, Betrug, Verbreitung von Malware, unbefugten Zugriff auf Systeme oder Verletzung geistiger Eigentums- oder Datenschutzrechte Dritter.",
        "Sie dürfen den Dienst nicht stören, die Infrastruktur über die gewöhnliche Nutzung hinaus überlasten, Konten ohne Berechtigung scrapen oder ernten, Systeme ausser im Rahmen einer koordinierten verantwortungsvollen Offenlegung gegenüber Helvety sondieren oder technische bzw. Kontolimiten umgehen.",
        "Sie dürfen eine Zugehörigkeit zu Helvety nicht falsch darstellen und den Dienst nicht zum Versand von Spam oder irreführenden Mitteilungen nutzen.",
      ],
    },
    {
      heading: "Durchsetzung ohne Lesen verschlüsselter Inhalte",
      paragraphs: [
        "Weil Ihre Daten ende-zu-ende-verschlüsselt sind, kann Helvety Klartext nicht moderieren. Durchsetzungsoptionen beschränken sich auf Massnahmen auf Konto- und Ciphertext-Ebene (zum Beispiel Sperren von Konten, Löschen verschlüsselter Blobs oder Workspaces oder Sperren des Zugriffs) auf Grundlage von Signalen, die Helvety sehen kann, etwa Missbrauch von APIs, illegale Kontoaktivität oder rechtmässige Anfragen zu Metadaten, die Helvety hält.",
        "Helvety beansprucht nicht die Fähigkeit, verschlüsselte Inhalte einzusehen oder zu «bereinigen».",
      ],
    },
    {
      heading: "Ihre Verantwortung",
      paragraphs: [
        "Sie sind für die Rechtmässigkeit der von Ihnen verschlüsselten Inhalte und für die Einhaltung des anwendbaren Rechts verantwortlich. Die Unfähigkeit von Helvety, Ihre Daten zu lesen, legitimiert keine illegale Nutzung.",
        "Wenn Helvety vernünftigerweise annimmt, dass Ihre Nutzung ein rechtliches Risiko schafft oder dem Dienst oder anderen schadet, kann Helvety den Zugang ohne vorherige Ankündigung sperren oder beenden, wenn die Dringlichkeit dies vernünftigerweise erfordert.",
      ],
    },
    {
      heading: "Meldung",
      paragraphs: [
        "Missbrauch oder rechtliche Mitteilungen zu Konto/Metadaten, auf die Helvety reagieren kann: contact@helvety.com. Meldungen, die erfordern, dass Helvety verschlüsselten Klartext liest, können nicht erfüllt werden; Helvety kann nur auf das reagieren, was es speichert.",
      ],
    },
  ],
};
