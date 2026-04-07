import {
  EpicPriority,
  EpicStatus,
  FeaturePriority,
  FeatureStatus,
  PrismaClient,
  ProjectStatus,
  StoryPriority,
  StoryStatus,
} from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the Prisma seed script.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

type TestStepSeed = {
  action: string;
  expectedResult: string;
};

type TestCaseSeed = {
  name: string;
  summary: string;
  preconditions: string[];
  steps: TestStepSeed[];
};

type TestSuiteSeed = {
  name: string;
  testCases: TestCaseSeed[];
};

type UserStorySeed = {
  name: string;
  description: string;
  priority: StoryPriority;
  status: StoryStatus;
  creationDate: Date;
};

type FeatureSeed = {
  name: string;
  description: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  creationDate: Date;
  userStories: UserStorySeed[];
};

type EpicSeed = {
  name: string;
  description: string;
  priority: EpicPriority;
  status: EpicStatus;
  creationDate: Date;
  features: FeatureSeed[];
};

type ProjectSeed = {
  prefix: string;
  name: string;
  description: string;
  clientName: string;
  projectOwner: string;
  openDefects: number;
  testSuites: TestSuiteSeed[];
  epics: EpicSeed[];
};

const projectSeeds: ProjectSeed[] = [
  {
    prefix: 'INS-001',
    name: "Système de gestion des contrats d'assurance",
    description:
      'Une plateforme utilisée par les équipes assurance pour gérer les contrats, les polices, les sinistres et le cycle de vie client.',
    clientName: 'Acme Corporation',
    projectOwner: 'John Doe',
    openDefects: 3,
    testSuites: [
      {
        name: 'Authentification',
        testCases: [
          {
            name: 'Connexion avec des identifiants valides',
            summary: "Vérifier qu'un utilisateur autorisé peut accéder à la plateforme avec des identifiants valides.",
            preconditions: [
              "Un compte utilisateur enregistré existe dans le système.",
              "Le service d'authentification est disponible.",
            ],
            steps: [
              {
                action: "L'utilisateur saisit un nom d'utilisateur et un mot de passe valides.",
                expectedResult: "Le système authentifie l'utilisateur avec succès.",
              },
              {
                action: "L'utilisateur soumet le formulaire de connexion.",
                expectedResult: "Le tableau de bord s'affiche pour l'utilisateur authentifié.",
              },
              {
                action: 'Le système vérifie le rôle et le profil de l’utilisateur.',
                expectedResult: 'La navigation et les permissions appropriées sont chargées.',
              },
              {
                action: "L'utilisateur reste inactif pendant la session.",
                expectedResult: "La session reste active jusqu'au délai d'expiration configuré.",
              },
            ],
          },
          {
            name: 'Réinitialisation du mot de passe oublié',
            summary: "Vérifier qu'un utilisateur peut demander une réinitialisation du mot de passe et suivre le parcours de récupération.",
            preconditions: [
              "Le compte utilisateur existe et possède une adresse e-mail.",
              'Les notifications de réinitialisation du mot de passe sont activées.',
            ],
            steps: [
              {
                action: "L'utilisateur clique sur le lien mot de passe oublié.",
                expectedResult: "Le formulaire de récupération du mot de passe s'affiche.",
              },
              {
                action: "L'utilisateur saisit l'adresse e-mail enregistrée.",
                expectedResult: "Le système accepte la demande et envoie un e-mail de réinitialisation.",
              },
              {
                action: "L'utilisateur ouvre le lien de réinitialisation reçu par e-mail.",
                expectedResult: 'La page de changement de mot de passe s’ouvre de manière sécurisée.',
              },
              {
                action: "L'utilisateur soumet un nouveau mot de passe.",
                expectedResult: "Le mot de passe est mis à jour et l'utilisateur peut se reconnecter.",
              },
            ],
          },
        ],
      },
      {
        name: 'Gestion des polices',
        testCases: [
          {
            name: 'Créer une nouvelle police d’assurance',
            summary: "Vérifier qu'un opérateur peut créer une police à partir d'un profil client valide.",
            preconditions: [
              "Un profil client existe et est éligible à l'assurance.",
              'Les produits de police et les formules de couverture sont configurés.',
            ],
            steps: [
              {
                action: "L'utilisateur saisit les informations du client et du souscripteur.",
                expectedResult: 'Les informations client sont enregistrées dans le brouillon de police.',
              },
              {
                action: "L'utilisateur sélectionne une formule de couverture et des options.",
                expectedResult: 'Le système calcule la structure de base de la police.',
              },
              {
                action: "L'utilisateur confirme la création de la police.",
                expectedResult: 'La police est créée avec le statut brouillon.',
              },
              {
                action: 'Le système génère le document contractuel.',
                expectedResult: 'Le dossier documentaire de la police est disponible au téléchargement.',
              },
            ],
          },
          {
            name: 'Modifier une police existante',
            summary: "Vérifier qu'une police peut être mise à jour lorsqu'une modification contractuelle est nécessaire.",
            preconditions: [
              'Une police active existe dans le système.',
              "L'utilisateur dispose des droits de modification de la police.",
            ],
            steps: [
              {
                action: 'L’utilisateur ouvre la fiche de police.',
                expectedResult: 'Les détails courants de la police sont affichés.',
              },
              {
                action: "L'utilisateur met à jour le montant de couverture.",
                expectedResult: 'La couverture modifiée apparaît dans le formulaire.',
              },
              {
                action: "L'utilisateur enregistre l'avenant.",
                expectedResult: 'La modification est enregistrée et versionnée.',
              },
              {
                action: 'Le système recalcule l’impact sur la prime.',
                expectedResult: 'La nouvelle prime et le résumé des changements sont affichés.',
              },
            ],
          },
        ],
      },
      {
        name: 'Traitement des sinistres',
        testCases: [
          {
            name: 'Déposer un nouveau sinistre',
            summary: "Vérifier qu'un conseiller client peut créer un dossier de sinistre.",
            preconditions: [
              'La police est active et éligible à un sinistre.',
              'Le module de saisie des sinistres est disponible.',
            ],
            steps: [
              {
                action: "L'utilisateur saisit les informations de police et de l’incident.",
                expectedResult: 'Un sinistre brouillon est créé.',
              },
              {
                action: "L'utilisateur ajoute les pièces justificatives.",
                expectedResult: 'Les documents téléversés sont liés au sinistre.',
              },
              {
                action: "L'utilisateur soumet le sinistre.",
                expectedResult: 'Le statut du sinistre passe en cours de traitement.',
              },
              {
                action: 'Le système attribue un numéro de référence.',
                expectedResult: 'Le sinistre peut être suivi depuis le tableau de bord.',
              },
            ],
          },
          {
            name: 'Valider un sinistre vérifié',
            summary: "Vérifier qu'un gestionnaire de sinistres peut valider un sinistre après contrôle.",
            preconditions: [
              'Un sinistre existe avec le statut vérifié.',
              'Les droits de validation sont accordés au gestionnaire de sinistres.',
            ],
            steps: [
              {
                action: 'L’utilisateur ouvre le sinistre vérifié.',
                expectedResult: 'L’écran de revue du sinistre s’affiche.',
              },
              {
                action: 'L’utilisateur consulte le montant et les documents du sinistre.',
                expectedResult: 'Les éléments de preuve sont visibles pour la décision.',
              },
              {
                action: "L'utilisateur clique sur Valider.",
                expectedResult: 'Le sinistre est marqué comme validé.',
              },
              {
                action: 'Le système envoie la notification de validation.',
                expectedResult: 'Le client et les équipes internes sont informés.',
              },
            ],
          },
        ],
      },
    ],
    epics: [
      {
        name: 'Gestion du cycle de vie des polices',
        description: 'Couvre les flux de création, modification et génération de contrat.',
        priority: EpicPriority.HIGH,
        status: EpicStatus.IN_PROGRESS,
        creationDate: new Date('2026-03-20T09:00:00.000Z'),
        features: [
          {
            name: 'Création de police',
            description: 'Permettre aux agents de créer des polices à partir de demandes client éligibles.',
            priority: FeaturePriority.HIGH,
            status: FeatureStatus.IN_PROGRESS,
            creationDate: new Date('2026-03-21T09:00:00.000Z'),
            userStories: [
              {
                name: 'Créer une police à partir d’un devis approuvé',
                description: 'En tant qu’agent, je veux créer une police à partir d’un devis approuvé afin d’activer la couverture rapidement.',
                priority: StoryPriority.HIGH,
                status: StoryStatus.IN_PROGRESS,
                creationDate: new Date('2026-03-22T09:00:00.000Z'),
              },
              {
                name: 'Saisir les informations du souscripteur',
                description: 'En tant qu’opérateur, je veux saisir les informations du souscripteur afin que le contrat soit complet et conforme.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T10:00:00.000Z'),
              },
            ],
          },
          {
            name: 'Avenant de police',
            description: 'Gérer les modifications contractuelles telles que les ajustements de couverture et de dates.',
            priority: FeaturePriority.MEDIUM,
            status: FeatureStatus.NEW,
            creationDate: new Date('2026-03-21T10:00:00.000Z'),
            userStories: [
              {
                name: 'Modifier la couverture pendant la durée du contrat',
                description: 'En tant que gestionnaire de contrat, je veux modifier la couverture pendant la durée du contrat afin de refléter les changements client.',
                priority: StoryPriority.HIGH,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T11:00:00.000Z'),
              },
              {
                name: 'Tracer l’historique des avenants',
                description: 'En tant que responsable conformité, je veux tracer l’historique des avenants afin que chaque modification soit auditée.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T12:00:00.000Z'),
              },
            ],
          },
        ],
      },
      {
        name: 'Gestion des sinistres et des clients',
        description: 'Couvre la saisie des sinistres, leur revue et les workflows de support client.',
        priority: EpicPriority.MEDIUM,
        status: EpicStatus.IN_PROGRESS,
        creationDate: new Date('2026-03-20T10:00:00.000Z'),
        features: [
          {
            name: 'Saisie des sinistres',
            description: 'Collecter les informations de sinistre et les pièces justificatives des utilisateurs.',
            priority: FeaturePriority.MEDIUM,
            status: FeatureStatus.IN_PROGRESS,
            creationDate: new Date('2026-03-21T11:00:00.000Z'),
            userStories: [
              {
                name: 'Enregistrer une nouvelle demande de sinistre',
                description: 'En tant qu’agent support, je veux enregistrer une nouvelle demande de sinistre afin que le dossier puisse être traité.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.IN_PROGRESS,
                creationDate: new Date('2026-03-22T13:00:00.000Z'),
              },
              {
                name: 'Téléverser les pièces du sinistre',
                description: 'En tant qu’agent support, je veux téléverser les pièces du sinistre afin que le dossier soit complet.',
                priority: StoryPriority.LOW,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T14:00:00.000Z'),
              },
            ],
          },
          {
            name: 'Revue des sinistres',
            description: 'Permettre aux gestionnaires de valider, approuver et clôturer les sinistres.',
            priority: FeaturePriority.HIGH,
            status: FeatureStatus.PENDING,
            creationDate: new Date('2026-03-21T12:00:00.000Z'),
            userStories: [
              {
                name: 'Valider l’éligibilité du sinistre',
                description: 'En tant qu’analyste sinistres, je veux valider l’éligibilité du sinistre afin que seuls les dossiers valides continuent.',
                priority: StoryPriority.HIGH,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T15:00:00.000Z'),
              },
              {
                name: 'Approuver ou rejeter un sinistre',
                description: 'En tant que gestionnaire sinistres, je veux approuver ou rejeter un sinistre afin de finaliser le traitement.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T16:00:00.000Z'),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    prefix: 'ECOM-001',
    name: 'Plateforme de gestion des commandes e-commerce',
    description:
      'Un système pour gérer le catalogue produits, les commandes, les paiements et les flux de livraison.',
    clientName: 'Acme Corporation',
    projectOwner: 'John Doe',
    openDefects: 3,
    testSuites: [
      {
        name: 'Compte utilisateur',
        testCases: [
          {
            name: 'Créer un compte client',
            summary: 'Vérifier qu’un client peut créer un compte et accéder à la boutique.',
            preconditions: [
              'La page d’inscription est disponible.',
              'L’adresse e-mail n’est pas déjà utilisée par un autre compte.',
            ],
            steps: [
              {
                action: 'Le client saisit son nom, son e-mail et son mot de passe.',
                expectedResult: 'Les informations du compte sont acceptées.',
              },
              {
                action: 'Le client soumet le formulaire d’inscription.',
                expectedResult: 'Un nouveau compte client est créé.',
              },
              {
                action: 'Le système envoie un e-mail de confirmation du compte.',
                expectedResult: 'Le client reçoit un message de confirmation.',
              },
              {
                action: 'Le client se connecte avec le nouveau compte.',
                expectedResult: 'Le client accède au tableau de bord de la boutique.',
              },
            ],
          },
          {
            name: 'Mettre à jour le profil client',
            summary: 'Vérifier qu’un client peut mettre à jour son profil et ses coordonnées.',
            preconditions: [
              'Un compte client est déjà connecté.',
              'La modification du profil est autorisée pour ce compte.',
            ],
            steps: [
              {
                action: 'Le client ouvre la page profil.',
                expectedResult: 'Les valeurs actuelles du profil sont affichées.',
              },
              {
                action: 'Le client met à jour le numéro de téléphone et l’adresse.',
                expectedResult: 'Le formulaire affiche les valeurs mises à jour.',
              },
              {
                action: 'Le client enregistre les modifications du profil.',
                expectedResult: 'Les nouvelles informations sont enregistrées.',
              },
              {
                action: 'Le système actualise le résumé du client.',
                expectedResult: 'La page profil reflète les dernières informations.',
              },
            ],
          },
        ],
      },
      {
        name: 'Traitement des commandes',
        testCases: [
          {
            name: 'Passer une commande produit',
            summary: 'Vérifier qu’un client peut créer une commande à partir du panier.',
            preconditions: [
              'Le panier contient au moins un produit disponible.',
              'L’adresse de livraison est valide.',
            ],
            steps: [
              {
                action: 'Le client consulte le contenu du panier.',
                expectedResult: 'Le résumé du panier s’affiche correctement.',
              },
              {
                action: 'Le client confirme l’adresse de livraison.',
                expectedResult: 'Les informations d’expédition sélectionnées sont enregistrées.',
              },
              {
                action: 'Le client valide la commande.',
                expectedResult: 'La commande est créée avec le statut paiement en attente.',
              },
              {
                action: 'Le système génère la référence de commande.',
                expectedResult: 'La commande peut être suivie depuis l’espace client.',
              },
            ],
          },
          {
            name: 'Annuler une commande en attente',
            summary: 'Vérifier qu’un client peut annuler une commande avant le début de la préparation.',
            preconditions: [
              'Une commande en attente existe.',
              'La fenêtre d’annulation est encore ouverte.',
            ],
            steps: [
              {
                action: 'Le client ouvre la page de détails de la commande.',
                expectedResult: 'Les informations de la commande en attente sont visibles.',
              },
              {
                action: 'Le client clique sur Annuler la commande.',
                expectedResult: "La boîte de dialogue de confirmation de l’annulation s’affiche.",
              },
              {
                action: 'Le client confirme l’annulation.',
                expectedResult: 'Le statut de la commande passe à annulée.',
              },
              {
                action: 'Le système met à jour la réservation du stock.',
                expectedResult: 'Le stock réservé est libéré et réintégré au catalogue.',
              },
            ],
          },
        ],
      },
      {
        name: 'Paiement',
        testCases: [
          {
            name: 'Payer une commande par carte bancaire',
            summary: 'Vérifier qu’une commande peut être réglée via un parcours de paiement par carte.',
            preconditions: [
              'La commande est prête pour le paiement.',
              'Une passerelle de paiement carte valide est configurée.',
            ],
            steps: [
              {
                action: 'Le client sélectionne le moyen de paiement par carte.',
                expectedResult: 'Le formulaire de carte s’affiche.',
              },
              {
                action: 'Le client saisit des informations de carte valides.',
                expectedResult: 'Les informations de paiement sont acceptées.',
              },
              {
                action: 'Le client confirme le paiement.',
                expectedResult: 'Le paiement est autorisé avec succès.',
              },
              {
                action: 'Le système marque la commande comme payée.',
                expectedResult: 'La facture et le reçu deviennent disponibles.',
              },
            ],
          },
          {
            name: 'Gérer un paiement refusé',
            summary: 'Vérifier que le système gère correctement les paiements carte refusés.',
            preconditions: [
              'La passerelle de paiement est accessible.',
              'Le client possède une commande en attente de paiement.',
            ],
            steps: [
              {
                action: 'Le client saisit une carte invalide ou refusée.',
                expectedResult: 'Le formulaire de paiement accepte les données pour traitement.',
              },
              {
                action: 'Le client soumet la demande de paiement.',
                expectedResult: 'La passerelle renvoie une réponse de refus.',
              },
              {
                action: 'Le système affiche un message d’échec de paiement.',
                expectedResult: 'Le client comprend que la commande n’a pas été réglée.',
              },
              {
                action: 'Le client réessaie avec un autre moyen de paiement.',
                expectedResult: 'La commande reste payable jusqu’à la réussite d’une transaction.',
              },
            ],
          },
        ],
      },
    ],
    epics: [
      {
        name: 'Gestion client et catalogue',
        description: 'Soutient les comptes clients et la découverte de produits dans la boutique.',
        priority: EpicPriority.MEDIUM,
        status: EpicStatus.IN_PROGRESS,
        creationDate: new Date('2026-03-20T11:00:00.000Z'),
        features: [
          {
            name: 'Inscription client',
            description: 'Permettre aux clients de créer et gérer leur compte.',
            priority: FeaturePriority.HIGH,
            status: FeatureStatus.IN_PROGRESS,
            creationDate: new Date('2026-03-21T13:00:00.000Z'),
            userStories: [
              {
                name: 'Créer un compte avec vérification e-mail',
                description: 'En tant qu’acheteur, je veux créer un compte avec vérification e-mail afin de suivre mes commandes.',
                priority: StoryPriority.HIGH,
                status: StoryStatus.IN_PROGRESS,
                creationDate: new Date('2026-03-22T17:00:00.000Z'),
              },
              {
                name: 'Modifier les coordonnées du client',
                description: 'En tant qu’acheteur, je veux modifier mes coordonnées afin que les livraisons et notifications restent exactes.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T18:00:00.000Z'),
              },
            ],
          },
          {
            name: 'Consultation du catalogue',
            description: 'Permettre aux utilisateurs de rechercher et filtrer les produits du catalogue en ligne.',
            priority: FeaturePriority.MEDIUM,
            status: FeatureStatus.NEW,
            creationDate: new Date('2026-03-21T14:00:00.000Z'),
            userStories: [
              {
                name: 'Rechercher des produits par mot-clé',
                description: 'En tant qu’acheteur, je veux rechercher des produits par mot-clé afin de trouver rapidement des articles.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T19:00:00.000Z'),
              },
              {
                name: 'Filtrer les produits par catégorie',
                description: 'En tant qu’acheteur, je veux filtrer les produits par catégorie afin de réduire le catalogue.',
                priority: StoryPriority.LOW,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T20:00:00.000Z'),
              },
            ],
          },
        ],
      },
      {
        name: 'Opérations de commande et livraison',
        description: 'Couvre le passage en caisse, le paiement, la préparation et le suivi de livraison.',
        priority: EpicPriority.HIGH,
        status: EpicStatus.IN_PROGRESS,
        creationDate: new Date('2026-03-20T12:00:00.000Z'),
        features: [
          {
            name: 'Parcours de commande',
            description: 'Accompagner le client de la revue du panier jusqu’à la confirmation de commande.',
            priority: FeaturePriority.HIGH,
            status: FeatureStatus.IN_PROGRESS,
            creationDate: new Date('2026-03-21T15:00:00.000Z'),
            userStories: [
              {
                name: 'Confirmer l’adresse de livraison pendant la commande',
                description: 'En tant qu’acheteur, je veux confirmer l’adresse de livraison pendant la commande afin que la livraison soit correcte.',
                priority: StoryPriority.HIGH,
                status: StoryStatus.IN_PROGRESS,
                creationDate: new Date('2026-03-22T21:00:00.000Z'),
              },
              {
                name: 'Relire le récapitulatif avant achat',
                description: 'En tant qu’acheteur, je veux relire le récapitulatif avant achat afin de vérifier le montant final.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T22:00:00.000Z'),
              },
            ],
          },
          {
            name: 'Suivi de livraison',
            description: 'Fournir aux clients l’état d’expédition et les mises à jour de livraison.',
            priority: FeaturePriority.MEDIUM,
            status: FeatureStatus.PENDING,
            creationDate: new Date('2026-03-21T16:00:00.000Z'),
            userStories: [
              {
                name: 'Consulter le statut du colis',
                description: 'En tant qu’acheteur, je veux consulter le statut du colis afin de savoir où se trouve ma commande.',
                priority: StoryPriority.MEDIUM,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-22T23:00:00.000Z'),
              },
              {
                name: 'Recevoir les notifications de livraison',
                description: 'En tant qu’acheteur, je veux recevoir des notifications de livraison afin d’être informé des étapes d’acheminement.',
                priority: StoryPriority.LOW,
                status: StoryStatus.TO_DO,
                creationDate: new Date('2026-03-23T00:00:00.000Z'),
              },
            ],
          },
        ],
      },
    ],
  },
];

async function main() {
  await prisma.project.deleteMany({
    where: {
      prefix: {
        in: projectSeeds.map((project) => project.prefix),
      },
    },
  });

  const createdProjects = [] as Array<{
    id: string;
    prefix: string;
    name: string;
  }>;

  for (const projectSeed of projectSeeds) {
    const createdProject = await prisma.project.create({
      data: {
        prefix: projectSeed.prefix,
        name: projectSeed.name,
        description: projectSeed.description,
        clientName: projectSeed.clientName,
        projectOwner: projectSeed.projectOwner,
        openDefects: projectSeed.openDefects,
        status: ProjectStatus.ACTIVE,
        approvals: {
          create: [
            {
              approverName: 'Alice QA',
              approverRole: 'QA Lead',
              approvalDate: new Date(),
            },
            {
              approverName: 'Bob Manager',
              approverRole: 'Project Manager',
              approvalDate: new Date(),
            },
          ],
        },
        testSuites: {
          create: projectSeed.testSuites.map((suite, suiteIndex) => ({
            name: suite.name,
            order: suiteIndex + 1,
            testCases: {
              create: suite.testCases.map((testCase) => ({
                name: testCase.name,
                summary: testCase.summary,
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
              })),
            },
          })),
        },
        epics: {
          create: projectSeed.epics.map((epic) => ({
            name: epic.name,
            description: epic.description,
            creationDate: epic.creationDate,
            priority: epic.priority,
            status: epic.status,
            features: {
              create: epic.features.map((feature) => ({
                name: feature.name,
                description: feature.description,
                creationDate: feature.creationDate,
                priority: feature.priority,
                status: feature.status,
                userStories: {
                  create: feature.userStories.map((userStory) => ({
                    name: userStory.name,
                    description: userStory.description,
                    creationDate: userStory.creationDate,
                    priority: userStory.priority,
                    status: userStory.status,
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    createdProjects.push({
      id: createdProject.id,
      prefix: createdProject.prefix,
      name: createdProject.name,
    });
  }

  console.log(
    JSON.stringify(
      {
        message: 'Seed completed successfully',
        projects: createdProjects,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Seed failed');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });