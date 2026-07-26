import type { LegalDocument } from "../types";

export const billingDoc: LegalDocument = {
  slug: "billing",
  title: "Conditions de facturation",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Statut",
      paragraphs: [
        "Helvety Cloud propose un plan gratuit et un plan Pro payant par workspace, traités via Stripe, ainsi que des add-ons payants optionnels qui augmentent certaines limites. Aucun débit n'est effectué sauf si un propriétaire de workspace lance explicitement Checkout (où le prix est affiché avant tout débit) ou modifie des add-ons payants.",
        "Les propriétaires de workspace peuvent utiliser un code de réduction ou un code complimentary émis par Helvety. Un code complimentary à 100 % accorde l'accès Pro pour ce workspace sans collecter de moyen de paiement. Les codes de réduction partielle réduisent le prix de Pro et des add-ons payants pour ce workspace lorsque Checkout ou les mises à jour de facturation passent par Stripe.",
        "Ces conditions ne créent pas à elles seules une obligation d'achat. Le plan gratuit reste utilisable dans ses limites indiquées sans moyen de paiement.",
      ],
    },
    {
      heading: "Plan gratuit",
      paragraphs: [
        "Le plan gratuit applique des limites d'usage raisonnable par workspace (par exemple nombres de projets, membres, tâches par projet, notes et contacts). Les téléversements de fichiers et le stockage de documents ne sont pas disponibles sur le plan gratuit, y compris dans les workspaces Personal gratuits. Les limites actuelles sont affichées dans le produit là où elles s'appliquent, avant qu'une limite ne bloque une action, et non après un paiement.",
        "Chaque compte peut posséder deux workspaces de niveau gratuit (y compris le workspace Personal). Des workspaces supplémentaires en propriété exigent Pro (payé ou complimentary) pour ce workspace.",
        "Si un workspace Pro payé ou complimentary se termine et que vous posséderiez alors plus de deux workspaces de niveau gratuit, Helvety peut soft-locker le ou les workspaces en trop : le contenu chiffré existant reste disponible à l'ouverture, à l'édition, au téléchargement, à l'export et à la suppression, mais la création de nouvelles ressources dans ce workspace est suspendue jusqu'à ce que vous le passiez à Pro ou que vous réduisiez le nombre de workspaces gratuits possédés dans la limite autorisée. Helvety ne supprime pas le ciphertext et ne retient pas les clés wrappées uniquement parce qu'un workspace est soft-locké.",
        "Helvety peut modifier les limites gratuites avec un avis dans le produit. L'utilisation continue après une modification signifie que vous acceptez les limites mises à jour. Des plafonds abaissés ne suppriment pas vos données ; de nouvelles créations peuvent être bloquées jusqu'à ce que vous soyez sous le nouveau plafond ou que vous passiez à une offre supérieure.",
      ],
    },
    {
      heading: "Plans payants et add-ons",
      paragraphs: [
        "Les abonnements sont liés au workspace : le propriétaire du workspace paie le plan Pro de ce workspace et tout add-on sur ce workspace.",
        "Pro inclut des limites opérationnelles plus élevées ainsi que le stockage chiffré de fichiers et de documents pour ce workspace, dans les limites de stockage, de taille par fichier et de fichiers par tâche affichées dans le produit. Les fichiers téléversés sont chiffrés de bout en bout sur votre appareil ; Helvety ne stocke que le ciphertext et des compteurs opérationnels de taille, et ne peut pas déchiffrer le contenu des fichiers.",
        "Les add-ons permettent d'acheter une capacité supplémentaire pour des compteurs individuels (par exemple plus de projets) sans relever des limites sans rapport. Les add-ons exigent un abonnement Pro payé actif sur ce workspace ; les workspaces complimentary reçoivent déjà des plafonds opérationnels non mesurés, comme indiqué dans le produit.",
        "Les prix, intervalles de facturation (y compris la facturation annuelle Pro lorsqu'elle est proposée), renouvellements, taxes et tout pourcentage de réduction appliqué sont affichés lors de Stripe Checkout ou dans le portail de facturation. Sauf indication contraire, les abonnements se renouvellent automatiquement jusqu'à résiliation.",
        "Vous pouvez annuler le renouvellement à tout moment dans le portail de facturation Stripe (accessible depuis les paramètres de facturation du workspace) ; l'accès aux limites payantes se poursuit jusqu'à la fin de la période déjà achetée, sauf indication contraire. Aucuns frais d'annulation, aucun artifice de rétention. L'accès complimentary peut être révoqué par Helvety ; le ciphertext n'est pas supprimé uniquement parce qu'une attribution complimentary prend fin. Les limites gratuites et, le cas échéant, les portes de création en soft-lock peuvent alors s'appliquer.",
        "Les factures et le traitement des paiements utilisent Stripe (voir Sous-traitants). Helvety n'a jamais besoin de texte en clair chiffré ni de clés de chiffrement brutes pour la facturation. Les compteurs n'utilisent que des comptes opérationnels en clair et des tailles en octets de ciphertext.",
      ],
    },
    {
      heading: "Droit de rétractation du consommateur",
      paragraphs: [
        "Si le droit de la consommation impératif vous confère un droit de rétractation pour des services numériques, Helvety respectera ce droit comme requis. Lorsque vous demandez expressément l'exécution immédiate d'un service numérique et reconnaissez la perte du droit de rétractation après le début de l'exécution, Helvety peut s'appuyer sur cette reconnaissance lorsque la loi le permet.",
      ],
    },
    {
      heading: "Échecs de paiement et soft-lock",
      paragraphs: [
        "Si un plan payant est actif et que le paiement échoue, Helvety peut retenter les débits et peut mettre fin aux droits payants après avis, de sorte que les limites du plan gratuit s'appliquent. Si cela vous laisse au-delà de l'allocation de workspaces gratuits possédés, les workspaces en trop peuvent être soft-lockés comme décrit sous Plan gratuit : le contenu existant reste accessible ; les nouvelles créations sont suspendues. Le ciphertext peut être conservé ou supprimé selon les pratiques de clôture de compte et de conservation de la Politique de confidentialité. Helvety ne peut toujours pas le déchiffrer.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions de facturation : contact@helvety.com. Coordonnées du prestataire : voir Impressum.",
      ],
    },
  ],
};
