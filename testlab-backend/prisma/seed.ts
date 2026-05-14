import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import {
  PrismaClient,
  Prisma,
  ProjectStatus,
  UserRole,
  Platform,
  StoryPriority,
  StoryStatus,
  FeaturePriority,
  FeatureStatus,
  EpicPriority,
  EpicStatus,
  DocumentVersionStatus,
} from './generated/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type AcceptanceSeed = {
  criterionDescription?: string;
  given: string;
  when: string;
  then: string;
  status?: 'pass' | 'fail' | 'open';
};

type StoryRuleSeed = {
  title: string;
  description: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  source?: string;
};

type StoryIntegrationSeed = {
  action: string;
  integration: string;
};

type UserStorySeed = {
  name: string;
  description: string;
  priority?: StoryPriority;
  status?: StoryStatus;
  acceptanceCriteria: AcceptanceSeed[];
  businessRules?: StoryRuleSeed[];
  integrations?: StoryIntegrationSeed[];
};

type FeatureSeed = {
  name: string;
  description: string;
  priority?: FeaturePriority;
  status?: FeatureStatus;
  userStories: UserStorySeed[];
};

type EpicSeed = {
  name: string;
  description: string;
  priority?: EpicPriority;
  status?: EpicStatus;
  features: FeatureSeed[];
};

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
  order: number;
  testCases: TestCaseSeed[];
};

type ProjectSeed = {
  prefix: string;
  name: string;
  description: string;
  clientName: string;
  projectOwner: string;
  openDefects: number;
  platforms: Platform[];
  approvals: Array<{
    approverName: string;
    approverRole: string;
    approvalDate: Date;
  }>;
  environments: Array<{
    name: string;
    url: string;
    description: string;
    status?: string;
    items: Array<{ environmentKey: string; value: string }>;
  }>;
  documentVersions: Array<{
    documentType: string;
    documentName: string;
    threadId: string;
    versionNumber: number;
    status: DocumentVersionStatus;
    createdByName: string;
    createdByInitials: string;
    payloadSnapshot: Prisma.InputJsonValue;
  }>;
  fsdDashboardScreenshots: Array<{
    url: string;
    altText: string;
    caption: string;
  }>;
  fsdNavigationItems: Array<{
    label: string;
    targetPage: string;
    type: string;
    accessRoles: string[];
  }>;
  fsdFunctionalModules: Array<{
    title: string;
    description: string;
  }>;
  fsdBusinessRules: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    source: string;
  }>;
  fsdAcceptanceCriteria: Array<{
    id: string;
    userStory: string;
    criterionDescription?: string;
    given: string;
    when: string;
    then: string;
    status: 'pass' | 'fail' | 'open';
  }>;
  fsdGlossaryEntries: Array<{
    term: string;
    comment: string;
  }>;
  fsdReferenceDocuments: Array<{
    name: string;
    type: string;
    attachment: string;
  }>;
  fsdRevisions: Array<{
    date: Date;
    version: string;
    status: string;
    author: string;
  }>;
  testSuites: TestSuiteSeed[];
  epics: EpicSeed[];
};

function buildDefaultAcceptanceCriteria(
  storyName: string,
  context: string,
): AcceptanceSeed[] {
  return [
    {
      criterionDescription: `Parcours nominal - ${storyName}`,
      given: `l'utilisateur est authentifie sur ${context}`,
      when: `il lance l'action "${storyName}"`,
      then: `le systeme enregistre l'operation avec succes`,
      status: 'open',
    },
    {
      criterionDescription: `Controle des donnees - ${storyName}`,
      given: `l'utilisateur se trouve sur l'ecran "${storyName}"`,
      when: `il soumet des donnees incompletes`,
      then: `le systeme bloque la validation et met en evidence les erreurs`,
      status: 'open',
    },
  ];
}

function buildStorySeed(
  projectPrefix: string,
  storyName: string,
  description: string,
  featureName: string,
  context: string,
  integrationBase: string,
): UserStorySeed {
  const hasSpecialCriteria =
    projectPrefix === 'INS-001' && storyName === 'Creer un dossier client complet';

  const acceptanceCriteria: AcceptanceSeed[] = hasSpecialCriteria
    ? [
        {
          criterionDescription: 'Creation d\'un dossier client complet',
          given: 'le dossier est eligible',
          when:
            'le conseiller commercial lance l\'action "creer un dossier client complet"',
          then: "le systeme enregistre l'operation avec succes",
          status: 'open',
        },
        {
          criterionDescription: 'Validation des donnees du dossier',
          given: 'le conseiller a renseigne toutes les informations requises',
          when: 'il confirme la creation du dossier',
          then: 'le systeme cree le dossier et notifie le client',
          status: 'open',
        },
      ]
    : buildDefaultAcceptanceCriteria(storyName, context);

  return {
    name: storyName,
    description,
    priority: StoryPriority.MEDIUM,
    status: StoryStatus.TO_DO,
    acceptanceCriteria,
    businessRules: [
      {
        title: `Validation metier - ${storyName}`,
        description: `Les donnees de "${storyName}" doivent respecter les regles metier du module ${featureName}.`,
        priority: 'MEDIUM',
        source: featureName,
      },
    ],
    integrations: [
      {
        action: `Synchroniser ${storyName}`,
        integration: integrationBase,
      },
    ],
  };
}

function buildEpics(
  projectPrefix: string,
  projectName: string,
  context: string,
  integrationBase: string,
): EpicSeed[] {
  const epicBlueprints = [
    {
      name: 'Onboarding et creation',
      description: `Initialiser les parcours clients et les dossiers ${context}.`,
      features: [
        {
          name: 'Creation de dossier client',
          description: 'Creation et qualification initiale des dossiers.',
          stories: [
            {
              name: 'Creer un dossier client complet',
              description: `Permettre la creation d'un dossier complet pour ${projectName}.`,
            },
            {
              name: 'Completer les informations client',
              description: 'Saisir les informations complementaires obligatoires.',
            },
          ],
        },
        {
          name: 'Qualification des pieces',
          description: 'Collecter et verifier les pieces justificatives.',
          stories: [
            {
              name: 'Ajouter des pieces justificatives',
              description: 'Televerser et rattacher les preuves necessaires.',
            },
            {
              name: 'Valider les pieces fournies',
              description: 'Controler la conformite des pieces jointes.',
            },
          ],
        },
      ],
    },
    {
      name: 'Gestion operationnelle',
      description: `Suivre et mettre a jour les parcours ${context}.`,
      features: [
        {
          name: 'Mise a jour du dossier',
          description: 'Maintenir les informations a jour.',
          stories: [
            {
              name: 'Mettre a jour les coordonnees',
              description: 'Modifier les informations de contact du client.',
            },
            {
              name: 'Historiser les modifications',
              description: 'Tracer les changements pour audit.',
            },
          ],
        },
        {
          name: 'Validation metier',
          description: 'Appliquer les controles de conformite.',
          stories: [
            {
              name: 'Appliquer les regles de conformite',
              description: 'Verifier la conformite des dossiers soumis.',
            },
            {
              name: 'Bloquer les dossiers non conformes',
              description: 'Prevenir la validation des dossiers en anomalie.',
            },
          ],
        },
      ],
    },
    {
      name: 'Pilotage et reporting',
      description: `Donner de la visibilite sur l'activite ${context}.`,
      features: [
        {
          name: 'Tableau de bord',
          description: 'Suivre les indicateurs clefs.',
          stories: [
            {
              name: 'Consulter les indicateurs cles',
              description: 'Afficher les KPIs principaux.',
            },
            {
              name: 'Exporter un rapport de suivi',
              description: 'Exporter un rapport de synthese.',
            },
          ],
        },
        {
          name: 'Notifications',
          description: 'Informer les equipes sur les actions prioritaires.',
          stories: [
            {
              name: 'Alerter sur les retards',
              description: 'Notifier les responsables des dossiers en retard.',
            },
            {
              name: 'Notifier les validations',
              description: 'Informer lors des validations de dossier.',
            },
          ],
        },
      ],
    },
  ];

  return epicBlueprints.map((epic) => ({
    name: epic.name,
    description: epic.description,
    priority: EpicPriority.MEDIUM,
    status: EpicStatus.NEW,
    features: epic.features.map((feature) => ({
      name: feature.name,
      description: feature.description,
      priority: FeaturePriority.MEDIUM,
      status: FeatureStatus.NEW,
      userStories: feature.stories.map((story) =>
        buildStorySeed(
          projectPrefix,
          story.name,
          story.description,
          feature.name,
          context,
          integrationBase,
        ),
      ),
    })),
  }));
}

function buildTestSuites(projectName: string): TestSuiteSeed[] {
  return [
    {
      name: `Parcours principal - ${projectName}`,
      order: 1,
      testCases: [
        {
          name: 'Creer un dossier complet',
          summary: 'Verifier la creation d\'un dossier complet sans erreur.',
          preconditions: [
            'Un utilisateur est connecte avec les droits adequats.',
            'Le module de creation est disponible.',
          ],
          steps: [
            {
              action: "Ouvrir l'ecran de creation de dossier.",
              expectedResult: 'Le formulaire de creation est visible.',
            },
            {
              action: 'Renseigner les informations obligatoires.',
              expectedResult: 'Les champs sont valides et enregistres.',
            },
            {
              action: 'Soumettre le formulaire.',
              expectedResult: 'Le dossier est cree et un message de succes apparait.',
            },
          ],
        },
        {
          name: 'Completer un dossier existant',
          summary: 'Verifier la mise a jour d\'un dossier en cours.',
          preconditions: [
            'Un dossier existe en statut brouillon.',
            'Le dossier est editable.',
          ],
          steps: [
            {
              action: 'Ouvrir le dossier en brouillon.',
              expectedResult: 'Les informations existantes sont affichees.',
            },
            {
              action: 'Ajouter les informations manquantes.',
              expectedResult: 'Les informations sont sauvegardees.',
            },
          ],
        },
      ],
    },
    {
      name: `Gestion des anomalies - ${projectName}`,
      order: 2,
      testCases: [
        {
          name: 'Blocage en cas de donnees invalides',
          summary: 'Verifier que le systeme bloque la validation si des champs sont invalides.',
          preconditions: ['Un utilisateur est sur le formulaire de creation.'],
          steps: [
            {
              action: 'Saisir des donnees incompletes.',
              expectedResult: 'Les champs invalides sont identifies.',
            },
            {
              action: 'Tenter de soumettre le formulaire.',
              expectedResult: 'La validation est refusee avec un message clair.',
            },
          ],
        },
        {
          name: 'Annulation d\'une operation',
          summary: 'Verifier qu\'une annulation ne cree pas de dossier.',
          preconditions: ['Le formulaire de creation est ouvert.'],
          steps: [
            {
              action: 'Cliquer sur annuler.',
              expectedResult: 'Le systeme revient a la liste sans enregistrement.',
            },
          ],
        },
      ],
    },
    {
      name: `Reporting et audit - ${projectName}`,
      order: 3,
      testCases: [
        {
          name: 'Generer un rapport de suivi',
          summary: 'Verifier la generation d\'un rapport exportable.',
          preconditions: ['Des dossiers sont disponibles dans le systeme.'],
          steps: [
            {
              action: 'Ouvrir la page des rapports.',
              expectedResult: 'Les filtres et options sont disponibles.',
            },
            {
              action: 'Exporter le rapport.',
              expectedResult: 'Le fichier est genere et telecharge.',
            },
          ],
        },
        {
          name: 'Consulter les indicateurs',
          summary: 'Verifier l\'affichage des indicateurs clefs.',
          preconditions: ['Le tableau de bord est accessible.'],
          steps: [
            {
              action: 'Ouvrir le tableau de bord.',
              expectedResult: 'Les indicateurs sont affiches.',
            },
            {
              action: 'Changer la periode d\'analyse.',
              expectedResult: 'Les indicateurs sont mis a jour.',
            },
          ],
        },
      ],
    },
  ];
}

function buildVolumeEpics(epicCount: number, featuresPerEpic: number, storiesPerFeature: number): EpicSeed[] {
  const epics: EpicSeed[] = [];
  for (let e = 1; e <= epicCount; e++) {
    const features: FeatureSeed[] = [];
    for (let f = 1; f <= featuresPerEpic; f++) {
      const stories: UserStorySeed[] = [];
      for (let us = 1; us <= storiesPerFeature; us++) {
        stories.push({
          name: `US-${e}.${f}.${us} - Action volumétrique`,
          description: `Description détaillée de l'action ${us} pour la feature ${f} de l'epic ${e}. Ce cas couvre les aspects fonctionnels, techniques et métier nécessaires à la validation complète du périmètre.`,
          priority: StoryPriority.MEDIUM,
          status: StoryStatus.TO_DO,
          acceptanceCriteria: [
            {
              criterionDescription: `Critère ${us}.1`,
              given: `le système est dans l'état initial pour US-${e}.${f}.${us}`,
              when: `l'utilisateur déclenche l'action ${us}`,
              then: `le résultat conforme est enregistré`,
              status: 'open' as const,
            },
            {
              criterionDescription: `Critère ${us}.2`,
              given: `des données partielles sont fournies`,
              when: `l'utilisateur soumet le formulaire`,
              then: `le système affiche les erreurs de validation`,
              status: 'open' as const,
            },
          ],
          businessRules: [
            {
              title: `Règle ${us} - Contrôle métier`,
              description: `Les données de l'US-${e}.${f}.${us} doivent respecter les contraintes définies dans le cahier des charges.`,
              priority: 'MEDIUM',
              source: 'Spécification fonctionnelle',
            },
          ],
          integrations: [
            {
              action: `Notifier le module externe pour US-${e}.${f}.${us}`,
              integration: 'Système central',
            },
          ],
        });
      }
      features.push({
        name: `Feature ${f} de l'epic ${e}`,
        description: `Regroupement des stories ${f} pour l'epic ${e}.`,
        priority: FeaturePriority.MEDIUM,
        status: FeatureStatus.NEW,
        userStories: stories,
      });
    }
    epics.push({
      name: `Epic volumétrique ${e}`,
      description: `Epic de test de charge numero ${e}.`,
      priority: EpicPriority.MEDIUM,
      status: EpicStatus.NEW,
      features,
    });
  }
  return epics;
}
function buildVolumeTestSuites(suiteCount: number, casesPerSuite: number): TestSuiteSeed[] {
  const suites: TestSuiteSeed[] = [];
  for (let s = 1; s <= suiteCount; s++) {
    const cases: TestCaseSeed[] = [];
    for (let c = 1; c <= casesPerSuite; c++) {
      cases.push({
        name: `TC-VOL-${s}-${c} - Verification du processus ${s}.${c}`,
        summary: `Validation complete du cas de test ${c} dans la suite ${s}.`,
        preconditions: [
          `L'utilisateur est authentifié avec le rôle approprié.`,
          `Les données de test pour la suite ${s} sont chargées.`,
        ],
        steps: [
          { action: `Étape 1 du cas ${c}`, expectedResult: `Résultat attendu 1 pour le cas ${c}.` },
          { action: `Étape 2 du cas ${c}`, expectedResult: `Résultat attendu 2 pour le cas ${c}.` },
          { action: `Étape 3 du cas ${c}`, expectedResult: `Résultat attendu 3 pour le cas ${c}.` },
          { action: `Étape 4 du cas ${c}`, expectedResult: `Résultat attendu 4 pour le cas ${c}.` },
        ],
      });
    }
    suites.push({
      name: `Suite de test volumétrique ${s}`,
      order: s,
      testCases: cases,
    });
  }
  return suites;
}



const projectSeeds: ProjectSeed[] = [
  {
    prefix: 'INS-001',
    name: 'Assurance 360',
    description:
      'Plateforme pour gerer les dossiers clients, les pieces justificatives et le suivi des contrats assurance.',
    clientName: 'Assurix',
    projectOwner: 'Alice Martin',
    openDefects: 4,
    platforms: [Platform.WEB, Platform.MOBILE],
    approvals: [
      {
        approverName: 'Nadia Benali',
        approverRole: 'QA Lead',
        approvalDate: new Date('2026-04-12'),
      },
      {
        approverName: 'Loic Fontaine',
        approverRole: 'Product Owner',
        approvalDate: new Date('2026-04-14'),
      },
    ],
    environments: [
      {
        name: 'Developpement',
        url: 'https://dev.assurance360.example.com',
        description: 'Environnement de developpement.',
        status: 'Projet',
        items: [
          { environmentKey: 'API_URL', value: 'https://api.dev.assurance360.example.com' },
          { environmentKey: 'FEATURE_FLAGS', value: 'story-images=true' },
        ],
      },
      {
        name: 'Production',
        url: 'https://assurance360.example.com',
        description: 'Environnement de production.',
        status: 'Projet',
        items: [
          { environmentKey: 'API_URL', value: 'https://api.assurance360.example.com' },
          { environmentKey: 'FEATURE_FLAGS', value: 'story-images=true' },
        ],
      },
    ],
    documentVersions: [
      {
        documentType: 'fsd',
        documentName: 'FSD Assurance 360',
        threadId: 'fsd-ins-001',
        versionNumber: 1,
        status: DocumentVersionStatus.IN_PROGRESS,
        createdByName: 'Alice Martin',
        createdByInitials: 'AM',
        payloadSnapshot: {
          title: 'FSD Assurance 360',
          projectName: 'Assurance 360',
          clientName: 'Assurix',
          version: '1.0',
        },
      },
      {
        documentType: 'cahier',
        documentName: 'Cahier Assurance 360',
        threadId: 'cahier-ins-001',
        versionNumber: 1,
        status: DocumentVersionStatus.DRAFT,
        createdByName: 'Alice Martin',
        createdByInitials: 'AM',
        payloadSnapshot: {
          title: 'Cahier de recette - Assurance 360',
          projectName: 'Assurance 360',
          clientName: 'Assurix',
          version: '1.0',
        },
      },
    ],
    fsdDashboardScreenshots: [
      {
        url: '/templates/pdf/fsd/assurance-dashboard-1.png',
        altText: 'Vue globale du portefeuille',
        caption: 'Vue globale des dossiers et des alertes prioritaires.',
      },
      {
        url: '/templates/pdf/fsd/assurance-dashboard-2.png',
        altText: 'Indicateurs de qualite',
        caption: 'Indicateurs de qualite et de couverture des tests.',
      },
    ],
    fsdNavigationItems: [
      {
        label: 'Tableau de bord',
        targetPage: '/dashboard',
        type: 'menu',
        accessRoles: ['Admin', 'QA', 'Manager'],
      },
      {
        label: 'Dossiers clients',
        targetPage: '/dossiers',
        type: 'menu',
        accessRoles: ['Admin', 'QA', 'BA'],
      },
      {
        label: 'Generation de tests',
        targetPage: '/test-generation',
        type: 'feature',
        accessRoles: ['QA'],
      },
      {
        label: 'Environnements',
        targetPage: '/environment',
        type: 'menu',
        accessRoles: ['Admin', 'QA'],
      },
    ],
    fsdFunctionalModules: [
      {
        title: 'Gestion des dossiers',
        description: 'Creation, mise a jour et suivi des dossiers clients assurance.',
      },
      {
        title: 'Suivi qualite et audit',
        description: 'Traceabilite des actions, suivi des anomalies et reporting.',
      },
      {
        title: 'Generation documentaire',
        description: 'Export des documents FSD et cahier de recette.',
      },
    ],
    fsdBusinessRules: [
      {
        id: 'BR-INS-001',
        title: 'Validation obligatoire des dossiers sensibles',
        description:
          'Les dossiers sensibles doivent etre valides par un role Manager avant cloture.',
        priority: 'HIGH',
        source: 'Politique assurance',
      },
      {
        id: 'BR-INS-002',
        title: 'Historisation des actions',
        description:
          'Chaque action utilisateur doit etre historisee pour audit et conformite.',
        priority: 'MEDIUM',
        source: 'Audit interne',
      },
      {
        id: 'BR-INS-003',
        title: 'Versionnement des livrables',
        description:
          'Chaque export de document doit creer une nouvelle version historisee.',
        priority: 'MEDIUM',
        source: 'Gouvernance documentaire',
      },
    ],
    fsdAcceptanceCriteria: [
      {
        id: 'AC-INS-001',
        userStory: 'Creer un dossier client complet',
        criterionDescription: 'Creation d\'un dossier client complet',
        given: 'le dossier est eligible',
        when: 'le conseiller commercial lance l\'action "creer un dossier client complet"',
        then: "le systeme enregistre l'operation avec succes",
        status: 'open',
      },
      {
        id: 'AC-INS-002',
        userStory: 'Valider les pieces fournies',
        criterionDescription: 'Validation des pieces',
        given: 'des pieces justificatives sont attachees au dossier',
        when: 'le conseiller valide les pieces',
        then: 'le systeme met a jour le statut en conforme',
        status: 'pass',
      },
      {
        id: 'AC-INS-003',
        userStory: 'Exporter un rapport de suivi',
        criterionDescription: 'Export de rapport',
        given: 'des dossiers sont disponibles pour la periode choisie',
        when: 'l utilisateur exporte le rapport',
        then: 'le systeme genere un fichier telechargeable',
        status: 'open',
      },
    ],
    fsdGlossaryEntries: [
      { term: 'Dossier', comment: 'Ensemble des informations client et pieces.' },
      { term: 'Piece justificative', comment: 'Document prouvant une information.' },
      { term: 'Conformite', comment: 'Respect des regles metier assurance.' },
    ],
    fsdReferenceDocuments: [
      { name: 'Charte qualite', type: 'PDF', attachment: 'charte-qualite.pdf' },
      { name: 'Guide assurance', type: 'Lien', attachment: 'https://docs.assurix.example.com' },
    ],
    fsdRevisions: [
      {
        date: new Date('2026-04-10'),
        version: '0.9',
        status: 'Brouillon',
        author: 'Alice Martin',
      },
      {
        date: new Date('2026-04-20'),
        version: '1.0',
        status: 'Valide',
        author: 'Alice Martin',
      },
    ],
    testSuites: buildTestSuites('Assurance 360'),
    epics: buildEpics('INS-001', 'Assurance 360', 'assurance', 'CRM Assurance'),
  },
  {
    prefix: 'BANK-002',
    name: 'Banque Digitale',
    description:
      'Solution bancaire pour la gestion des comptes clients, operations et suivi de la conformite.',
    clientName: 'Banque Nova',
    projectOwner: 'Yanis Dupont',
    openDefects: 2,
    platforms: [Platform.WEB, Platform.MOBILE],
    approvals: [
      {
        approverName: 'Camille Laurent',
        approverRole: 'QA Lead',
        approvalDate: new Date('2026-04-18'),
      },
      {
        approverName: 'Romain Perrot',
        approverRole: 'Product Owner',
        approvalDate: new Date('2026-04-19'),
      },
    ],
    environments: [
      {
        name: 'Recette',
        url: 'https://qa.banquenova.example.com',
        description: 'Environnement de recette.',
        status: 'Projet',
        items: [
          { environmentKey: 'API_URL', value: 'https://api.qa.banquenova.example.com' },
          { environmentKey: 'FEATURE_FLAGS', value: 'story-images=true' },
        ],
      },
      {
        name: 'Production',
        url: 'https://banquenova.example.com',
        description: 'Environnement de production.',
        status: 'Projet',
        items: [
          { environmentKey: 'API_URL', value: 'https://api.banquenova.example.com' },
          { environmentKey: 'FEATURE_FLAGS', value: 'story-images=true' },
        ],
      },
    ],
    documentVersions: [
      {
        documentType: 'fsd',
        documentName: 'FSD Banque Digitale',
        threadId: 'fsd-bank-002',
        versionNumber: 1,
        status: DocumentVersionStatus.IN_PROGRESS,
        createdByName: 'Yanis Dupont',
        createdByInitials: 'YD',
        payloadSnapshot: {
          title: 'FSD Banque Digitale',
          projectName: 'Banque Digitale',
          clientName: 'Banque Nova',
          version: '1.0',
        },
      },
      {
        documentType: 'cahier',
        documentName: 'Cahier Banque Digitale',
        threadId: 'cahier-bank-002',
        versionNumber: 1,
        status: DocumentVersionStatus.DRAFT,
        createdByName: 'Yanis Dupont',
        createdByInitials: 'YD',
        payloadSnapshot: {
          title: 'Cahier de recette - Banque Digitale',
          projectName: 'Banque Digitale',
          clientName: 'Banque Nova',
          version: '1.0',
        },
      },
    ],
    fsdDashboardScreenshots: [
      {
        url: '/templates/pdf/fsd/bank-dashboard-1.png',
        altText: 'Vue operations',
        caption: 'Suivi des operations et alertes de securite.',
      },
      {
        url: '/templates/pdf/fsd/bank-dashboard-2.png',
        altText: 'Vue conformite',
        caption: 'Indicateurs de conformite et de risques.',
      },
    ],
    fsdNavigationItems: [
      {
        label: 'Tableau de bord',
        targetPage: '/dashboard',
        type: 'menu',
        accessRoles: ['Admin', 'QA', 'Manager'],
      },
      {
        label: 'Comptes clients',
        targetPage: '/comptes',
        type: 'menu',
        accessRoles: ['Admin', 'QA', 'BA'],
      },
      {
        label: 'Operations',
        targetPage: '/operations',
        type: 'menu',
        accessRoles: ['Admin', 'QA'],
      },
      {
        label: 'Environnements',
        targetPage: '/environment',
        type: 'menu',
        accessRoles: ['Admin', 'QA'],
      },
    ],
    fsdFunctionalModules: [
      {
        title: 'Gestion des comptes',
        description: 'Ouverture, suivi et cloture des comptes clients.',
      },
      {
        title: 'Suivi des operations',
        description: 'Traitement des transactions et controles de securite.',
      },
      {
        title: 'Conformite et audit',
        description: 'Surveillance des regles de conformite bancaire.',
      },
    ],
    fsdBusinessRules: [
      {
        id: 'BR-BANK-001',
        title: 'Validation multi-niveaux',
        description:
          'Les operations sensibles doivent etre validees par deux niveaux d\'approbation.',
        priority: 'HIGH',
        source: 'Reglement bancaire',
      },
      {
        id: 'BR-BANK-002',
        title: 'Traceabilite des transactions',
        description: 'Chaque transaction doit etre journalisee.',
        priority: 'HIGH',
        source: 'Audit bancaire',
      },
      {
        id: 'BR-BANK-003',
        title: 'Archivage des dossiers',
        description: 'Les dossiers clotures sont archives 5 ans minimum.',
        priority: 'MEDIUM',
        source: 'Politique de conservation',
      },
    ],
    fsdAcceptanceCriteria: [
      {
        id: 'AC-BANK-001',
        userStory: 'Mettre a jour les coordonnees',
        criterionDescription: 'Mise a jour des coordonnees client',
        given: 'le client est authentifie',
        when: 'il met a jour ses coordonnees',
        then: 'le systeme confirme la mise a jour',
        status: 'open',
      },
      {
        id: 'AC-BANK-002',
        userStory: 'Appliquer les regles de conformite',
        criterionDescription: 'Controle de conformite',
        given: 'une operation est soumise',
        when: 'le controle de conformite est lance',
        then: 'le systeme valide ou bloque l operation',
        status: 'pass',
      },
      {
        id: 'AC-BANK-003',
        userStory: 'Exporter un rapport de suivi',
        criterionDescription: 'Export de rapport',
        given: 'des operations sont disponibles',
        when: 'l utilisateur exporte le rapport',
        then: 'le systeme genere un fichier telechargeable',
        status: 'open',
      },
    ],
    fsdGlossaryEntries: [
      { term: 'Compte', comment: 'Compte bancaire client.' },
      { term: 'Operation', comment: 'Transaction bancaire realisee par un client.' },
      { term: 'Conformite', comment: 'Respect des obligations reglementaires.' },
    ],
    fsdReferenceDocuments: [
      { name: 'Reglement PSD2', type: 'PDF', attachment: 'psd2.pdf' },
      { name: 'Guide interne', type: 'Lien', attachment: 'https://docs.banquenova.example.com' },
    ],
    fsdRevisions: [
      {
        date: new Date('2026-04-05'),
        version: '0.8',
        status: 'Brouillon',
        author: 'Yanis Dupont',
      },
      {
        date: new Date('2026-04-22'),
        version: '1.0',
        status: 'Valide',
        author: 'Yanis Dupont',
      },
    ],
    testSuites: buildTestSuites('Banque Digitale'),
    epics: buildEpics('BANK-002', 'Banque Digitale', 'banque', 'Core Banking'),
  },
  {
    prefix: 'HEALTH-003',
    name: 'Sante Connectee',
    description:
      'Plateforme sante pour la gestion des dossiers patients, rendez-vous et suivi medical.',
    clientName: 'Clinique Horizon',
    projectOwner: 'Sarah Lemoine',
    openDefects: 5,
    platforms: [Platform.WEB, Platform.MOBILE],
    approvals: [
      {
        approverName: 'Imane Costa',
        approverRole: 'QA Lead',
        approvalDate: new Date('2026-04-16'),
      },
      {
        approverName: 'Paul Girard',
        approverRole: 'Product Owner',
        approvalDate: new Date('2026-04-17'),
      },
    ],
    environments: [
      {
        name: 'Integration',
        url: 'https://int.santeconnectee.example.com',
        description: 'Environnement d\'integration.',
        status: 'Projet',
        items: [
          { environmentKey: 'API_URL', value: 'https://api.int.santeconnectee.example.com' },
          { environmentKey: 'FEATURE_FLAGS', value: 'story-images=true' },
        ],
      },
      {
        name: 'Production',
        url: 'https://santeconnectee.example.com',
        description: 'Environnement de production.',
        status: 'Projet',
        items: [
          { environmentKey: 'API_URL', value: 'https://api.santeconnectee.example.com' },
          { environmentKey: 'FEATURE_FLAGS', value: 'story-images=true' },
        ],
      },
    ],
    documentVersions: [
      {
        documentType: 'fsd',
        documentName: 'FSD Sante Connectee',
        threadId: 'fsd-health-003',
        versionNumber: 1,
        status: DocumentVersionStatus.IN_PROGRESS,
        createdByName: 'Sarah Lemoine',
        createdByInitials: 'SL',
        payloadSnapshot: {
          title: 'FSD Sante Connectee',
          projectName: 'Sante Connectee',
          clientName: 'Clinique Horizon',
          version: '1.0',
        },
      },
      {
        documentType: 'cahier',
        documentName: 'Cahier Sante Connectee',
        threadId: 'cahier-health-003',
        versionNumber: 1,
        status: DocumentVersionStatus.DRAFT,
        createdByName: 'Sarah Lemoine',
        createdByInitials: 'SL',
        payloadSnapshot: {
          title: 'Cahier de recette - Sante Connectee',
          projectName: 'Sante Connectee',
          clientName: 'Clinique Horizon',
          version: '1.0',
        },
      },
    ],
    fsdDashboardScreenshots: [
      {
        url: '/templates/pdf/fsd/health-dashboard-1.png',
        altText: 'Vue patient',
        caption: 'Suivi des dossiers patients et alertes cliniques.',
      },
      {
        url: '/templates/pdf/fsd/health-dashboard-2.png',
        altText: 'Vue rendez-vous',
        caption: 'Planning des rendez-vous et priorites medicales.',
      },
    ],
    fsdNavigationItems: [
      {
        label: 'Tableau de bord',
        targetPage: '/dashboard',
        type: 'menu',
        accessRoles: ['Admin', 'QA', 'Manager'],
      },
      {
        label: 'Dossiers patients',
        targetPage: '/patients',
        type: 'menu',
        accessRoles: ['Admin', 'QA', 'BA'],
      },
      {
        label: 'Rendez-vous',
        targetPage: '/appointments',
        type: 'menu',
        accessRoles: ['Admin', 'QA'],
      },
      {
        label: 'Environnements',
        targetPage: '/environment',
        type: 'menu',
        accessRoles: ['Admin', 'QA'],
      },
    ],
    fsdFunctionalModules: [
      {
        title: 'Gestion des dossiers patients',
        description: 'Creation et suivi des dossiers medicaux.',
      },
      {
        title: 'Planning medical',
        description: 'Gestion des rendez-vous et notifications.',
      },
      {
        title: 'Suivi qualite',
        description: 'Controle des indicateurs et audits cliniques.',
      },
    ],
    fsdBusinessRules: [
      {
        id: 'BR-HEALTH-001',
        title: 'Confidentialite des dossiers',
        description: 'Les dossiers patients sont accessibles uniquement aux roles autorises.',
        priority: 'HIGH',
        source: 'RGPD',
      },
      {
        id: 'BR-HEALTH-002',
        title: 'Historique des actions',
        description: 'Chaque action sur un dossier patient est tracee.',
        priority: 'HIGH',
        source: 'Audit clinique',
      },
      {
        id: 'BR-HEALTH-003',
        title: 'Validation des rendez-vous',
        description: 'Les rendez-vous doivent etre confirmes avant planification.',
        priority: 'MEDIUM',
        source: 'Procedure interne',
      },
    ],
    fsdAcceptanceCriteria: [
      {
        id: 'AC-HEALTH-001',
        userStory: 'Ajouter des pieces justificatives',
        criterionDescription: 'Pieces medicales',
        given: 'le patient a un dossier actif',
        when: 'le praticien ajoute une piece justificative',
        then: 'le systeme rattache la piece au dossier',
        status: 'open',
      },
      {
        id: 'AC-HEALTH-002',
        userStory: 'Consulter les indicateurs cles',
        criterionDescription: 'KPIs medicaux',
        given: 'des statistiques sont disponibles',
        when: 'l utilisateur ouvre le tableau de bord',
        then: 'les indicateurs cles sont affiches',
        status: 'pass',
      },
      {
        id: 'AC-HEALTH-003',
        userStory: 'Notifier les validations',
        criterionDescription: 'Notification de validation',
        given: 'un dossier est valide',
        when: 'la validation est finalisee',
        then: 'le systeme notifie les equipes concernes',
        status: 'open',
      },
    ],
    fsdGlossaryEntries: [
      { term: 'Dossier patient', comment: 'Informations medicales centralisees.' },
      { term: 'Rendez-vous', comment: 'Planification d\'une consultation.' },
      { term: 'Confidentialite', comment: 'Acces restreint aux donnees sensibles.' },
    ],
    fsdReferenceDocuments: [
      { name: 'Guide medical', type: 'PDF', attachment: 'guide-medical.pdf' },
      { name: 'Process clinique', type: 'Lien', attachment: 'https://docs.horizon.example.com' },
    ],
    fsdRevisions: [
      {
        date: new Date('2026-04-02'),
        version: '0.7',
        status: 'Brouillon',
        author: 'Sarah Lemoine',
      },
      {
        date: new Date('2026-04-23'),
        version: '1.0',
        status: 'Valide',
        author: 'Sarah Lemoine',
      },
    ],
    testSuites: buildTestSuites('Sante Connectee'),
    epics: buildEpics('HEALTH-003', 'Sante Connectee', 'sante', 'Dossier Medical'),
  },

    {
    prefix: 'STRESS-004',
    name: 'Volume Test',
    description:
      'Projet de stress test pour valider la generation de documents volumineux.',
    clientName: 'Stress Corp',
    projectOwner: 'Load Tester',
    openDefects: 0,
    platforms: [Platform.WEB],
    approvals: [],
    environments: [],
    documentVersions: [],
    fsdDashboardScreenshots: [],
    fsdNavigationItems: [],
    fsdFunctionalModules: [],
    fsdBusinessRules: [],
    fsdAcceptanceCriteria: [],
    fsdGlossaryEntries: [],
    fsdReferenceDocuments: [],
    fsdRevisions: [],
    testSuites: buildVolumeTestSuites(20, 20),   // 400 test cases
    epics: buildVolumeEpics(40, 5, 2),           // 400 user stories
  },

];

function buildProjectCreateInput(seed: ProjectSeed) {
  return {
    prefix: seed.prefix,
    name: seed.name,
    description: seed.description,
    status: ProjectStatus.ACTIVE,
    clientName: seed.clientName,
    projectOwner: seed.projectOwner,
    openDefects: seed.openDefects,
    platforms: seed.platforms,
    approvals: {
      create: seed.approvals.map((approval) => ({
        approverName: approval.approverName,
        approverRole: approval.approverRole,
        approvalDate: approval.approvalDate,
      })),
    },
    documentVersions: {
      create: seed.documentVersions.map((version) => ({
        documentType: version.documentType,
        documentName: version.documentName,
        threadId: version.threadId,
        versionNumber: version.versionNumber,
        status: version.status,
        createdByName: version.createdByName,
        createdByInitials: version.createdByInitials,
        payloadSnapshot: version.payloadSnapshot,
      })),
    },
    environment: {
      create: seed.environments.map((env) => ({
        name: env.name,
        url: env.url,
        description: env.description,
        status: env.status ?? 'Projet',
        envItems: {
          create: env.items.map((item) => ({
            environmentKey: item.environmentKey,
            value: item.value,
          })),
        },
      })),
    },
    fsdDashboardScreenshots: {
      create: seed.fsdDashboardScreenshots.map((shot, index) => ({
        url: shot.url,
        altText: shot.altText,
        caption: shot.caption,
        order: index + 1,
      })),
    },
    fsdNavigationItems: {
      create: seed.fsdNavigationItems.map((item, index) => ({
        label: item.label,
        targetPage: item.targetPage,
        type: item.type,
        accessRoles: item.accessRoles.join(', '),
        order: index + 1,
      })),
    },
    fsdFunctionalModules: {
      create: seed.fsdFunctionalModules.map((module, index) => ({
        title: module.title,
        description: module.description,
        order: index + 1,
      })),
    },
    fsdBusinessRules: {
      create: seed.fsdBusinessRules.map((rule, index) => ({
        ruleId: rule.id,
        title: rule.title,
        description: rule.description,
        priority: rule.priority,
        source: rule.source,
        order: index + 1,
      })),
    },
    fsdAcceptanceCriteria: {
      create: seed.fsdAcceptanceCriteria.map((criterion, index) => ({
        criteriaId: criterion.id,
        userStory: criterion.userStory,
        criterionDescription:
          criterion.criterionDescription || `Critere ${index + 1}`,
        given: criterion.given,
        when: criterion.when,
        then: criterion.then,
        status: criterion.status,
        order: index + 1,
      })),
    },
    fsdGlossaryEntries: {
      create: seed.fsdGlossaryEntries.map((entry, index) => ({
        term: entry.term,
        comment: entry.comment,
        order: index + 1,
      })),
    },
    fsdReferenceDocuments: {
      create: seed.fsdReferenceDocuments.map((doc, index) => ({
        name: doc.name,
        type: doc.type,
        attachment: doc.attachment,
        order: index + 1,
      })),
    },
    fsdRevisions: {
      create: seed.fsdRevisions.map((revision, index) => ({
        date: revision.date,
        version: revision.version,
        status: revision.status,
        author: revision.author,
        order: index + 1,
      })),
    },
    epics: {
      create: seed.epics.map((epic, epicIndex) => ({
        name: epic.name,
        description: epic.description,
        priority: epic.priority ?? EpicPriority.MEDIUM,
        status: epic.status ?? EpicStatus.NEW,
        features: {
          create: epic.features.map((feature, featureIndex) => ({
            name: feature.name,
            description: feature.description,
            priority: feature.priority ?? FeaturePriority.MEDIUM,
            status: feature.status ?? FeatureStatus.NEW,
            userStories: {
              create: feature.userStories.map((story, storyIndex) => ({
                name: story.name,
                description: story.description,
                priority: story.priority ?? StoryPriority.MEDIUM,
                status: story.status ?? StoryStatus.TO_DO,
                fsdAcceptanceCriteria: {
                  create: story.acceptanceCriteria.map((criterion, criterionIndex) => ({
                    criteriaId: `AC-${seed.prefix}-${epicIndex + 1}-${featureIndex + 1}-${storyIndex + 1}-${criterionIndex + 1}`,
                    criterionDescription:
                      criterion.criterionDescription || `Critere ${criterionIndex + 1}`,
                    given: criterion.given,
                    when: criterion.when,
                    then: criterion.then,
                    status: criterion.status ?? 'open',
                    order: criterionIndex + 1,
                  })),
                },
                fsdBusinessRules: {
                  create: (story.businessRules || []).map((rule, ruleIndex) => ({
                    ruleId: `BR-${seed.prefix}-${epicIndex + 1}-${featureIndex + 1}-${storyIndex + 1}-${ruleIndex + 1}`,
                    title: rule.title,
                    description: rule.description,
                    priority: rule.priority,
                    source: rule.source,
                    order: ruleIndex + 1,
                  })),
                },
                fsdIntegrations: {
                  create: (story.integrations || []).map((item, itemIndex) => ({
                    action: item.action,
                    integration: item.integration,
                    order: itemIndex + 1,
                  })),
                },
              })),
            },
          })),
        },
      })),
    },
    testSuites: {
      create: seed.testSuites.map((suite) => ({
        name: suite.name,
        order: suite.order,
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
  };
}

async function resetDatabase() {
  await prisma.fsdUserStoryImage.deleteMany({});
  await prisma.fsdUserStoryAcceptanceCriterion.deleteMany({});
  await prisma.fsdUserStoryBusinessRule.deleteMany({});
  await prisma.fsdUserStoryIntegration.deleteMany({});
  await prisma.testStep.deleteMany({});
  await prisma.precondition.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.testSuite.deleteMany({});
  await prisma.documentApproval.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.fsdAcceptanceCriteria.deleteMany({});
  await prisma.fsdBusinessRule.deleteMany({});
  await prisma.fsdDashboardScreenshot.deleteMany({});
  await prisma.fsdFunctionalModule.deleteMany({});
  await prisma.fsdGlossary.deleteMany({});
  await prisma.fsdNavigationItem.deleteMany({});
  await prisma.fsdReferenceDocument.deleteMany({});
  await prisma.fsdRevision.deleteMany({});
  await prisma.userStory.deleteMany({});
  await prisma.feature.deleteMany({});
  await prisma.epic.deleteMany({});
  await prisma.envItem.deleteMany({});
  await prisma.environment.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
}

async function main() {
  //await resetDatabase();

  const adminPassword = await hash('admin1234', 10);
  const qaPassword = await hash('qa1234', 10);
  const baPassword = await hash('ba1234', 10);

  /*await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        email: 'admin@testlab.local',
        passwordHash: adminPassword,
        role: UserRole.ADMIN,
      },
      {
        username: 'qa',
        email: 'qa@testlab.local',
        passwordHash: qaPassword,
        role: UserRole.QA,
      },
      {
        username: 'ba',
        email: 'ba@testlab.local',
        passwordHash: baPassword,
        role: UserRole.BA,
      },
    ],
  });*/

  for (const seed of projectSeeds) {
    await prisma.project.create({
      data: buildProjectCreateInput(seed),
    });
  }

  console.log('Seed completed!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
