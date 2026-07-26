import type { LegalDocument } from "../types";

export const billingDoc: LegalDocument = {
  slug: "billing",
  title: "Abrechnungsbedingungen",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Status",
      paragraphs: [
        "Helvety Cloud bietet einen kostenlosen Plan und einen bezahlten Pro-Plan pro Workspace, abgewickelt über Stripe, sowie optionale bezahlte Add-ons, die bestimmte Limits erhöhen. Es wird nichts belastet, es sei denn, ein Workspace-Inhaber startet ausdrücklich Checkout (wo der Preis vor jeder Belastung angezeigt wird) oder ändert bezahlte Add-ons.",
        "Workspace-Inhaber können einen von Helvety ausgegebenen Rabatt- oder Complimentary-Code einlösen. Ein 100%-Complimentary-Code gewährt Pro-Zugang für diesen Workspace, ohne eine Zahlungsmethode zu erheben. Teilrabatt-Codes reduzieren den Preis von Pro und bezahlten Add-ons für diesen Workspace, wenn Checkout oder Abrechnungsaktualisierungen über Stripe laufen.",
        "Diese Bedingungen begründen selbst keine Kaufpflicht. Der kostenlose Plan bleibt innerhalb seiner angegebenen Limits ohne Zahlungsmethode nutzbar.",
      ],
    },
    {
      heading: "Kostenloser Plan",
      paragraphs: [
        "Der kostenlose Plan gilt mit Fair-Use-Limits pro Workspace (zum Beispiel Anzahl Projekte, Mitglieder, Tasks pro Projekt, Notes und Contacts). Datei-Uploads und Dokumentenspeicher sind im kostenlosen Plan nicht verfügbar, auch nicht in kostenlosen Personal-Workspaces. Aktuelle Limits werden im Produkt dort angezeigt, wo sie gelten, bevor ein Limit eine Aktion blockiert, nicht nach einer Zahlung.",
        "Jedes Konto darf zwei Free-Tier-Workspaces besitzen (einschliesslich des Personal-Workspace). Zusätzliche eigene Workspaces erfordern Pro (bezahlt oder complimentary) für diesen Workspace.",
        "Wenn ein bezahlter oder complimentary Pro-Workspace endet und Sie danach mehr als zwei Free-Tier-Workspaces besitzen würden, kann Helvety die überschüssigen Workspaces soft-locken: bestehender verschlüsselter Inhalt bleibt zum Öffnen, Bearbeiten, Herunterladen, Exportieren und Löschen verfügbar, aber das Erstellen neuer Ressourcen in diesem Workspace wird pausiert, bis Sie ihn auf Pro upgraden oder die Anzahl eigener Free-Workspaces wieder innerhalb der Zulassung reduzieren. Helvety löscht Ciphertext nicht und hält wrapped Keys nicht allein deshalb zurück, weil ein Workspace soft-gelockt ist.",
        "Helvety kann Free-Limits mit Hinweis im Produkt ändern. Fortgesetzte Nutzung nach einer Änderung bedeutet, dass Sie die aktualisierten Limits akzeptieren. Senkungen der Caps löschen Ihre Daten nicht; neue Creates können blockiert werden, bis Sie unter dem neuen Cap liegen oder upgraden.",
      ],
    },
    {
      heading: "Bezahlte Pläne und Add-ons",
      paragraphs: [
        "Abonnements sind workspace-bezogen: der Workspace-Inhaber bezahlt den Pro-Plan dieses Workspace und etwaige Add-ons auf diesem Workspace.",
        "Pro umfasst höhere Betriebslimits sowie verschlüsselten Datei- und Dokumentenspeicher für diesen Workspace, innerhalb der im Produkt angezeigten Speicher-, Dateigrössen- und Datei-pro-Task-Limits. Hochgeladene Dateien werden ende-zu-ende auf Ihrem Gerät verschlüsselt; Helvety speichert nur Ciphertext und betriebliche Grössenzähler und kann Dateiinhalte nicht entschlüsseln.",
        "Add-ons ermöglichen den Kauf zusätzlicher Kapazität für einzelne Zähler (zum Beispiel mehr Projekte), ohne andere Limits zu erhöhen. Add-ons erfordern ein aktives bezahltes Pro-Abonnement auf diesem Workspace; Complimentary-Workspaces erhalten bereits ungemeterte Betriebslimits, wie im Produkt angezeigt.",
        "Preise, Abrechnungsintervalle (einschliesslich jährlicher Pro-Abrechnung, sofern angeboten), Verlängerungen, Steuern und ein allfällig angewandter Rabattprozentsatz werden bei Stripe Checkout oder im Billing-Portal angezeigt. Sofern nicht anders angegeben, verlängern sich Abonnements automatisch, bis sie gekündigt werden.",
        "Sie können die Verlängerung jederzeit im Stripe-Billing-Portal kündigen (erreichbar über die Workspace-Abrechnungseinstellungen); der Zugang zu bezahlten Limits besteht bis zum Ende des bereits bezahlten Zeitraums fort, sofern nicht anders angegeben. Keine Kündigungsgebühren, keine Retention-Tricks. Complimentary-Zugang kann von Helvety widerrufen werden; Ciphertext wird nicht allein deshalb gelöscht, weil eine Complimentary-Gewährung endet. Danach können Free-Limits und, soweit anwendbar, Soft-Lock-Create-Gates gelten.",
        "Rechnungen und Zahlungsabwicklung nutzen Stripe (siehe Unterauftragsverarbeiter). Helvety benötigt für die Abrechnung niemals verschlüsselten Klartext oder rohe Verschlüsselungsschlüssel. Zähler verwenden nur Klartext-Betriebszählungen und Ciphertext-Bytegrössen.",
      ],
    },
    {
      heading: "Verbraucherwiderruf",
      paragraphs: [
        "Wenn zwingendes Verbraucherrecht Ihnen ein Widerrufsrecht für digitale Dienste einräumt, wird Helvety dieses Recht wie vorgeschrieben achten. Wenn Sie ausdrücklich die sofortige Erbringung eines digitalen Dienstes verlangen und den Verlust des Widerrufs nach Beginn der Erbringung anerkennen, kann Helvety sich auf diese Anerkennung stützen, soweit gesetzlich zulässig.",
      ],
    },
    {
      heading: "Fehlgeschlagene Zahlungen und Soft-Lock",
      paragraphs: [
        "Wenn ein bezahlter Plan aktiv ist und die Zahlung fehlschlägt, kann Helvety Belastungen erneut versuchen und nach Mitteilung bezahlte Entitlements beenden, sodass Free-Plan-Limits gelten. Wenn Sie dadurch über der Free-Zulassung für eigene Workspaces liegen, können überschüssige Workspaces wie unter Kostenloser Plan beschrieben soft-gelockt werden: bestehender Inhalt bleibt zugänglich; neue Creates werden pausiert. Ciphertext kann gemäss Kontoschliessungs- und Aufbewahrungspraxis in der Datenschutzerklärung aufbewahrt oder gelöscht werden. Helvety kann ihn weiterhin nicht entschlüsseln.",
      ],
    },
    {
      heading: "Kontakt",
      paragraphs: [
        "Fragen zur Abrechnung: contact@helvety.com. Anbieterangaben: siehe Impressum.",
      ],
    },
  ],
};
