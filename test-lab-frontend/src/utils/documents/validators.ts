export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface FsdWorkflowValidationInput {
  selectedProjectId?: string;
  workflowProjectId?: string | null;
  workflowDocumentType?: string;
  selectedEpicIds: string[];
}

interface CahierWorkflowValidationInput {
  selectedProjectId?: string;
  workflowProjectId?: string | null;
  workflowDocumentType?: string;
  selectedSuiteIds: string[];
}

interface FsdPayloadValidationInput {
  title: string;
  projectName: string;
  clientName: string;
  date: string;
  authors: string[];
  purpose: string;
  projectOverview?: string;
  methodology?: string;
  approvals: Array<{
    name: string;
    role: string;
    date: string;
  }>;
  referenceDocuments: Array<{
    name: string;
    type: string;
    attachment: string;
  }>;
  glossary?: Array<{
    term: string;
    comment: string;
  }>;
  revisions?: Array<{
    date: string;
    version: string;
    status: string;
    authors: string[];
  }>;
}

interface ApprovalValidationInput {
  approverName: string;
  approverRole: string;
  approvalDate: string;
}

interface CahierPayloadValidationInput {
  title: string;
  projectName: string;
  clientName: string;
  date: string;
  authors: string[];
  approvals: ApprovalValidationInput[];
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function hasAtLeastOneAuthor(values: string[]): boolean {
  return values.some((value) => hasText(value));
}

export function validateFsdWorkflowContext(
  input: FsdWorkflowValidationInput
): ValidationResult {
  if (!input.selectedProjectId) {
    return {
      isValid: false,
      message: "Aucun projet selectionne. Retournez a l'etape 1.",
    };
  }

  if (!input.workflowProjectId || input.workflowProjectId !== input.selectedProjectId) {
    return {
      isValid: false,
      message: "Le workflow ne correspond pas au projet actif. Recommencez l'etape 1.",
    };
  }

  if (input.workflowDocumentType !== "fsd") {
    return {
      isValid: false,
      message: "Le workflow actuel n'est pas un FSD. Retournez a l'etape 1.",
    };
  }

  if (input.selectedEpicIds.length === 0) {
    return {
      isValid: false,
      message: "Aucun epic selectionne. Retournez a l'etape 1 pour continuer.",
    };
  }

  return { isValid: true };
}

export function validateCahierWorkflowContext(
  input: CahierWorkflowValidationInput
): ValidationResult {
  if (!input.selectedProjectId) {
    return {
      isValid: false,
      message: "Aucun projet selectionne. Retournez a l'etape 1.",
    };
  }

  if (!input.workflowProjectId || input.workflowProjectId !== input.selectedProjectId) {
    return {
      isValid: false,
      message: "Le workflow ne correspond pas au projet actif. Recommencez l'etape 1.",
    };
  }

  if (input.workflowDocumentType !== "cahier") {
    return {
      isValid: false,
      message: "Le workflow actuel n'est pas un cahier. Retournez a l'etape 1.",
    };
  }

  if (input.selectedSuiteIds.length === 0) {
    return {
      isValid: false,
      message: "Aucune suite selectionnee. Retournez a l'etape 1 pour continuer.",
    };
  }

  return { isValid: true };
}

export function validateFsdPayload(input: FsdPayloadValidationInput): ValidationResult {
  if (!hasText(input.title)) {
    return { isValid: false, message: "Le titre du document est obligatoire." };
  }

  if (!hasText(input.projectName)) {
    return { isValid: false, message: "Le nom du projet est obligatoire." };
  }

  if (!hasText(input.clientName)) {
    return { isValid: false, message: "Le nom du client est obligatoire." };
  }

  if (!hasText(input.date)) {
    return { isValid: false, message: "La date est obligatoire." };
  }

  if (!hasAtLeastOneAuthor(input.authors)) {
    return { isValid: false, message: "Ajoutez au moins un auteur." };
  }

  if (!hasText(input.purpose)) {
    return { isValid: false, message: "L'objectif du document est obligatoire." };
  }

  const hasInvalidApproval = input.approvals.some(
    (approval) =>
      !hasText(approval.name) || !hasText(approval.role) || !hasText(approval.date)
  );

  if (hasInvalidApproval) {
    return {
      isValid: false,
      message: "Chaque approbation doit contenir un nom, un role et une date.",
    };
  }

  const hasInvalidReferenceDocument = input.referenceDocuments.some(
    (item) =>
      !hasText(item.name) || !hasText(item.type) || !hasText(item.attachment)
  );

  if (hasInvalidReferenceDocument) {
    return {
      isValid: false,
      message:
        "Chaque document de reference doit contenir un nom, un type et un attachement.",
    };
  }

  const hasInvalidRevision = (input.revisions || []).some(
    (item) =>
      !hasText(item.date) ||
      !hasText(item.version) ||
      !hasText(item.status) ||
      !hasAtLeastOneAuthor(item.authors || [])
  );

  if (hasInvalidRevision) {
    return {
      isValid: false,
      message: "Chaque revision doit contenir une date, une version, un statut et au moins un auteur.",
    };
  }

  return { isValid: true };
}

export function validateCahierPayload(
  input: CahierPayloadValidationInput
): ValidationResult {
  if (!hasText(input.title)) {
    return { isValid: false, message: "Le titre du document est obligatoire." };
  }

  if (!hasText(input.projectName)) {
    return { isValid: false, message: "Le nom du projet est obligatoire." };
  }

  if (!hasText(input.clientName)) {
    return { isValid: false, message: "Le nom du client est obligatoire." };
  }

  if (!hasText(input.date)) {
    return { isValid: false, message: "La date est obligatoire." };
  }

  if (!hasAtLeastOneAuthor(input.authors)) {
    return { isValid: false, message: "Ajoutez au moins un auteur." };
  }

  if (input.approvals.length === 0) {
    return {
      isValid: false,
      message: "Ajoutez au moins une approbation avant la generation.",
    };
  }

  const hasInvalidApproval = input.approvals.some(
    (approval) =>
      !hasText(approval.approverName) ||
      !hasText(approval.approverRole) ||
      !hasText(approval.approvalDate)
  );

  if (hasInvalidApproval) {
    return {
      isValid: false,
      message: "Chaque approbation doit contenir un nom, un role et une date.",
    };
  }

  return { isValid: true };
}
