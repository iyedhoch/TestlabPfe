export type DocumentType = "cahier" | "fsd";
export type DocumentFormat = "pdf" | "word" | "excel";
export type DocumentStatus = "Brouillon" | "En cours" | "Complete";

export interface IExportDocumentPayload {
  projectId: string;
  documentType: DocumentType;
  format: DocumentFormat;
  language?: "en" | "fr";
  mode?: string;
  pathSuffix?: string;
}

export interface IFsdSelectionEpic {
  id: string;
  name: string;
  featureCount: number;
  userStoryCount: number;
  features: IFsdSelectionFeature[];
}

export interface IFsdSelectionFeature {
  id: string;
  name: string;
  userStoryCount: number;
  userStories: IFsdSelectionUserStory[];
}

export interface IFsdSelectionUserStory {
  id: string;
  name: string;
}

export interface ICahierSelectionTestCase {
  id: string;
  name: string;
}

export interface ICahierSelectionSuite {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  testCaseCount: number;
  childSuiteCount: number;
  testCases: ICahierSelectionTestCase[];
}

export interface IDocumentStepOneSelectionPayload {
  projectId: string;
  documentType: DocumentType;
  selectedEpicIds: string[];
  selectedSuiteIds: string[];
}

export interface IFsdDefinitionInput {
  term: string;
  definition: string;
}

export interface IFsdApprovalInput {
  name: string;
  role: string;
  date: string;
}

export interface IFsdReferenceDocumentInput {
  name: string;
  type: string;
  attachment: string;
}

export interface IFsdGlossaryInput {
  term: string;
  comment: string;
}

export interface IFsdRevisionInput {
  date: string;
  version: string;
  status: string;
  authors: string[];
  author?: string;
}

export interface IGenerateFsdPayload {
  projectId: string;
  selectedEpicIds?: string[];
  selectedFeatureIds?: string[];
  selectedUserStoryIds?: string[];
  title?: string;
  projectName?: string;
  clientName?: string;
  version?: string;
  date?: string;
  authors?: string[];
  author?: string;
  purpose?: string;
  projectOverview?: string;
  methodology?: string;
  approvals?: IFsdApprovalInput[];
  referenceDocuments?: IFsdReferenceDocumentInput[];
  glossary?: IFsdGlossaryInput[];
  revisions?: IFsdRevisionInput[];
  editValues?: Record<string, string>;
  language?: "en" | "fr";
  mode?: string;
  status?: DocumentStatus;
  sourceVersionId?: string;
  threadId?: string;
  createdByName?: string;
}

export interface IGenerateCahierPayload {
  projectId: string;
  selectedSuiteIds?: string[];
  selectedTestCaseIds?: string[];
  title?: string;
  projectName?: string;
  clientName?: string;
  version?: string;
  date?: string;
  authors?: string[];
  author?: string;
  description?: string;
  objective?: string;
  projectOwner?: string;
  approvals?: Array<{
    approverName: string;
    approverRole: string;
    approvalDate: string;
  }>;
  language?: "en" | "fr";
  mode?: string;
  status?: DocumentStatus;
  sourceVersionId?: string;
  threadId?: string;
  createdByName?: string;
}

export interface IDocumentVersionListItem {
  id: string;
  projectId: string;
  documentType: DocumentType;
  documentName: string;
  threadId: string;
  versionNumber: number;
  status: DocumentStatus;
  createdByName: string;
  createdByInitials: string;
  sourceVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IDocumentVersionDetail extends IDocumentVersionListItem {
  payloadSnapshot: Record<string, unknown>;
}

export interface IDownloadDocumentVersionPayload {
  versionId: string;
  format: DocumentFormat;
}

export interface IGetDocumentPreviewHtmlPayload {
  projectId: string;
  documentType: DocumentType;
  language?: "en" | "fr";
  mode?: string;
}

export interface IGetDocumentPreviewHtmlFromPayload {
  projectId: string;
  documentType: DocumentType;
  payload: IGenerateFsdPayload | IGenerateCahierPayload;
}
