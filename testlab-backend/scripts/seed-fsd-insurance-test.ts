import {
  EpicPriority,
  EpicStatus,
  FeaturePriority,
  FeatureStatus,
  PrismaClient,
  ProjectStatus,
  StoryPriority,
  StoryStatus,
} from '../prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

type StoryData = {
  id: string;
  role: string;
  action: string;
  objective: string;
  description: string;
};

type FeatureData = {
  id: string;
  title: string;
  description: string;
  stories: StoryData[];
};

type EpicData = {
  id: string;
  title: string;
  description: string;
  features: FeatureData[];
};

type TestStepData = {
  action: string;
  expectedResult: string;
};

type TestCaseData = {
  name: string;
  summary: string;
  preconditions: string[];
  steps: TestStepData[];
};

type TestSuiteData = {
  name: string;
  testCases: TestCaseData[];
  children?: TestSuiteData[];
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const metadata = {
  title:
    'Document de Spécification Fonctionnelle - Système de gestion des contrats d’assurance',
  projectName: 'Plateforme AssurNova - Gestion des Contrats et Sinistres',
  clientName: 'Mutuelle Horizon Assurances',
  version: '1.4',
  date: '2026-04-11',
  author: 'Équipe Produit AssurNova',
};

const approvals = [
  { name: 'Nadia Benali', role: 'Business Analyst (BA)', date: '2026-04-08' },
  { name: 'Julien Morel', role: 'QA Lead', date: '2026-04-09' },
  { name: 'Claire Dumas', role: 'Project Manager (PM)', date: '2026-04-10' },
];

const referenceDocuments = [
  {
    name: 'Spécifications API - Référentiel Contrats v2',
    type: 'Spécification technique',
    attachment: 'docs/api/specification-api-contrats-v2.pdf',
  },
  {
    name: 'Catalogue des Règles de Souscription et de Tarification',
    type: 'Règles métier',
    attachment: 'docs/metier/catalogue-regles-souscription-tarification.xlsx',
  },
  {
    name: 'Guide de Conformité ACPR et LCB-FT',
    type: 'Conformité réglementaire',
    attachment: 'docs/conformite/guide-acpr-lcbft-2026.pdf',
  },
  {
    name: 'Matrice des Garanties et Exclusions Produits',
    type: 'Documentation produit',
    attachment: 'docs/produit/matrice-garanties-exclusions-v5.xlsx',
  },
  {
    name: 'Plan de Tests Fonctionnels et Validation QA',
    type: 'Qualité logicielle',
    attachment: 'docs/qa/plan-tests-fonctionnels-assurnova-v1-4.docx',
  },
];

const assurnovaSuites: TestSuiteData[] = [
  {
    name: 'Gestion des clients',
    testCases: [
      {
        name: 'Créer un client particulier',
        summary: 'Valider la création d\'un client particulier avec les champs obligatoires.',
        preconditions: [
          'L\'utilisateur est authentifié avec un rôle commercial.',
          'Le formulaire de création client est accessible.',
        ],
        steps: [
          {
            action: 'Saisir les informations d\'identité et de contact du client.',
            expectedResult: 'Le formulaire accepte les données et affiche un aperçu cohérent.',
          },
          {
            action: 'Enregistrer le dossier client.',
            expectedResult: 'Le client est créé et référencé dans le portefeuille.',
          },
        ],
      },
      {
        name: 'Mettre à jour un client existant',
        summary: 'Vérifier la mise à jour des coordonnées et du statut de risque.',
        preconditions: [
          'Un client existant est disponible.',
          'Les droits de modification sont accordés.',
        ],
        steps: [
          {
            action: 'Ouvrir la fiche client.',
            expectedResult: 'Les données du client s\'affichent.',
          },
          {
            action: 'Modifier l\'adresse et le numéro de téléphone.',
            expectedResult: 'Les nouvelles valeurs sont enregistrées.',
          },
        ],
      },
    ],
    children: [
      {
        name: 'Création client',
        testCases: [
          {
            name: 'Créer un client entreprise',
            summary: 'Contrôler la création d\'un client entreprise avec identifiant SIRET.',
            preconditions: [
              'Le type entreprise est sélectionné.',
              'Le numéro SIRET est valide.',
            ],
            steps: [
              {
                action: 'Saisir les informations de la société.',
                expectedResult: 'Les informations sont acceptées par le formulaire.',
              },
              {
                action: 'Valider la création.',
                expectedResult: 'Le client entreprise est créé avec succès.',
              },
            ],
          },
        ],
      },
      {
        name: 'Conformité KYC',
        testCases: [
          {
            name: 'Déposer les justificatifs KYC',
            summary: 'Vérifier le dépôt des documents réglementaires nécessaires.',
            preconditions: [
              'Un dossier client est en cours de constitution.',
              'Le dépôt de fichiers est autorisé.',
            ],
            steps: [
              {
                action: 'Téléverser les documents requis.',
                expectedResult: 'Les pièces apparaissent dans la liste du dossier.',
              },
              {
                action: 'Soumettre le dossier pour contrôle.',
                expectedResult: 'Le dossier passe en attente de validation KYC.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Souscription et tarification',
    testCases: [
      {
        name: 'Calculer un devis simple',
        summary: 'Valider le calcul de prime pour un profil standard.',
        preconditions: [
          'Le client est éligible à la souscription.',
          'La grille tarifaire est chargée.',
        ],
        steps: [
          {
            action: 'Saisir les garanties et options choisies.',
            expectedResult: 'Le montant du devis est recalculé.',
          },
          {
            action: 'Confirmer la simulation.',
            expectedResult: 'Le devis est affiché avec les détails.',
          },
        ],
      },
    ],
    children: [
      {
        name: 'Simulation de devis',
        testCases: [
          {
            name: 'Comparer deux scénarios tarifaires',
            summary: 'Comparer deux offres avec franchises différentes.',
            preconditions: ['Deux scénarios de souscription sont définis.'],
            steps: [
              {
                action: 'Lancer la simulation des deux scénarios.',
                expectedResult: 'Les deux primes apparaissent dans le comparateur.',
              },
              {
                action: 'Sélectionner le scénario retenu.',
                expectedResult: 'Le scénario choisi est marqué pour la souscription.',
              },
            ],
          },
        ],
      },
      {
        name: 'Validation d\'offre',
        testCases: [
          {
            name: 'Valider une proposition avant émission',
            summary: 'Contrôler la validation finale d\'une offre de souscription.',
            preconditions: [
              'Une proposition est prête à être validée.',
              'Le validateur possède le bon niveau de délégation.',
            ],
            steps: [
              {
                action: 'Consulter le récapitulatif de la proposition.',
                expectedResult: 'Les garanties, tarifs et options sont visibles.',
              },
              {
                action: 'Valider la proposition.',
                expectedResult: 'La proposition est figée pour émission.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Cycle de vie des contrats',
    testCases: [
      {
        name: 'Consulter un contrat actif',
        summary: 'Vérifier l\'accès au détail d\'un contrat en vigueur.',
        preconditions: ['Un contrat actif existe.'],
        steps: [
          {
            action: 'Ouvrir la fiche contrat.',
            expectedResult: 'Les garanties et échéances sont affichées.',
          },
          {
            action: 'Consulter l\'historique.',
            expectedResult: 'Les versions précédentes sont listées.',
          },
        ],
      },
    ],
    children: [
      {
        name: 'Avenants',
        testCases: [
          {
            name: 'Créer un avenant de garantie',
            summary: 'Contrôler la création d\'un avenant avec impact tarifaire.',
            preconditions: [
              'Le contrat est actif.',
              'L\'utilisateur peut initier un avenant.',
            ],
            steps: [
              {
                action: 'Modifier une garantie existante.',
                expectedResult: 'L\'impact tarifaire est recalculé.',
              },
              {
                action: 'Enregistrer l\'avenant.',
                expectedResult: 'L\'avenant est versionné.',
              },
            ],
          },
        ],
      },
      {
        name: 'Résiliation et renouvellement',
        testCases: [
          {
            name: 'Demander une résiliation',
            summary: 'Vérifier le traitement d\'une demande de résiliation.',
            preconditions: ['Le contrat respecte les conditions de résiliation.'],
            steps: [
              {
                action: 'Soumettre la demande de résiliation.',
                expectedResult: 'La demande est enregistrée et tracée.',
              },
              {
                action: 'Confirmer la fin de contrat.',
                expectedResult: 'Le contrat passe au statut résilié.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Gestion des sinistres',
    testCases: [
      {
        name: 'Déclarer un sinistre simple',
        summary: 'Valider la déclaration d\'un sinistre depuis l\'espace client.',
        preconditions: [
          'Le contrat est actif.',
          'L\'utilisateur est connecté.',
        ],
        steps: [
          {
            action: 'Saisir les circonstances du sinistre.',
            expectedResult: 'Le sinistre brouillon est créé.',
          },
          {
            action: 'Soumettre la déclaration.',
            expectedResult: 'Un numéro de sinistre est attribué.',
          },
        ],
      },
    ],
    children: [
      {
        name: 'Instruction et expertise',
        testCases: [
          {
            name: 'Missionner un expert',
            summary: 'Contrôler l\'affectation d\'un expert sur un dossier sensible.',
            preconditions: ['Un sinistre est ouvert.'],
            steps: [
              {
                action: 'Sélectionner un expert.',
                expectedResult: 'La mission est créée pour l\'expert sélectionné.',
              },
              {
                action: 'Recevoir le rapport.',
                expectedResult: 'Le dossier est enrichi avec l\'expertise.',
              },
            ],
          },
        ],
      },
      {
        name: 'Indemnisation',
        testCases: [
          {
            name: 'Calculer une indemnité',
            summary: 'Vérifier le calcul et la validation de l\'indemnité.',
            preconditions: ['Le dossier est prêt pour règlement.'],
            steps: [
              {
                action: 'Lancer le calcul d\'indemnisation.',
                expectedResult: 'Le montant net à payer est calculé.',
              },
              {
                action: 'Valider le paiement.',
                expectedResult: 'Le paiement est prêt pour exécution.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Paiements et conformité',
    testCases: [
      {
        name: 'Encaisser une prime',
        summary: 'Vérifier le règlement d\'une échéance de prime.',
        preconditions: [
          'Une échéance est due.',
          'Le moyen de paiement est disponible.',
        ],
        steps: [
          {
            action: 'Saisir le paiement.',
            expectedResult: 'Le règlement est enregistré.',
          },
          {
            action: 'Consulter l\'historique des paiements.',
            expectedResult: 'La prime apparaît comme réglée.',
          },
        ],
      },
      {
        name: 'Contrôler un dossier sensible',
        summary: 'Valider la revue conformité d\'un dossier à risque.',
        preconditions: ['Le dossier est marqué sensible.'],
        steps: [
          {
            action: 'Ouvrir la revue conformité.',
            expectedResult: 'Les points de contrôle sont visibles.',
          },
          {
            action: 'Confirmer la conformité.',
            expectedResult: 'Le dossier est validé pour exploitation.',
          },
        ],
      },
    ],
    children: [
      {
        name: 'Relances de paiement',
        testCases: [
          {
            name: 'Déclencher une relance automatique',
            summary: 'Vérifier l\'envoi d\'une relance en cas d\'impayé.',
            preconditions: ['Une échéance est en retard.'],
            steps: [
              {
                action: 'Laisser le moteur de relance s\'exécuter.',
                expectedResult: 'Une relance est générée selon la règle définie.',
              },
              {
                action: 'Consulter le statut de relance.',
                expectedResult: 'Le dossier est marqué comme relancé.',
              },
            ],
          },
        ],
      },
    ],
  },
];

const epics: EpicData[] = [
  {
    id: 'EP-01',
    title: 'Gestion des clients et évaluation du risque',
    description:
      'Création et maintenance du dossier client avec qualification de risque et conformité KYC.',
    features: [
      {
        id: 'FE-01-01',
        title: 'Création et mise à jour du dossier client',
        description:
          'Créer, rechercher et maintenir les informations d’identité et de contact des assurés.',
        stories: [
          {
            id: 'US-01-01-01',
            role: 'conseiller commercial',
            action: 'créer un dossier client complet',
            objective: 'démarrer la souscription rapidement',
            description:
              'Le conseiller saisit les données du client et obtient un identifiant unique.',
          },
          {
            id: 'US-01-01-02',
            role: 'gestionnaire de portefeuille',
            action: 'mettre à jour les coordonnées du client',
            objective: 'garantir la qualité des communications',
            description:
              'Les coordonnées sont versionnées avec piste d’audit.',
          },
          {
            id: 'US-01-01-03',
            role: 'conseiller commercial',
            action: 'rechercher un client sur plusieurs critères',
            objective: 'retrouver le dossier en quelques secondes',
            description:
              'Recherche multi-critères par nom, numéro client, contrat et pièce.',
          },
          {
            id: 'US-01-01-04',
            role: 'responsable d’agence',
            action: 'fusionner les doublons clients',
            objective: 'fiabiliser le référentiel assurés',
            description:
              'Fusion contrôlée avec conservation de l’historique des modifications.',
          },
        ],
      },
      {
        id: 'FE-01-02',
        title: 'Scoring de risque client',
        description:
          'Évaluer automatiquement le niveau de risque à la souscription selon des règles métier.',
        stories: [
          {
            id: 'US-01-02-01',
            role: 'souscripteur',
            action: 'obtenir un score de risque automatique',
            objective: 'accélérer la prise de décision',
            description:
              'Le moteur calcule un score à partir des antécédents et des informations déclarées.',
          },
          {
            id: 'US-01-02-02',
            role: 'souscripteur',
            action: 'consulter les motifs de refus automatique',
            objective: 'justifier la décision auprès du réseau',
            description:
              'Les règles bloquantes sont listées avec leur code et leur impact.',
          },
          {
            id: 'US-01-02-03',
            role: 'responsable risque',
            action: 'ajuster les pondérations de scoring',
            objective: 'aligner l’outil sur la politique de risque',
            description:
              'Paramétrage versionné des coefficients de risque.',
          },
          {
            id: 'US-01-02-04',
            role: 'auditeur interne',
            action: 'consulter l’historique des scores',
            objective: 'vérifier la cohérence des décisions',
            description:
              'Historique des évaluations avec détail des facteurs contributifs.',
          },
        ],
      },
      {
        id: 'FE-01-03',
        title: 'Gestion des justificatifs et conformité KYC',
        description:
          'Collecte et validation des pièces réglementaires nécessaires à la souscription.',
        stories: [
          {
            id: 'US-01-03-01',
            role: 'conseiller commercial',
            action: 'téléverser les justificatifs KYC',
            objective: 'compléter le dossier de conformité',
            description:
              'Téléversement des pièces avec contrôle de format et d’intégrité.',
          },
          {
            id: 'US-01-03-02',
            role: 'analyste conformité',
            action: 'valider les pièces réglementaires',
            objective: 'autoriser la souscription',
            description:
              'Vérification de validité, complétude et conformité des justificatifs.',
          },
          {
            id: 'US-01-03-03',
            role: 'conseiller commercial',
            action: 'être alerté des documents manquants',
            objective: 'relancer le client au bon moment',
            description:
              'Alertes automatiques sur les documents manquants ou expirés.',
          },
          {
            id: 'US-01-03-04',
            role: 'responsable conformité',
            action: 'extraire les dossiers en anomalie KYC',
            objective: 'piloter le risque réglementaire',
            description:
              'Rapport de non-conformité avec priorisation des dossiers sensibles.',
          },
        ],
      },
    ],
  },
  {
    id: 'EP-02',
    title: 'Souscription et tarification des contrats',
    description:
      'Gestion du devis, de l’offre et de la validation des contrats en phase de souscription.',
    features: [
      {
        id: 'FE-02-01',
        title: 'Simulation de devis multi-garanties',
        description:
          'Simuler plusieurs offres tarifaires selon garanties, franchises et options.',
        stories: [
          {
            id: 'US-02-01-01',
            role: 'conseiller commercial',
            action: 'simuler un devis personnalisé',
            objective: 'proposer une offre adaptée au risque',
            description:
              'Le système calcule la prime selon les paramètres de souscription.',
          },
          {
            id: 'US-02-01-02',
            role: 'conseiller commercial',
            action: 'comparer plusieurs scénarios de devis',
            objective: 'aider le client à choisir la meilleure couverture',
            description:
              'Comparateur de scénarios avec écarts de prime et de garanties.',
          },
          {
            id: 'US-02-01-03',
            role: 'souscripteur',
            action: 'appliquer une remise encadrée',
            objective: 'respecter la politique commerciale',
            description:
              'Contrôle des plafonds de remise et des validations requises.',
          },
          {
            id: 'US-02-01-04',
            role: 'responsable produit',
            action: 'paramétrer les coefficients tarifaires',
            objective: 'ajuster la rentabilité des offres',
            description:
              'Mise à jour versionnée des grilles de tarification.',
          },
        ],
      },
      {
        id: 'FE-02-02',
        title: 'Parcours de souscription et validation d’offre',
        description:
          'Suivi des étapes du dossier de souscription jusqu’à l’émission du contrat.',
        stories: [
          {
            id: 'US-02-02-01',
            role: 'client',
            action: 'valider électroniquement une proposition',
            objective: 'finaliser ma souscription à distance',
            description:
              'Parcours de signature électronique sécurisé avec horodatage.',
          },
          {
            id: 'US-02-02-02',
            role: 'conseiller commercial',
            action: 'suivre l’avancement de la souscription',
            objective: 'relancer les dossiers bloqués',
            description:
              'Vue des étapes et des blocages avec actions recommandées.',
          },
          {
            id: 'US-02-02-03',
            role: 'souscripteur',
            action: 'soumettre un dossier sensible pour approbation',
            objective: 'maîtriser l’exposition au risque',
            description:
              'Workflow de validation hiérarchique pour dossiers à seuil élevé.',
          },
          {
            id: 'US-02-02-04',
            role: 'gestionnaire back-office',
            action: 'émettre le contrat après validation',
            objective: 'activer les garanties à date d’effet',
            description:
              'Génération du numéro de contrat et activation des garanties.',
          },
        ],
      },
      {
        id: 'FE-02-03',
        title: 'Contrôles anti-fraude en pré-souscription',
        description:
          'Détection d’anomalies et blocage préventif des dossiers suspects.',
        stories: [
          {
            id: 'US-02-03-01',
            role: 'analyste fraude',
            action: 'détecter les incohérences déclaratives',
            objective: 'prévenir les souscriptions frauduleuses',
            description:
              'Contrôle automatique des signaux faibles de fraude.',
          },
          {
            id: 'US-02-03-02',
            role: 'souscripteur',
            action: 'bloquer temporairement un dossier suspect',
            objective: 'effectuer des vérifications complémentaires',
            description:
              'Mise en quarantaine du dossier avec demande de justificatifs.',
          },
          {
            id: 'US-02-03-03',
            role: 'responsable conformité',
            action: 'recevoir les dossiers à forte suspicion',
            objective: 'assurer le pilotage des risques',
            description:
              'Escalade automatique des dossiers dépassant le seuil fraude.',
          },
          {
            id: 'US-02-03-04',
            role: 'QA Lead',
            action: 'tracer les décisions anti-fraude',
            objective: 'vérifier la cohérence des règles appliquées',
            description:
              'Contrôle QA de la décision attendue versus décision produite.',
          },
        ],
      },
    ],
  },
  {
    id: 'EP-03',
    title: 'Gestion du cycle de vie des contrats',
    description:
      'Gestion des garanties actives, avenants, renouvellements et résiliations.',
    features: [
      {
        id: 'FE-03-01',
        title: 'Activation et consultation des garanties',
        description:
          'Consultation détaillée des couvertures, plafonds, franchises et exclusions.',
        stories: [
          {
            id: 'US-03-01-01',
            role: 'client',
            action: 'consulter mes garanties actives',
            objective: 'connaître mon niveau de couverture',
            description:
              'Affichage des garanties, plafonds et exclusions principales.',
          },
          {
            id: 'US-03-01-02',
            role: 'conseiller relation client',
            action: 'consulter l’historique des modifications de garanties',
            objective: 'répondre précisément aux demandes clients',
            description:
              'Historique versionné des changements contractuels.',
          },
          {
            id: 'US-03-01-03',
            role: 'gestionnaire contrat',
            action: 'suspendre temporairement une garantie',
            objective: 'gérer une situation exceptionnelle',
            description:
              'Suspension avec motif, période et reprise automatique.',
          },
          {
            id: 'US-03-01-04',
            role: 'souscripteur',
            action: 'contrôler la cohérence des garanties sélectionnées',
            objective: 'éviter les combinaisons incompatibles',
            description:
              'Vérification métier des incompatibilités de garanties.',
          },
        ],
      },
      {
        id: 'FE-03-02',
        title: 'Gestion des avenants',
        description: 'Modification du contrat en cours de vie avec impact tarifaire.',
        stories: [
          {
            id: 'US-03-02-01',
            role: 'gestionnaire contrat',
            action: 'créer un avenant',
            objective: 'ajuster les garanties selon le besoin client',
            description:
              'Création d’avenant avec simulation de prime et publication de version.',
          },
          {
            id: 'US-03-02-02',
            role: 'client',
            action: 'demander un avenant en ligne',
            objective: 'modifier mon contrat sans déplacement',
            description:
              'Demande d’avenant via espace client avec suivi de statut.',
          },
          {
            id: 'US-03-02-03',
            role: 'responsable souscription',
            action: 'approuver les avenants sensibles',
            objective: 'maîtriser l’exposition au risque',
            description:
              'Workflow d’approbation des avenants à fort impact.',
          },
          {
            id: 'US-03-02-04',
            role: 'QA Lead',
            action: 'valider les scénarios d’avenants',
            objective: 'garantir la non-régression du calcul de prime',
            description:
              'Campagnes QA de vérification des impacts financiers.',
          },
        ],
      },
      {
        id: 'FE-03-03',
        title: 'Résiliation et renouvellement',
        description: 'Traitement de fin de contrat et offres de renouvellement.',
        stories: [
          {
            id: 'US-03-03-01',
            role: 'client',
            action: 'demander la résiliation de mon contrat',
            objective: 'mettre fin à ma couverture',
            description:
              'Demande de résiliation avec contrôle des dates réglementaires.',
          },
          {
            id: 'US-03-03-02',
            role: 'gestionnaire contrat',
            action: 'traiter les résiliations',
            objective: 'respecter les obligations légales et contractuelles',
            description:
              'Instruction des demandes et application des préavis.',
          },
          {
            id: 'US-03-03-03',
            role: 'conseiller commercial',
            action: 'préparer une offre de renouvellement',
            objective: 'fidéliser le client',
            description:
              'Préparation de proposition avec prime révisée et nouvelles clauses.',
          },
          {
            id: 'US-03-03-04',
            role: 'responsable portefeuille',
            action: 'suivre le taux de renouvellement',
            objective: 'piloter la rétention client',
            description:
              'Tableau de bord de renouvellement, résiliation et causes de départ.',
          },
        ],
      },
    ],
  },
  {
    id: 'EP-04',
    title: 'Gestion des sinistres et indemnisation',
    description:
      'Déclaration, instruction, expertise, décision et indemnisation des sinistres.',
    features: [
      {
        id: 'FE-04-01',
        title: 'Déclaration de sinistre',
        description: 'Collecte des informations de sinistre et suivi client.',
        stories: [
          {
            id: 'US-04-01-01',
            role: 'client',
            action: 'déclarer un sinistre en ligne',
            objective: 'être pris en charge rapidement',
            description:
              'Saisie des circonstances et génération d’un numéro de sinistre.',
          },
          {
            id: 'US-04-01-02',
            role: 'gestionnaire sinistre',
            action: 'enrichir la déclaration',
            objective: 'démarrer l’instruction',
            description:
              'Ajout de pièces et de données techniques de traitement.',
          },
          {
            id: 'US-04-01-03',
            role: 'client',
            action: 'suivre l’état de mon sinistre',
            objective: 'connaître les prochaines étapes',
            description:
              'Affichage des statuts et demandes complémentaires.',
          },
          {
            id: 'US-04-01-04',
            role: 'responsable sinistre',
            action: 'qualifier la gravité initiale',
            objective: 'prioriser le traitement',
            description:
              'Affectation en file selon criticité et SLA.',
          },
        ],
      },
      {
        id: 'FE-04-02',
        title: 'Instruction, expertise et décision',
        description: 'Pilotage de l’expertise et décision d’indemnisation.',
        stories: [
          {
            id: 'US-04-02-01',
            role: 'gestionnaire sinistre',
            action: 'missionner un expert',
            objective: 'évaluer précisément le dommage',
            description:
              'Création et suivi de mission d’expertise.',
          },
          {
            id: 'US-04-02-02',
            role: 'expert',
            action: 'déposer mon rapport',
            objective: 'éclairer la décision d’indemnisation',
            description:
              'Transmission des constats et chiffrages.',
          },
          {
            id: 'US-04-02-03',
            role: 'gestionnaire sinistre',
            action: 'décider l’acceptation ou le refus',
            objective: 'finaliser l’instruction',
            description:
              'Décision motivée selon police et garanties.',
          },
          {
            id: 'US-04-02-04',
            role: 'QA Lead',
            action: 'contrôler les décisions sinistre',
            objective: 'garantir la conformité des traitements',
            description:
              'Revue qualité sur échantillon de dossiers clôturés.',
          },
        ],
      },
      {
        id: 'FE-04-03',
        title: 'Indemnisation et recours',
        description: 'Paiement des indemnités et gestion des recours tiers.',
        stories: [
          {
            id: 'US-04-03-01',
            role: 'gestionnaire sinistre',
            action: 'calculer l’indemnité nette',
            objective: 'préparer le paiement au client',
            description:
              'Application des plafonds, franchises et barèmes.',
          },
          {
            id: 'US-04-03-02',
            role: 'responsable indemnisation',
            action: 'valider les paiements importants',
            objective: 'sécuriser les sorties de fonds',
            description:
              'Validation hiérarchique des paiements au-delà du seuil.',
          },
          {
            id: 'US-04-03-03',
            role: 'comptable assurance',
            action: 'suivre les provisions de sinistres',
            objective: 'fiabiliser les états financiers',
            description:
              'Création, ajustement et reprise des provisions.',
          },
          {
            id: 'US-04-03-04',
            role: 'juriste recours',
            action: 'initier un recours contre un tiers responsable',
            objective: 'récupérer les montants versés',
            description:
              'Gestion du dossier recours et suivi du recouvrement.',
          },
        ],
      },
    ],
  },
  {
    id: 'EP-05',
    title: 'Paiements, recouvrement et conformité opérationnelle',
    description:
      'Encaissement des primes, gestion des impayés et pilotage conformité/QA.',
    features: [
      {
        id: 'FE-05-01',
        title: 'Échéancier et encaissement des primes',
        description: 'Génération des échéances et suivi des règlements.',
        stories: [
          {
            id: 'US-05-01-01',
            role: 'gestionnaire facturation',
            action: 'générer l’échéancier de prime',
            objective: 'planifier les encaissements',
            description:
              'Création des échéances selon périodicité contractuelle.',
          },
          {
            id: 'US-05-01-02',
            role: 'client',
            action: 'régler ma prime en ligne',
            objective: 'maintenir mon contrat en vigueur',
            description:
              'Paiement sécurisé et émission de justificatif.',
          },
          {
            id: 'US-05-01-03',
            role: 'comptable assurance',
            action: 'rapprocher les paiements reçus',
            objective: 'fiabiliser la comptabilité',
            description:
              'Rapprochement automatique et affectation manuelle des écarts.',
          },
          {
            id: 'US-05-01-04',
            role: 'responsable recouvrement',
            action: 'prioriser les encaissements à risque',
            objective: 'réduire les impayés',
            description:
              'Classement des dossiers selon ancienneté et risque de défaut.',
          },
        ],
      },
      {
        id: 'FE-05-02',
        title: 'Traitement des impayés et relances',
        description:
          'Automatisation des relances et gestion des mesures de suspension.',
        stories: [
          {
            id: 'US-05-02-01',
            role: 'gestionnaire recouvrement',
            action: 'déclencher des relances automatiques',
            objective: 'accélérer le paiement des impayés',
            description:
              'Relances multi-canal selon un calendrier paramétré.',
          },
          {
            id: 'US-05-02-02',
            role: 'gestionnaire contrat',
            action: 'suspendre les garanties en cas d’impayé prolongé',
            objective: 'respecter les conditions générales',
            description:
              'Suspension après délais légaux et réactivation après régularisation.',
          },
          {
            id: 'US-05-02-03',
            role: 'conseiller relation client',
            action: 'proposer un plan d’apurement',
            objective: 'accompagner les clients en difficulté',
            description:
              'Mise en place d’un échéancier de rattrapage validé recouvrement.',
          },
          {
            id: 'US-05-02-04',
            role: 'Project Manager',
            action: 'suivre la performance des relances',
            objective: 'améliorer l’efficacité opérationnelle',
            description:
              'KPI de conversion des relances et délais de recouvrement.',
          },
        ],
      },
      {
        id: 'FE-05-03',
        title: 'Contrôles de conformité et reporting QA',
        description:
          'Contrôles transverses conformité et qualité sur les processus assurance.',
        stories: [
          {
            id: 'US-05-03-01',
            role: 'responsable conformité',
            action: 'contrôler les dossiers sensibles',
            objective: 'respecter les obligations réglementaires',
            description:
              'Revue ciblée des dossiers présentant des signaux de non-conformité.',
          },
          {
            id: 'US-05-03-02',
            role: 'QA Lead',
            action: 'générer un rapport de non-régression',
            objective: 'sécuriser les mises en production',
            description:
              'Rapport consolidé des résultats de campagnes QA.',
          },
          {
            id: 'US-05-03-03',
            role: 'auditeur interne',
            action: 'exporter les traces d’audit',
            objective: 'démontrer la conformité des opérations',
            description:
              'Extraction filtrée des journaux d’actions utilisateurs.',
          },
          {
            id: 'US-05-03-04',
            role: 'Project Manager',
            action: 'suivre les indicateurs de qualité et conformité',
            objective: 'arbitrer les priorités produit',
            description:
              'Tableau de bord des écarts, actions correctives et tendances.',
          },
        ],
      },
    ],
  },
];

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function storyTitle(role: string, action: string, objective: string): string {
  return `En tant que ${role}, je veux ${action} afin de ${objective}`;
}

function acceptanceCriteria(role: string, action: string, objective: string): string[] {
  return [
    `Étant donné que le dossier est éligible, quand ${role} lance l'action "${action}", alors le système enregistre l'opération avec succès.`,
    `Étant donné qu'une règle métier est violée, quand ${role} tente "${action}", alors le système bloque l'action et affiche un message explicite.`,
    `Étant donné que l'action "${action}" est validée, quand le traitement se termine, alors l'objectif "${objective}" est atteint et traçable.`
  ];
}

function parseCriterion(text: string): { given: string; when: string; then: string } {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(
    /^Étant donné qu(?:e|['’])\s*(.*?),\s*quand\s+(.*?),\s*alors\s+(.*?)(?:\.)?$/i,
  );

  if (match) {
    return {
      given: match[1].trim(),
      when: match[2].trim(),
      then: match[3].trim(),
    };
  }

  return {
    given: normalized,
    when: 'la procédure est exécutée',
    then: 'le résultat attendu est obtenu',
  };
}

async function createTestCase(testSuiteId: string, testCase: TestCaseData): Promise<void> {
  await prisma.testCase.create({
    data: {
      name: testCase.name,
      summary: testCase.summary,
      testSuiteId,
      preconditions: {
        create: testCase.preconditions.map((content, index) => ({
          content,
          order: index + 1,
        })),
      },
      steps: {
        create: testCase.steps.map((step, index) => ({
          action: step.action,
          expectedResult: step.expectedResult,
          order: index + 1,
        })),
      },
    },
  });
}

async function createSuiteTree(
  projectId: string,
  suites: TestSuiteData[],
  parentId: string | null = null,
): Promise<void> {
  for (let suiteIndex = 0; suiteIndex < suites.length; suiteIndex += 1) {
    const suite = suites[suiteIndex];
    const createdSuite = await prisma.testSuite.create({
      data: {
        name: suite.name,
        projectId,
        order: suiteIndex + 1,
        parentId,
      },
    });

    for (const testCase of suite.testCases) {
      await createTestCase(createdSuite.id, testCase);
    }

    if (suite.children?.length) {
      await createSuiteTree(projectId, suite.children, createdSuite.id);
    }
  }
}

async function seedAssurnovaSuites(projectId: string): Promise<void> {
  await prisma.testSuite.deleteMany({ where: { projectId } });
  await createSuiteTree(projectId, assurnovaSuites);
}

async function seed(): Promise<void> {
  const project = await prisma.project.upsert({
    where: { prefix: 'INS-FSD-2026' },
    create: {
      prefix: 'INS-FSD-2026',
      name: metadata.projectName,
      description: introductionPurpose,
      clientName: metadata.clientName,
      projectOwner: metadata.author,
      status: ProjectStatus.ACTIVE,
      figmaLink: 'https://www.figma.com/file/assurnova-maquette',
      attachment: null,
      openDefects: 0,
      clickupListId: '',
    },
    update: {
      name: metadata.projectName,
      description: introductionPurpose,
      clientName: metadata.clientName,
      projectOwner: metadata.author,
      status: ProjectStatus.ACTIVE,
      figmaLink: 'https://www.figma.com/file/assurnova-maquette',
      attachment: null,
    },
  });

  const projectId = project.id;

  await seedAssurnovaSuites(projectId);

  await prisma.$transaction([
    prisma.documentApproval.deleteMany({ where: { projectId } }),
    prisma.fsdDashboardScreenshot.deleteMany({ where: { projectId } }),
    prisma.fsdReferenceDocument.deleteMany({ where: { projectId } }),
    prisma.fsdNavigationItem.deleteMany({ where: { projectId } }),
    prisma.fsdFunctionalModule.deleteMany({ where: { projectId } }),
    prisma.fsdBusinessRule.deleteMany({ where: { projectId } }),
    prisma.fsdAcceptanceCriteria.deleteMany({ where: { projectId } }),
    prisma.epic.deleteMany({ where: { projectId } }),
  ]);

  for (let i = 0; i < approvals.length; i += 1) {
    const item = approvals[i];
    await prisma.documentApproval.create({
      data: {
        projectId,
        approverName: item.name,
        approverRole: item.role,
        approvalDate: toDate(item.date),
      },
    });
  }

  for (let i = 0; i < referenceDocuments.length; i += 1) {
    const item = referenceDocuments[i];
    await prisma.fsdReferenceDocument.create({
      data: {
        projectId,
        name: item.name,
        type: item.type,
        attachment: item.attachment,
        order: i + 1,
      },
    });
  }

  await prisma.fsdFunctionalModule.createMany({
    data: [
      {
        projectId,
        title: 'Gestion unifiée du cycle de vie des contrats',
        description:
          'Module central orchestrant la souscription, les avenants, la résiliation et le renouvellement des contrats.',
        order: 1,
      },
      {
        projectId,
        title: 'Pilotage des sinistres et de l’indemnisation',
        description:
          'Module de déclaration, instruction, expertise et paiement des sinistres avec suivi des recours.',
        order: 2,
      },
    ],
  });

  await prisma.fsdBusinessRule.createMany({
    data: [
      {
        projectId,
        ruleId: 'BR-001',
        title: 'Validation hiérarchique des dossiers à risque élevé',
        description:
          'Tout dossier dépassant le seuil de délégation doit être approuvé par un manager avant émission du contrat.',
        priority: 'HIGH',
        source: 'Politique de souscription 2026',
        order: 1,
      },
      {
        projectId,
        ruleId: 'BR-002',
        title: 'Suspension des garanties en cas d’impayé prolongé',
        description:
          'Le contrat est suspendu selon les délais légaux si les primes restent impayées après relances.',
        priority: 'HIGH',
        source: 'Conditions générales',
        order: 2,
      },
    ],
  });

  const acceptanceRows: Array<{
    criteriaId: string;
    userStory: string;
    given: string;
    when: string;
    then: string;
    status: string;
    order: number;
  }> = [];

  for (const epic of epics) {
    const createdEpic = await prisma.epic.create({
      data: {
        projectId,
        name: epic.title,
        description: epic.description,
        priority: EpicPriority.HIGH,
        status: EpicStatus.IN_PROGRESS,
      },
    });

    for (const feature of epic.features) {
      const createdFeature = await prisma.feature.create({
        data: {
          epicId: createdEpic.id,
          name: feature.title,
          description: feature.description,
          priority: FeaturePriority.MEDIUM,
          status: FeatureStatus.IN_PROGRESS,
        },
      });

      for (const story of feature.stories) {
        const createdStory = await prisma.userStory.create({
          data: {
            featureId: createdFeature.id,
            name: storyTitle(story.role, story.action, story.objective),
            description: story.description,
            priority: StoryPriority.MEDIUM,
            status: StoryStatus.TO_DO,
          },
        });

        const criteria = acceptanceCriteria(story.role, story.action, story.objective);
        for (let i = 0; i < criteria.length; i += 1) {
          const parsed = parseCriterion(criteria[i]);
          acceptanceRows.push({
            criteriaId: `${story.id}-AC-${i + 1}`,
            userStory: createdStory.id,
            given: parsed.given,
            when: parsed.when,
            then: parsed.then,
            status: 'open',
            order: i + 1,
          });
        }
      }
    }
  }

  for (const [index, row] of acceptanceRows.entries()) {
    await prisma.fsdAcceptanceCriteria.create({
      data: {
        projectId,
        criteriaId: row.criteriaId,
        userStory: row.userStory,
        given: row.given,
        when: row.when,
        then: row.then,
        status: row.status,
        order: index + 1,
      },
    });
  }

  console.log('Seed FSD assurance termine');
  console.log(`Projet: ${metadata.projectName}`);
  console.log(`Approvals: ${approvals.length}`);
  console.log(`Reference documents: ${referenceDocuments.length}`);
  console.log(`Epics: ${epics.length}`);
  console.log('Features: 15');
  console.log('User stories: 60');
  console.log('Acceptance criteria: 180');
}

const introductionPurpose =
  'Ce document formalise les exigences fonctionnelles du système de gestion des contrats d’assurance afin de couvrir l’ensemble du cycle de vie client, de la souscription à l’indemnisation, avec conformité réglementaire et validation QA.';

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
