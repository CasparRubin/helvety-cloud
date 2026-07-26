import type { LegalDocument } from "../types";

export const subprocessorsDoc: LegalDocument = {
  slug: "subprocessors",
  title: "Sous-traitants",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Liste vivante",
      paragraphs: [
        "Helvety fait appel aux sous-traitants suivants pour exploiter Helvety Cloud. Cette liste peut évoluer ; les changements matériels seront reflétés ici et, le cas échéant, communiqués conformément à la Politique de confidentialité.",
      ],
    },
    {
      heading: "Sous-traitants actuels",
      paragraphs: [
        "Supabase : authentification et base de données Postgres. Le projet helvety-cloud se trouve dans eu-central-2 (Zurich). Traite les métadonnées d'e-mail/auth de compte et le ciphertext/métadonnées comme décrit dans la Politique de confidentialité.",
        "Vercel : hébergement de l'application. Traite le trafic HTTP et les journaux d'hébergement pour l'application web.",
        "Livraison d'e-mails via Supabase Auth : OTP et e-mails d'authentification. La région dépend de la configuration e-mail de Supabase Auth.",
        "Stripe : traitement des paiements lorsque la facturation est activée. Traite uniquement l'identité de facturation et les métadonnées de paiement, jamais le texte en clair chiffré ni les clés de chiffrement brutes. Aucun débit tant que les plans payants ne sont pas activés dans le produit.",
      ],
    },
    {
      heading: "Mises à jour",
      paragraphs: [
        "Nous pouvons mettre à jour cette liste lorsque les fournisseurs changent. L'utilisation continue du Service après publication vaut notification de la liste mise à jour, sous réserve des exigences de la Politique de confidentialité pour les changements matériels.",
      ],
    },
  ],
};
