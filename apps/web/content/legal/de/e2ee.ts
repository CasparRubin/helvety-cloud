import type { LegalDocument } from "../types";

export const e2eeDoc: LegalDocument = {
  slug: "e2ee",
  title: "E2EE-/Zero-Access-Hinweis",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Erforderliche Bestätigung",
      paragraphs: [
        "Sie müssen diesen Hinweis vor der Einrichtung der Verschlüsselung bestätigen. Er ist ein zentraler Bestandteil der Funktionsweise von Helvety Cloud.",
      ],
    },
    {
      heading: "Zero Knowledge für Ihre Daten",
      paragraphs: [
        "Helvety kann Ihre Daten nicht entschlüsseln. Es gibt keinen unternehmensweiten Master-Key, kein Key-Escrow und keinen Support-Ablauf, der verschlüsselten Klartext wiederherstellt.",
        "Authentifizierung (E-Mail-OTP für die Sitzung) ist getrennt vom Entsperren der Verschlüsselung. Eine angemeldete Sitzung bedeutet nicht, dass Helvety verschlüsselte Workspace-Daten lesen kann.",
      ],
    },
    {
      heading: "Keine Wiederherstellung durch Helvety",
      paragraphs: [
        "Wenn Sie Ihre Unlock-Passkey-/PRF-Fähigkeit und jeden Ihnen gezeigten Recovery-Export verlieren, kann Helvety Ihre Daten nicht wiederherstellen. Verlorene Schlüssel bedeuten den dauerhaften Verlust dieses verschlüsselten Inhalts.",
        "Jeden Recovery-Key und Wrap, der Ihnen bei der Einrichtung angezeigt wird, müssen Sie offline speichern. Senden Sie diese niemals per E-Mail an Helvety und fügen Sie sie nicht in Support-Kanäle ein, in der Erwartung einer Wiederherstellung.",
      ],
    },
    {
      heading: "Was Helvety weiterhin speichern kann",
      paragraphs: [
        "Helvety kann Konto-Identifikatoren (zum Beispiel E-Mail), Mitgliedschaftsmetadaten, öffentliche Schlüssel, Ciphertext-Blobs, Grössen, Zeitstempel und (falls aktiviert) Abrechnungszähler speichern. Eine allfällige herausgabepflichtige Offenlegung kann nur das betreffen, was Helvety tatsächlich speichert, nicht Klartext, den Helvety nicht erzeugen kann.",
      ],
    },
    {
      heading: "Ihre Bestätigung",
      paragraphs: [
        "Mit der Annahme dieses Hinweises bestätigen Sie, dass Sie verstehen, dass Helvety Ihre Daten weder lesen noch wiederherstellen kann, dass Sie für Ihre Inhalte und Schlüssel verantwortlich sind und dass ein dauerhafter Datenverlust möglich ist, wenn Unlock- oder Recovery-Material verloren geht.",
      ],
    },
  ],
};
