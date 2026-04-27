import {
  DocumentStatus,
  IRichEditPageStyle,
  IRichEditSectionBackgroundValues,
  IGenerateCahierPayload,
  IGenerateFsdPayload,
} from "@/services";

const DEFAULT_FSD_SECTION_ORDER = [
  "metadata",
  "description",
  "revisions",
  "approvals",
  "references",
  "glossary",
] as const;

const DEFAULT_CAHIER_SECTION_ORDER = ["metadata", "context", "approvals"] as const;

type FsdSectionId = (typeof DEFAULT_FSD_SECTION_ORDER)[number];
type CahierSectionId = (typeof DEFAULT_CAHIER_SECTION_ORDER)[number];

function normalizeAuthors(authors: unknown, author?: unknown): string[] {
  const normalized = Array.isArray(authors)
    ? authors
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  if (typeof author === "string" && author.trim().length > 0) {
    return [author.trim()];
  }

  return [""];
}

function joinAuthors(authors: string[]): string {
  return authors
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join("; ");
}

export interface IWorkflowSelectionContext {
  projectId: string;
  selectedEpicIds?: string[];
  selectedFeatureIds?: string[];
  selectedUserStoryIds?: string[];
  selectedSuiteIds?: string[];
  selectedTestCaseIds?: string[];
}

export interface IFsdWorkflowDetailsInput {
  projectName: string;
  clientName: string;
  title: string;
  version: string;
  date: string;
  authors: string[];
  status: DocumentStatus;
  purpose: string;
  projectOverview: string;
  methodology: string;
  approvals: Array<{ name: string; role: string; date: string }>;
  referenceDocuments: Array<{
    name: string;
    type: string;
    attachment: string;
  }>;
  glossary: Array<{ term: string; comment: string }>;
  revisions: Array<{
    date: string;
    version: string;
    status: string;
    authors: string[];
    author?: string;
  }>;
}

export interface ICahierWorkflowDetailsInput {
  projectName: string;
  clientName: string;
  title: string;
  version: string;
  date: string;
  authors: string[];
  status: DocumentStatus;
  description: string;
  objective: string;
  projectOwner: string;
  approvals: Array<{
    approverName: string;
    approverRole: string;
    approvalDate: string;
  }>;
}

export interface IFsdStepThreeDraft {
  documentType: "fsd";
  projectId: string;
  selectedEpicIds: string[];
  selectedFeatureIds: string[];
  selectedUserStoryIds: string[];
  title: string;
  projectName: string;
  clientName: string;
  version: string;
  date: string;
  authors: string[];
  status: DocumentStatus;
  purpose: string;
  projectOverview: string;
  methodology: string;
  approvals: Array<{ name: string; role: string; date: string }>;
  referenceDocuments: Array<{
    name: string;
    type: string;
    attachment: string;
  }>;
  glossary: Array<{ term: string; comment: string }>;
  richEditValues: Record<string, string>;
  sectionBackgroundValues: IRichEditSectionBackgroundValues;
  pageStyle: IRichEditPageStyle;
  revisions: Array<{
    date: string;
    version: string;
    status: string;
    authors: string[];
    author?: string;
  }>;
  editValues: Record<string, string>;
  sectionOrder: FsdSectionId[];
}

export interface ICahierStepThreeDraft {
  documentType: "cahier";
  projectId: string;
  selectedSuiteIds: string[];
  selectedTestCaseIds: string[];
  title: string;
  projectName: string;
  clientName: string;
  version: string;
  date: string;
  authors: string[];
  status: DocumentStatus;
  description: string;
  objective: string;
  projectOwner: string;
  approvals: Array<{
    approverName: string;
    approverRole: string;
    approvalDate: string;
  }>;
  editValues: Record<string, string>;
  richEditValues: Record<string, string>;
  sectionBackgroundValues: IRichEditSectionBackgroundValues;
  pageStyle: IRichEditPageStyle;
  sectionOrder: CahierSectionId[];
}

function normalizeFsdSectionOrder(value: unknown): FsdSectionId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_FSD_SECTION_ORDER];
  }

  const filtered = value.filter((item): item is FsdSectionId =>
    DEFAULT_FSD_SECTION_ORDER.includes(item as FsdSectionId)
  );

  return filtered.length > 0 ? filtered : [...DEFAULT_FSD_SECTION_ORDER];
}

function normalizeCahierSectionOrder(value: unknown): CahierSectionId[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_CAHIER_SECTION_ORDER];
  }

  const filtered = value.filter((item): item is CahierSectionId =>
    DEFAULT_CAHIER_SECTION_ORDER.includes(item as CahierSectionId)
  );

  return filtered.length > 0 ? filtered : [...DEFAULT_CAHIER_SECTION_ORDER];
}

export function createFsdDraftFromPayloadSnapshot(
  payloadSnapshot: Record<string, unknown>,
  fallbackSelection: IWorkflowSelectionContext
): IFsdStepThreeDraft {
  return {
    documentType: "fsd",
    projectId: (payloadSnapshot.projectId as string) || fallbackSelection.projectId,
    selectedEpicIds:
      (payloadSnapshot.selectedEpicIds as string[]) ||
      fallbackSelection.selectedEpicIds ||
      [],
    selectedFeatureIds:
      (payloadSnapshot.selectedFeatureIds as string[]) ||
      fallbackSelection.selectedFeatureIds ||
      [],
    selectedUserStoryIds:
      (payloadSnapshot.selectedUserStoryIds as string[]) ||
      fallbackSelection.selectedUserStoryIds ||
      [],
    title: (payloadSnapshot.title as string) || "",
    projectName: (payloadSnapshot.projectName as string) || "",
    clientName: (payloadSnapshot.clientName as string) || "",
    version: (payloadSnapshot.version as string) || "",
    date: (payloadSnapshot.date as string) || "",
    authors: normalizeAuthors(payloadSnapshot.authors, payloadSnapshot.author),
    status: (payloadSnapshot.status as DocumentStatus) || "En cours",
    purpose: (payloadSnapshot.purpose as string) || "",
    projectOverview: (payloadSnapshot.projectOverview as string) || "",
    methodology: (payloadSnapshot.methodology as string) || "",
    approvals: (payloadSnapshot.approvals as IFsdStepThreeDraft["approvals"]) || [],
    referenceDocuments:
      (payloadSnapshot.referenceDocuments as IFsdStepThreeDraft["referenceDocuments"]) ||
      [],
    glossary: (payloadSnapshot.glossary as IFsdStepThreeDraft["glossary"]) || [],
    revisions: ((payloadSnapshot.revisions as IFsdStepThreeDraft["revisions"]) || []).map(
      (item) => ({
        ...item,
        authors: normalizeAuthors(item.authors, item.author),
      })
    ),
    editValues: (payloadSnapshot.editValues as Record<string, string>) || {},
    richEditValues: (payloadSnapshot.richEditValues as Record<string, string>) || {},
    sectionBackgroundValues:
      (payloadSnapshot.sectionBackgroundValues as IRichEditSectionBackgroundValues) || {},
    pageStyle: (payloadSnapshot.pageStyle as IRichEditPageStyle) || {
      backgroundColor: "#ffffff",
    },
    sectionOrder: normalizeFsdSectionOrder(payloadSnapshot.sectionOrder),
  };
}

export function createFsdDraftFromWorkflowDetails(
  details: IFsdWorkflowDetailsInput,
  selection: IWorkflowSelectionContext
): IFsdStepThreeDraft {
  return {
    documentType: "fsd",
    projectId: selection.projectId,
    selectedEpicIds: selection.selectedEpicIds || [],
    selectedFeatureIds: selection.selectedFeatureIds || [],
    selectedUserStoryIds: selection.selectedUserStoryIds || [],
    title: details.title,
    projectName: details.projectName,
    clientName: details.clientName,
    version: details.version,
    date: details.date,
    authors: normalizeAuthors(details.authors),
    status: details.status,
    purpose: details.purpose,
    projectOverview: details.projectOverview,
    methodology: details.methodology,
    approvals: details.approvals,
    referenceDocuments: details.referenceDocuments,
    glossary: details.glossary,
    revisions: details.revisions,
    editValues: {},
    richEditValues: {},
    sectionBackgroundValues: {},
    pageStyle: {
      backgroundColor: "#ffffff",
    },
    sectionOrder: [...DEFAULT_FSD_SECTION_ORDER],
  };
}

export function mapFsdDraftToGeneratePayload(
  draft: IFsdStepThreeDraft,
  options?: {
    sourceVersionId?: string;
    threadId?: string;
    createdByName?: string;
    language?: "en" | "fr";
    mode?: string;
  }
): IGenerateFsdPayload {
  return {
    projectId: draft.projectId,
    selectedEpicIds: draft.selectedEpicIds,
    selectedFeatureIds: draft.selectedFeatureIds,
    selectedUserStoryIds: draft.selectedUserStoryIds,
    title: draft.title,
    projectName: draft.projectName,
    clientName: draft.clientName,
    version: draft.version,
    date: draft.date,
    authors: normalizeAuthors(draft.authors),
    author: joinAuthors(draft.authors),
    status: draft.status,
    purpose: draft.purpose,
    projectOverview: draft.projectOverview,
    methodology: draft.methodology,
    approvals: draft.approvals,
    referenceDocuments: draft.referenceDocuments,
    glossary: draft.glossary,
    revisions: draft.revisions.map((item) => ({
      ...item,
      authors: normalizeAuthors(item.authors, item.author),
      author: joinAuthors(normalizeAuthors(item.authors, item.author)),
    })),
    editValues: draft.editValues,
    richEditValues: draft.richEditValues,
    sectionBackgroundValues: draft.sectionBackgroundValues,
    pageStyle: draft.pageStyle,
    sourceVersionId: options?.sourceVersionId,
    threadId: options?.threadId,
    createdByName: options?.createdByName,
    language: options?.language,
    mode: options?.mode,
  };
}

export function createCahierDraftFromPayloadSnapshot(
  payloadSnapshot: Record<string, unknown>,
  fallbackSelection: IWorkflowSelectionContext
): ICahierStepThreeDraft {
  return {
    documentType: "cahier",
    projectId: (payloadSnapshot.projectId as string) || fallbackSelection.projectId,
    selectedSuiteIds:
      (payloadSnapshot.selectedSuiteIds as string[]) ||
      fallbackSelection.selectedSuiteIds ||
      [],
    selectedTestCaseIds:
      (payloadSnapshot.selectedTestCaseIds as string[]) ||
      fallbackSelection.selectedTestCaseIds ||
      [],
    title: (payloadSnapshot.title as string) || "",
    projectName: (payloadSnapshot.projectName as string) || "",
    clientName: (payloadSnapshot.clientName as string) || "",
    version: (payloadSnapshot.version as string) || "",
    date: (payloadSnapshot.date as string) || "",
    authors: normalizeAuthors(payloadSnapshot.authors, payloadSnapshot.author),
    status: (payloadSnapshot.status as DocumentStatus) || "En cours",
    description: (payloadSnapshot.description as string) || "",
    objective: (payloadSnapshot.objective as string) || "",
    projectOwner: (payloadSnapshot.projectOwner as string) || "",
    approvals: (payloadSnapshot.approvals as ICahierStepThreeDraft["approvals"]) || [],
    editValues: (payloadSnapshot.editValues as Record<string, string>) || {},
    richEditValues: (payloadSnapshot.richEditValues as Record<string, string>) || {},
    sectionBackgroundValues:
      (payloadSnapshot.sectionBackgroundValues as IRichEditSectionBackgroundValues) || {},
    pageStyle: (payloadSnapshot.pageStyle as IRichEditPageStyle) || {
      backgroundColor: "#ffffff",
    },
    sectionOrder: normalizeCahierSectionOrder(payloadSnapshot.sectionOrder),
  };
}

export function createCahierDraftFromWorkflowDetails(
  details: ICahierWorkflowDetailsInput,
  selection: IWorkflowSelectionContext
): ICahierStepThreeDraft {
  return {
    documentType: "cahier",
    projectId: selection.projectId,
    selectedSuiteIds: selection.selectedSuiteIds || [],
    selectedTestCaseIds: selection.selectedTestCaseIds || [],
    title: details.title,
    projectName: details.projectName,
    clientName: details.clientName,
    version: details.version,
    date: details.date,
    authors: normalizeAuthors(details.authors),
    status: details.status,
    description: details.description,
    objective: details.objective,
    projectOwner: details.projectOwner,
    approvals: details.approvals,
    editValues: {},
    richEditValues: {},
    sectionBackgroundValues: {},
    pageStyle: {
      backgroundColor: "#ffffff",
    },
    sectionOrder: [...DEFAULT_CAHIER_SECTION_ORDER],
  };
}

export function mapCahierDraftToGeneratePayload(
  draft: ICahierStepThreeDraft,
  options?: {
    sourceVersionId?: string;
    threadId?: string;
    createdByName?: string;
    language?: "en" | "fr";
    mode?: string;
  }
): IGenerateCahierPayload {
  return {
    projectId: draft.projectId,
    selectedSuiteIds: draft.selectedSuiteIds,
    selectedTestCaseIds: draft.selectedTestCaseIds,
    title: draft.title,
    projectName: draft.projectName,
    clientName: draft.clientName,
    version: draft.version,
    date: draft.date,
    authors: normalizeAuthors(draft.authors),
    author: joinAuthors(draft.authors),
    status: draft.status,
    description: draft.description,
    objective: draft.objective,
    projectOwner: draft.projectOwner,
    approvals: draft.approvals,
    editValues: draft.editValues,
    richEditValues: draft.richEditValues,
    sectionBackgroundValues: draft.sectionBackgroundValues,
    pageStyle: draft.pageStyle,
    sourceVersionId: options?.sourceVersionId,
    threadId: options?.threadId,
    createdByName: options?.createdByName,
    language: options?.language,
    mode: options?.mode,
  };
}

export const STEP_THREE_SECTION_ORDER = {
  fsd: DEFAULT_FSD_SECTION_ORDER,
  cahier: DEFAULT_CAHIER_SECTION_ORDER,
};
