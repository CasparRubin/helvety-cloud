import type { LegalDocument } from "../types";

export const termsDoc: LegalDocument = {
  slug: "terms",
  title: "Conditions d'utilisation",
  versionLabel: "2026-07-26-v2",
  sections: [
    {
      heading: "Accord",
      paragraphs: [
        "Les présentes Conditions d'utilisation (« Conditions ») régissent l'accès à Helvety Cloud et son utilisation sur helvety.cloud (le « Service »), fourni par Helvety by Rubin, Basel, Suisse (« Helvety », « nous »).",
        "En créant un compte, en acceptant ces Conditions dans le produit ou en utilisant le Service, vous acceptez ces Conditions, la Politique d'utilisation acceptable (AUP), la Politique de confidentialité et l'avis E2EE / zero-access. Si vous n'êtes pas d'accord, n'utilisez pas le Service.",
      ],
    },
    {
      heading: "Le service",
      paragraphs: [
        "Helvety Cloud est un service de workspace sans mot de passe, chiffré de bout en bout (E2EE). L'authentification crée une session de compte via des codes e-mail à usage unique. Le déverrouillage du chiffrement et le déchiffrement ont lieu uniquement sur votre appareil, à l'aide de clés dérivées de votre passkey de déverrouillage (WebAuthn PRF) et du matériel connexe détenu côté client.",
        "Helvety ne détient pas de clés maîtres, ne dépose pas les clés de chiffrement (pas d'escrow) et ne peut ni déchiffrer ni restaurer vos données. La perte des identifiants de déverrouillage ou du matériel de récupération peut entraîner la perte permanente de vos données.",
        "Le Service peut évoluer. Nous pouvons ajouter, modifier ou interrompre des fonctionnalités. Les changements matériels de ces Conditions seront reflétés par une nouvelle version de politique que vous pourrez devoir accepter à nouveau avant de continuer à utiliser les fonctionnalités chiffrées.",
      ],
    },
    {
      heading: "Compte",
      paragraphs: [
        "L'accès nécessite une adresse e-mail valide et des codes à usage unique. Helvety Cloud n'utilise pas de mots de passe de compte. Le déverrouillage du chiffrement utilise une passkey distincte sur votre appareil et n'est pas la même chose que la connexion.",
        "Vous devez être en mesure de conclure des contrats contraignants selon le droit applicable. Si vous utilisez le Service pour le compte d'une organisation, vous déclarez avoir l'autorité de lier cette organisation.",
        "Vous êtes responsable de conserver le contrôle de votre e-mail, de votre passkey de déverrouillage, de vos appareils et de tout export de récupération. Helvety ne peut pas réinitialiser l'accès au chiffrement pour vous et ne vous demandera pas d'envoyer des clés de récupération ou du matériel de déverrouillage à Helvety.",
      ],
    },
    {
      heading: "Licence et utilisation acceptable",
      paragraphs: [
        "Sous réserve de ces Conditions et de l'AUP (incorporée par référence), Helvety vous accorde un droit limité, non exclusif, non transférable et révocable d'utiliser le Service à des fins licites.",
        "Helvety peut suspendre ou résilier des comptes en cas de violation de l'AUP, d'abus, de non-paiement (lorsque la facturation s'applique), de risque juridique ou pour protéger le Service. Parce que vos données sont chiffrées de bout en bout, l'application pour le contenu chiffré se limite à des mesures au niveau du compte et du ciphertext (par exemple suspension d'accès ou suppression de blobs chiffrés). Helvety ne peut pas lire le texte en clair pour le modérer.",
      ],
    },
    {
      heading: "Votre contenu et votre responsabilité",
      paragraphs: [
        "Vous conservez la propriété du contenu que vous créez. Vous n'accordez à Helvety que les droits nécessaires pour stocker et transmettre le ciphertext et les métadonnées associées afin d'exploiter le Service.",
        "Vous êtes seul responsable de la licéité du contenu que vous chiffrez et du respect du droit applicable. L'incapacité de Helvety à lire vos données n'autorise pas une utilisation illégale.",
      ],
    },
    {
      heading: "Ce que le service n'est pas",
      paragraphs: [
        "Helvety Cloud n'est pas une sauvegarde en clair de vos données, ni un service de récupération de clés ou de récupération forensique, ni un hébergeur de contenu capable d'inspecter ou de restaurer le contenu chiffré de votre workspace.",
        "Les limites du niveau gratuit, le cas échéant, sont indiquées dans le produit et dans les Conditions de facturation. Les fonctionnalités payantes, lorsqu'elles sont proposées, sont régies par les Conditions de facturation et par les présentes Conditions.",
      ],
    },
    {
      heading: "Disponibilité et support",
      paragraphs: [
        "Nous visons une disponibilité fiable, mais ne garantissons pas un fonctionnement ininterrompu ou sans erreur. La maintenance planifiée, les pannes de tiers (par exemple hébergeurs ou fournisseurs d'authentification) et la force majeure peuvent affecter l'accès.",
        "Le support se limite au fonctionnement du compte et du Service. Le support ne peut ni déchiffrer vos données ni restaurer des clés perdues.",
      ],
    },
    {
      heading: "Avertissements",
      paragraphs: [
        "Dans toute la mesure permise par le droit impératif, le Service est fourni « en l'état » et « selon disponibilité », sans garanties de qualité marchande, d'adéquation à un usage particulier ou de non-contrefaçon.",
        "Helvety ne garantit pas que les données chiffrées resteront récupérables si vous perdez le matériel de déverrouillage ou de récupération, ni que les navigateurs tiers, les magasins de passkeys du système d'exploitation ou les appareils resteront toujours compatibles.",
      ],
    },
    {
      heading: "Limitation de responsabilité",
      paragraphs: [
        "Dans toute la mesure permise par le droit applicable impératif, Helvety et Caspar Camille Rubin (en tant qu'entrepreneur individuel) ne sont pas responsables des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs, ni de la perte de bénéfices, de revenus, de données, de goodwill ou d'opportunités commerciales, découlant du Service ou de ces Conditions ou s'y rapportant, y compris la perte permanente de vos données due à la perte de clés ou de matériel de récupération.",
        "Dans toute la mesure permise par le droit impératif, la responsabilité totale agrégée de Helvety pour toutes les réclamations découlant du Service ou de ces Conditions ou s'y rapportant est limitée au plus élevé de (a) CHF 100 ou (b) les montants que vous avez payés à Helvety pour le Service au cours des douze (12) mois précédant la réclamation (ou CHF 0 si vous n'avez utilisé qu'une offre gratuite).",
        "Rien dans ces Conditions n'exclut ni ne limite une responsabilité qui ne peut être exclue ou limitée en vertu du droit suisse impératif (ou d'autres protections impératives des consommateurs qui vous sont applicables), y compris la responsabilité pour décès ou lésions corporelles causés par négligence lorsque une telle limitation est interdite, ou pour fraude ou faute intentionnelle.",
      ],
    },
    {
      heading: "Indemnisation",
      paragraphs: [
        "Vous défendrez et indemniserez Helvety contre les réclamations, dommages et coûts raisonnables découlant de votre utilisation illicite du Service, de votre contenu chiffré ou de votre violation de ces Conditions ou de l'AUP, sauf dans la mesure causée par la faute intentionnelle de Helvety.",
      ],
    },
    {
      heading: "Droit applicable et litiges",
      paragraphs: [
        "Ces Conditions sont régies par le droit matériel de la Suisse, à l'exclusion des règles de conflit de lois. Sous réserve des protections impératives des consommateurs pouvant vous ouvrir d'autres forums, la compétence exclusive appartient aux tribunaux de Basel-Stadt, Suisse.",
        "Les droits impératifs des consommateurs auxquels il ne peut être renoncé en vertu du droit applicable restent inchangés.",
      ],
    },
    {
      heading: "Modifications et contact",
      paragraphs: [
        "Nous pouvons mettre à jour ces Conditions en publiant une nouvelle version et en exigeant l'acceptation de la nouvelle version lorsque cela est requis pour continuer à utiliser les fonctionnalités chiffrées. L'utilisation continue après l'acceptation requise vaut accord aux Conditions mises à jour.",
        "Contact : contact@helvety.com. Coordonnées du prestataire : voir Impressum.",
      ],
    },
  ],
};
