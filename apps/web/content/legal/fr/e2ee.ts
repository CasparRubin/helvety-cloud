import type { LegalDocument } from "../types";

export const e2eeDoc: LegalDocument = {
  slug: "e2ee",
  title: "Avis E2EE / zero-access",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Accusé de réception requis",
      paragraphs: [
        "Vous devez accepter cet avis avant la configuration du chiffrement. Il fait partie intégrante du fonctionnement de Helvety Cloud.",
      ],
    },
    {
      heading: "Zero knowledge pour vos données",
      paragraphs: [
        "Helvety ne peut pas déchiffrer vos données. Il n'existe aucune clé maître d'entreprise, aucun dépôt de clés (key escrow), ni aucun processus de support capable de restaurer le texte en clair chiffré.",
        "L'authentification (OTP e-mail pour la session) est distincte du déverrouillage du chiffrement. Une session connectée ne signifie pas que Helvety peut lire les données chiffrées d'un workspace.",
      ],
    },
    {
      heading: "Aucune récupération par Helvety",
      paragraphs: [
        "Si vous perdez votre capacité passkey/PRF de déverrouillage et tout export de récupération qui vous a été présenté, Helvety ne peut pas récupérer vos données. Des clés perdues signifient la perte permanente de ce contenu chiffré.",
        "Toute clé de récupération et tout wrap présentés lors de la configuration doivent être conservés hors ligne par vos soins. Ne les envoyez jamais par e-mail à Helvety et ne les collez pas dans les canaux de support en espérant une restauration.",
      ],
    },
    {
      heading: "Ce que Helvety peut encore détenir",
      paragraphs: [
        "Helvety peut détenir des identifiants de compte (par exemple l'e-mail), des métadonnées d'appartenance, des clés publiques, des blobs de ciphertext, des tailles, des horodatages et (lorsqu'activé) des compteurs de facturation. Une divulgation contrainte, le cas échéant, ne peut porter que sur ce que Helvety stocke réellement, pas sur du texte en clair que Helvety ne peut pas produire.",
      ],
    },
    {
      heading: "Votre accusé de réception",
      paragraphs: [
        "En acceptant cet avis, vous confirmez comprendre que Helvety ne peut ni lire ni restaurer vos données, que vous êtes responsable de votre contenu et de vos clés, et qu'une perte permanente de données est possible si le matériel de déverrouillage ou de récupération est perdu.",
      ],
    },
  ],
};
