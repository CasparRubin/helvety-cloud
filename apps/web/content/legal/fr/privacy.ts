import type { LegalDocument } from "../types";

export const privacyDoc: LegalDocument = {
  slug: "privacy",
  title: "Politique de confidentialité",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Responsable du traitement",
      paragraphs: [
        "Responsable du traitement des données personnelles pour Helvety Cloud : Helvety by Rubin (Caspar Camille Rubin), Holeestrasse 116, 4054 Basel, Suisse. UID CHE-356.266.592.",
        "Contact pour les demandes relatives à la vie privée : contact@helvety.com.",
      ],
    },
    {
      heading: "Champ d'application",
      paragraphs: [
        "La présente Politique de confidentialité explique comment Helvety traite les données personnelles lorsque vous utilisez helvety.cloud. Elle s'applique en vertu de la Loi fédérale suisse sur la protection des données (LPD / nDSG). Si vous êtes dans l'EEE/Royaume-Uni et que Helvety vous propose le Service, Helvety vise également à respecter les principes applicables du RGPD/UK GDPR pour les données personnelles que Helvety traite effectivement.",
        "Le contenu chiffré (ciphertext) est opaque pour Helvety. Helvety n'est pas responsable du traitement du texte en clair auquel Helvety n'a pas accès.",
      ],
    },
    {
      heading: "Données traitées par Helvety (compte / métadonnées)",
      paragraphs: [
        "Adresse e-mail et métadonnées d'authentification (par exemple livraison d'OTP via Supabase Auth).",
        "Profil et enregistrements d'appartenance (identifiant utilisateur, rôles d'appartenance au workspace, horodatages).",
        "Matériel cryptographique public nécessaire au produit (par exemple clés publiques utilisateur) et blobs wrappés ou chiffrés que Helvety ne peut pas déchiffrer.",
        "Enregistrements d'acceptation des politiques (quelles versions de politiques vous avez acceptées et quand).",
        "Journaux techniques raisonnablement nécessaires pour exploiter et sécuriser le Service (par exemple adresses IP dans les journaux d'hébergement/auth, métadonnées de requêtes).",
        "Métadonnées de facturation lorsque des plans payants sont activés (par exemple statut d'abonnement et compteurs). La facturation n'inclut jamais de texte en clair chiffré ni de clés de chiffrement brutes.",
      ],
    },
    {
      heading: "Données auxquelles Helvety n'a pas accès",
      paragraphs: [
        "Le ciphertext du contenu chiffré est opaque pour Helvety. Le personnel, les administrateurs de base de données et les rôles de base de données privilégiés ne peuvent pas déchiffrer les titres, corps ou autre texte en clair à partir de vos données chiffrées.",
        "Helvety ne reçoit pas la sortie PRF, les clés de déverrouillage, le texte en clair des clés de récupération ni les clés privées brutes. Helvety ne peut pas restaurer vos données si vous perdez le matériel de déverrouillage ou de récupération.",
      ],
    },
    {
      heading: "Finalités et bases juridiques",
      paragraphs: [
        "Fournir et sécuriser le Service (contrat / préparation du contrat ; intérêts légitimes dans un fonctionnement sécurisé).",
        "Vous authentifier et gérer votre compte (contrat).",
        "Enregistrer les acceptations de politiques (obligation légale / contrat / intérêts légitimes à prouver le consentement et l'acceptation des conditions).",
        "Communiquer des avis liés au service (contrat / intérêts légitimes).",
        "Se conformer au droit et répondre aux demandes légitimes limitées aux données détenues par Helvety (obligation légale).",
        "Facturation et comptabilité lorsque des plans payants s'appliquent (contrat / obligation légale).",
      ],
    },
    {
      heading: "Sous-traitants",
      paragraphs: [
        "Helvety fait appel aux sous-traitants listés sur la page Sous-traitants (notamment Supabase pour l'auth/base de données à Zurich, Vercel pour l'hébergement, la livraison d'e-mails utilisée pour les OTP d'auth, et Stripe lorsque la facturation est activée). Les sous-traitants agissent sur instructions de Helvety pour le Service.",
      ],
    },
    {
      heading: "Transferts internationaux",
      paragraphs: [
        "La base de données et l'auth principales de ce Service sont hébergées dans l'UE (Zurich / eu-central-2). L'hébergement et les outils d'e-mail peuvent impliquer un traitement dans d'autres régions selon la configuration des fournisseurs. Le cas échéant, Helvety s'appuie sur des mécanismes de transfert appropriés offerts par ces fournisseurs (par exemple clauses contractuelles types) et sur des garanties contractuelles.",
      ],
    },
    {
      heading: "Conservation",
      paragraphs: [
        "Les données de compte et d'appartenance sont conservées pendant que votre compte est actif et pendant une période raisonnable ensuite, selon les besoins de sécurité, de gestion des litiges et de conservation légale.",
        "Le ciphertext et les métadonnées de chiffrement associées sont conservés tant qu'ils sont liés à votre compte/workspaces ou jusqu'à suppression via le Service ou les processus de clôture de compte.",
        "Les enregistrements d'acceptation des politiques sont conservés pour prouver quelles conditions s'appliquaient.",
        "Les journaux sont conservés pendant une période opérationnelle limitée, sauf si une période plus longue est requise pour des raisons de sécurité ou juridiques.",
      ],
    },
    {
      heading: "Vos droits",
      paragraphs: [
        "Selon le droit applicable, vous pouvez disposer de droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité concernant les données personnelles que Helvety traite à votre sujet.",
        "Pour exercer vos droits, écrivez à contact@helvety.com. Helvety peut devoir vérifier votre identité. Helvety ne peut pas produire de texte en clair chiffré qu'il n'a jamais détenu.",
        "L'effacement des données de compte ne recrée pas les clés de chiffrement perdues. La suppression du ciphertext retire les blobs stockés ; cela ne signifie pas que Helvety a jamais détenu du texte en clair.",
        "Vous pouvez déposer une plainte auprès du PFPDT suisse ou d'une autre autorité de contrôle compétente, le cas échéant.",
      ],
    },
    {
      heading: "Enfants",
      paragraphs: [
        "Le Service ne s'adresse pas aux enfants de moins de 16 ans. N'utilisez pas le Service si vous n'avez pas l'âge requis dans votre juridiction pour consentir au traitement des données et aux contrats.",
      ],
    },
    {
      heading: "Modifications",
      paragraphs: [
        "Nous pouvons mettre à jour cette Politique de confidentialité en publiant une nouvelle version. Les changements matériels qui affectent l'acceptation conditionnée à l'inscription utiliseront une nouvelle chaîne de version que vous devrez accepter avant de poursuivre la configuration du chiffrement ou l'utilisation lorsque celle-ci est conditionnée.",
      ],
    },
  ],
};
