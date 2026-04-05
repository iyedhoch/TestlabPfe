import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { SupportedDocumentType } from '../interfaces/document-model.interface';

export interface GeneratedDocumentVersion {
  id: string;
  projectId: string;
  documentType: SupportedDocumentType;
  format: 'pdf' | 'word' | 'excel';
  fileName: string;
  createdAt: string;
}

@Injectable()
export class DocumentVersionService {
  private readonly versionsByProject = new Map<string, GeneratedDocumentVersion[]>();

  recordVersion(input: {
    projectId: string;
    documentType: SupportedDocumentType;
    format: 'pdf' | 'word' | 'excel';
    fileName: string;
  }): GeneratedDocumentVersion {
    const entry: GeneratedDocumentVersion = {
      id: randomUUID(),
      projectId: input.projectId,
      documentType: input.documentType,
      format: input.format,
      fileName: input.fileName,
      createdAt: new Date().toISOString(),
    };

    const current = this.versionsByProject.get(input.projectId) ?? [];
    this.versionsByProject.set(input.projectId, [entry, ...current]);
    return entry;
  }

  getByProject(projectId: string): GeneratedDocumentVersion[] {
    return this.versionsByProject.get(projectId) ?? [];
  }
}
