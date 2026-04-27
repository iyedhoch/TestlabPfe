import type {
  Approval,
  Context,
  Metadata,
  ProjectInfo,
  Suite,
} from './cahier-recette.interface';
import type { FsdDocument } from './fsd.interface';

export type SupportedDocumentType = 'cahier' | 'fsd';

export interface DocumentTemplateSnapshot {
  id: string;
  name: string;
  title: string;
  footer: string;
  showStatistics: boolean;
  showExecutions: boolean;
  showPreconditions: boolean;
  showSteps: boolean;
  showApprovals: boolean;
  showContext: boolean;
  failedOnly: boolean;
}

export interface CahierDocumentModel {
  metadata: Metadata;
  editValues?: Record<string, string>;
  richEditValues?: Record<string, string>;
  sectionBackgroundValues?: Record<string, string>;
  pageStyle?: {
    backgroundColor?: string;
  };
  context: Context;
  project: ProjectInfo;
  suites: Suite[];
  approvals: Approval[];
  template: DocumentTemplateSnapshot;
}

export interface FsdDocumentModel extends FsdDocument {
  template: DocumentTemplateSnapshot;
}

export type DocumentModel = CahierDocumentModel | FsdDocumentModel;
