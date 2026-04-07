export interface DocumentVersionMetadata {
  documentType: 'CAHIER_RECETTE' | 'FSD';
  createdAt: string;
  author: string;
  summary: string;
  generatedFormat?: 'html' | 'pdf' | 'word' | 'excel';
  generatedContent?: string;
  templateSnapshot?: {
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
  };
}

export interface DocumentVersionRecord {
  id: number;
  projectId: number;
  version: number;
  userId: number;
  fileName: string;
  metadata: DocumentVersionMetadata;
}

export const DOCUMENT_VERSIONS: DocumentVersionRecord[] = [
  {
    id: 1,
    projectId: 1,
    version: 1,
    userId: 2,
    fileName: 'project-1-v1.pdf',
    metadata: {
      documentType: 'CAHIER_RECETTE',
      createdAt: '2026-03-01T10:00:00Z',
      author: 'Architecture Team',
      summary: 'Initial generated document',
    },
  },
  {
    id: 2,
    projectId: 1,
    version: 2,
    userId: 2,
    fileName: 'project-1-v2.pdf',
    metadata: {
      documentType: 'CAHIER_RECETTE',
      createdAt: '2026-03-05T14:30:00Z',
      author: 'Architecture Team',
      summary: 'Updated chapter structure',
    },
  },
  {
    id: 3,
    projectId: 2,
    version: 1,
    userId: 3,
    fileName: 'project-2-v1.pdf',
    metadata: {
      documentType: 'CAHIER_RECETTE',
      createdAt: '2026-03-10T09:15:00Z',
      author: 'Platform Team',
      summary: 'Initial portal documentation',
    },
  },
];
