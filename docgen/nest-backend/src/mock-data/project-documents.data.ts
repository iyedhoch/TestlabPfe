export interface ProjectDocumentRecord {
  id: number;
  projectName: string;
  owner: string;
  formats: string[];
  status: 'draft' | 'published';
}

export const PROJECT_DOCUMENTS: ProjectDocumentRecord[] = [
  {
    id: 1,
    projectName: 'ERP Migration',
    owner: 'Architecture Team',
    formats: ['PDF', 'Word', 'Excel', 'HTML'],
    status: 'published',
  },
  {
    id: 2,
    projectName: 'Customer Portal Revamp',
    owner: 'Platform Team',
    formats: ['PDF', 'Word', 'HTML'],
    status: 'draft',
  },
];
