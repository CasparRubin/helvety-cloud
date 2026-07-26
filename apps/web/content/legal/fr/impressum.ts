import type { LegalDocument } from "../types";

export const impressumDoc: LegalDocument = {
  slug: "impressum",
  title: "Impressum",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Prestataire de services",
      paragraphs: [
        "Prestataire du service Helvety Cloud sur helvety.cloud :",
        "Helvety by Rubin",
        "Titulaire : Caspar Camille Rubin",
        "Forme juridique : Einzelunternehmen suisse (entreprise individuelle)",
        "Adresse enregistrée : Holeestrasse 116, 4054 Basel, Suisse",
        "UID : CHE-356.266.592",
        "Registre du commerce : CH-270.1.021.985-7 (Basel-Stadt)",
        "Contact : contact@helvety.com",
      ],
    },
    {
      heading: "Responsabilité du contenu",
      paragraphs: [
        "Les métadonnées de compte et de service sont traitées comme décrit dans la Politique de confidentialité. Vos données dans Helvety Cloud sont chiffrées de bout en bout : Helvety ne peut ni lire, ni déchiffrer, ni restaurer le texte en clair. Cet Impressum ne crée aucune obligation ni capacité de récupérer le contenu utilisateur chiffré.",
      ],
    },
  ],
};
