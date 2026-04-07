import type { CahierRecetteDocument } from '../document-generation/interfaces/cahier-recette.interface';

export const CAHIER_RECETTE_DOCUMENT: CahierRecetteDocument = {
  metadata: {
    title: 'Cahier de Recette - Portail Contrats Assurances IARD',
    clientName: 'Mutuelle Horizon Assurances',
    author: 'Equipe Qualification SI Contrats',
    version: '1.3',
    date: '2026-03-23',
    companyLogo: 'src/mock-data/logo-proxym-png.jpg',
  },
  context: {
    description:
      'Ce document formalise les scenarios de recette fonctionnelle pour la gestion des contrats, avenants et sinistres dans le portail de souscription et de suivi client.',
    objective:
      'Valider la conformite des parcours critiques metier avant mise en production: souscription, gestion du cycle de vie du contrat, declaration de sinistre et indemnisation.',
  },
  project: {
    id: 1,
    name: 'Portail Contrats Assurances IARD',
    owner: 'Equipe Qualification SI Contrats',
  },
  suites: [
    {
      id: 'suite-contrat',
      name: 'Gestion des contrats',
      children: [
        {
          id: 'suite-contrat-souscription',
          name: 'Souscription initiale',
          children: [],
          testCases: [
            {
              id: 'tc-001',
              code: 'ASA-1376',
              name: "Creation d'un contrat auto particulier",
              summary:
                "Verifier qu'un gestionnaire peut creer un contrat auto avec calcul de prime et edition des conditions particulieres.",
              preconditions: [
                {
                  order: 1,
                  content:
                    'Le produit Auto Tous Risques est actif dans le referentiel tarifaire.',
                },
                {
                  order: 2,
                  content:
                    'Le profil gestionnaire agence dispose du droit CREER_CONTRAT.',
                },
              ],
              steps: [
                {
                  order: 1,
                  action:
                    'Ouvrir le menu Souscription puis selectionner Nouveau contrat auto.',
                  expectedResult:
                    "Le formulaire de souscription auto s'affiche avec les sections Assure, Vehicule et Garanties.",
                },
                {
                  order: 2,
                  action:
                    'Saisir les informations du souscripteur et du vehicule puis enregistrer le devis.',
                  expectedResult:
                    'Le devis est cree avec un numero provisoire et un statut En attente de validation.',
                },
                {
                  order: 3,
                  action: 'Lancer le calcul de prime.',
                  expectedResult:
                    'La prime TTC annuelle est calculee et le detail des taxes est visible.',
                },
                {
                  order: 4,
                  action:
                    'Valider la souscription et generer les documents contractuels.',
                  expectedResult:
                    'Le contrat passe au statut Actif et les conditions particulieres PDF sont disponibles au telechargement.',
                },
              ],
            },
            {
              id: 'tc-002',
              code: 'ASA-1421',
              name: 'Blocage de souscription en cas de piece manquante',
              summary:
                "Verifier qu'une souscription est bloquee si le justificatif de permis de conduire est absent.",
              preconditions: [
                {
                  order: 1,
                  content:
                    'Le controle documentaire obligatoire est active pour le produit auto.',
                },
                {
                  order: 2,
                  content:
                    'Le dossier client ne contient aucune piece de type Permis de conduire.',
                },
              ],
              steps: [
                {
                  order: 1,
                  action:
                    'Demarrer une souscription auto pour un client existant.',
                  expectedResult:
                    'Le formulaire de souscription est accessible.',
                },
                {
                  order: 2,
                  action:
                    'Completer les donnees obligatoires puis tenter la validation finale.',
                  expectedResult:
                    'Le systeme refuse la validation et affiche une alerte Piece justificative manquante.',
                },
                {
                  order: 3,
                  action:
                    'Consulter le detail du blocage depuis le panneau de conformite.',
                  expectedResult:
                    "Le motif indique explicitement l'absence du permis de conduire avec le niveau d'erreur Bloquant.",
                },
                {
                  order: 4,
                  action:
                    'Televerser le justificatif requis et relancer la validation.',
                  expectedResult:
                    'Le blocage disparait et la souscription peut etre finalisee.',
                },
              ],
            },
          ],
        },
        {
          id: 'suite-contrat-avenants',
          name: 'Avenants et resiliation',
          children: [],
          testCases: [
            {
              id: 'tc-003',
              code: 'ASA-1490',
              name: 'Avenant de changement de formule de garanties',
              summary:
                "Verifier la prise en compte d'un passage de formule Tiers Etendu vers Tous Risques en milieu d'echeance.",
              preconditions: [
                {
                  order: 1,
                  content:
                    'Un contrat auto actif existe avec formule Tiers Etendu.',
                },
                {
                  order: 2,
                  content:
                    'La date du jour est comprise dans la periode de couverture.',
                },
              ],
              steps: [
                {
                  order: 1,
                  action:
                    'Depuis la fiche contrat, cliquer sur Creer un avenant.',
                  expectedResult:
                    "L'assistant d'avenant s'ouvre et propose les operations autorisees.",
                },
                {
                  order: 2,
                  action:
                    'Selectionner Changement de formule puis choisir Tous Risques.',
                  expectedResult:
                    'Le systeme recalcule la prime au prorata de la periode restante.',
                },
                {
                  order: 3,
                  action: "Valider l'avenant et confirmer la date d'effet.",
                  expectedResult:
                    'Le contrat est mis a jour avec un avenant numerote et historise.',
                },
                {
                  order: 4,
                  action: "Telecharger le document d'avenant.",
                  expectedResult:
                    "Le PDF contient la nouvelle formule, la date d'effet et le delta de cotisation.",
                },
              ],
            },
            {
              id: 'tc-004',
              code: 'ASA-1538',
              name: 'Resiliation a echeance avec preavis conforme',
              summary:
                'Verifier la resiliation a echeance annuelle avec respect du preavis contractuel de 2 mois.',
              preconditions: [
                {
                  order: 1,
                  content:
                    'Un contrat habitation actif arrive a echeance dans 70 jours.',
                },
                {
                  order: 2,
                  content:
                    'Le profil utilisateur possede le droit RESILIER_CONTRAT.',
                },
              ],
              steps: [
                {
                  order: 1,
                  action:
                    "Ouvrir le contrat habitation cible puis acceder a l'onglet Resiliation.",
                  expectedResult:
                    "Le motif et la date de prise d'effet sont editables.",
                },
                {
                  order: 2,
                  action:
                    "Saisir le motif Resiliation a echeance et confirmer la date d'echeance.",
                  expectedResult: 'Le controle preavis est valide sans erreur.',
                },
                {
                  order: 3,
                  action: 'Confirmer la resiliation.',
                  expectedResult:
                    "Le statut devient Resilie a echeance avec date d'effet planifiee.",
                },
                {
                  order: 4,
                  action:
                    'Verifier le journal des evenements et la lettre generee.',
                  expectedResult:
                    'Le journal trace la demande et la lettre de confirmation est archivee.',
                },
              ],
            },
          ],
        },
      ],
      testCases: [],
    },
    {
      id: 'suite-sinistre',
      name: 'Gestion des sinistres',
      children: [
        {
          id: 'suite-sinistre-declaration',
          name: 'Declaration de sinistre',
          children: [],
          testCases: [
            {
              id: 'tc-005',
              code: 'ASA-1612',
              name: "Declaration d'un sinistre auto materiel",
              summary:
                "Verifier qu'un sinistre materiel peut etre declare sur un contrat actif avec creation du dossier de gestion.",
              preconditions: [
                {
                  order: 1,
                  content: 'Le contrat auto est actif a la date du sinistre.',
                },
                {
                  order: 2,
                  content: 'Le client est rattache a un profil indemnisable.',
                },
              ],
              steps: [
                {
                  order: 1,
                  action:
                    'Depuis la fiche client, ouvrir le menu Declarer un sinistre.',
                  expectedResult:
                    "Le formulaire de declaration s'affiche avec le contrat preselectionne.",
                },
                {
                  order: 2,
                  action:
                    'Saisir la date, le lieu et les circonstances du sinistre.',
                  expectedResult:
                    'Les donnees sont enregistrees sans erreur de validation.',
                },
                {
                  order: 3,
                  action:
                    'Ajouter les photos du dommage et valider la declaration.',
                  expectedResult:
                    'Un numero de dossier sinistre est genere et le statut Initial est attribue.',
                },
                {
                  order: 4,
                  action: 'Consulter la timeline du dossier.',
                  expectedResult:
                    "La creation du dossier et les pieces jointes apparaissent dans l'historique.",
                },
              ],
            },
          ],
        },
        {
          id: 'suite-sinistre-indemnisation',
          name: 'Instruction et indemnisation',
          children: [],
          testCases: [
            {
              id: 'tc-006',
              code: 'ASA-1689',
              name: "Validation d'une proposition d'indemnisation",
              summary:
                "Verifier le workflow de validation manager pour une proposition d'indemnisation superieure au seuil delegation gestionnaire.",
              preconditions: [
                {
                  order: 1,
                  content:
                    'Un dossier sinistre est au statut Evaluation terminee.',
                },
                {
                  order: 2,
                  content:
                    'Le montant propose depasse le seuil de validation manager.',
                },
              ],
              steps: [
                {
                  order: 1,
                  action:
                    "Renseigner le montant d'indemnisation et soumettre la proposition.",
                  expectedResult:
                    'Le systeme affecte automatiquement la tache au manager indemnisation.',
                },
                {
                  order: 2,
                  action:
                    'Se connecter avec un profil manager et ouvrir la tache de validation.',
                  expectedResult:
                    'Les details du sinistre et les justificatifs financiers sont consultables.',
                },
                {
                  order: 3,
                  action: 'Approuver la proposition.',
                  expectedResult:
                    'Le dossier passe au statut Paiement en attente et une trace de validation est enregistree.',
                },
                {
                  order: 4,
                  action: "Declencher l'ordre de paiement.",
                  expectedResult:
                    'Le paiement est cree avec reference comptable et date de virement planifiee.',
                },
                {
                  order: 5,
                  action: 'Verifier la notification client.',
                  expectedResult:
                    "Un email de confirmation d'indemnisation est envoye au client.",
                },
              ],
            },
          ],
        },
      ],
      testCases: [],
    },
  ],
  approvals: [
    {
      name: 'Nadia Benyahia',
      role: 'Responsable Recette Metier',
      date: '2026-03-20',
    },
    {
      name: 'Karim El Mansouri',
      role: 'Product Owner Contrats',
      date: '2026-03-21',
    },
    {
      name: 'Sofia Haddad',
      role: 'Directrice Qualite SI',
      date: '2026-03-22',
    },
  ],
};
