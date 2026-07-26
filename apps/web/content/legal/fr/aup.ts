import type { LegalDocument } from "../types";

export const aupDoc: LegalDocument = {
  slug: "aup",
  title: "Politique d'utilisation acceptable",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Objet",
      paragraphs: [
        "La présente Politique d'utilisation acceptable (« AUP ») fixe les règles d'utilisation de Helvety Cloud. Elle fait partie des Conditions d'utilisation.",
      ],
    },
    {
      heading: "Utilisations interdites",
      paragraphs: [
        "Vous ne devez pas utiliser Helvety Cloud pour une activité illégale, y compris le stockage ou la distribution de contenu illégal, de matériel d'abus sexuel d'enfants, de contenu terroriste lorsqu'il est interdit, le harcèlement, la fraude, la distribution de logiciels malveillants, l'accès non autorisé à des systèmes, ou la violation des droits de propriété intellectuelle ou de la vie privée d'autrui.",
        "Vous ne devez pas tenter de perturber le Service, de surcharger l'infrastructure au-delà d'un usage ordinaire, de scraper ou de collecter des comptes sans autorisation, de sonder des systèmes sauf dans le cadre d'une divulgation responsable coordonnée auprès de Helvety, ou de contourner des limites techniques ou de compte.",
        "Vous ne devez pas vous présenter à tort comme affilié à Helvety ni utiliser le Service pour envoyer du spam ou des communications trompeuses.",
      ],
    },
    {
      heading: "Application sans lecture du contenu chiffré",
      paragraphs: [
        "Parce que vos données sont chiffrées de bout en bout, Helvety ne peut pas modérer le texte en clair. Les mesures d'application se limitent au niveau du compte et du ciphertext (par exemple suspension de comptes, suppression de blobs ou de workspaces chiffrés, ou blocage d'accès), sur la base de signaux que Helvety peut voir, tels que l'abus d'API, une activité de compte illégale, ou des demandes légitimes portant sur des métadonnées détenues par Helvety.",
        "Helvety ne prétend pas pouvoir inspecter ou « nettoyer » le contenu chiffré.",
      ],
    },
    {
      heading: "Votre responsabilité",
      paragraphs: [
        "Vous êtes responsable de la licéité du contenu que vous chiffrez et du respect du droit applicable. L'incapacité de Helvety à lire vos données n'autorise pas une utilisation illégale.",
        "Si Helvety croit raisonnablement que votre utilisation crée un risque juridique ou nuit au Service ou à des tiers, Helvety peut suspendre ou résilier l'accès sans préavis lorsque l'urgence le justifie raisonnablement.",
      ],
    },
    {
      heading: "Signalement",
      paragraphs: [
        "Abus ou notifications juridiques concernant un compte/des métadonnées sur lesquels Helvety peut agir : contact@helvety.com. Les signalements qui exigeraient que Helvety lise du texte en clair chiffré ne peuvent pas être satisfaits ; Helvety ne peut agir que sur ce qu'il stocke.",
      ],
    },
  ],
};
