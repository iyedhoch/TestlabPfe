import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentGenerationService } from '../document-generation/document-generation.service';
import type { SupportedDocumentType } from '../document-generation/interfaces/document-model.interface';
import { PROJECT_DOCUMENTS } from '../mock-data/project-documents.data';
import type { ProjectDocumentRecord } from '../mock-data/project-documents.data';
import { ProjectDocumentDto } from './dto/project-document.dto';

@Injectable()
export class ProjectDocumentService {
  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  // TODO: Replace mock data with external API calls.
  private readonly projectDocuments: ProjectDocumentRecord[] =
    PROJECT_DOCUMENTS;

  getAllProjectDocuments(): ProjectDocumentDto[] {
    return this.projectDocuments.map((item) => new ProjectDocumentDto(item));
  }

  getProjectDocumentById(id: number): ProjectDocumentDto {
    return new ProjectDocumentDto(this.findProjectDocumentOrThrow(id));
  }

  getProjectDocumentHtml(
    id: number,
    template?: string,
    userId?: number,
  ): string {
    this.findProjectDocumentOrThrow(id);
    return this.documentGenerationService.generateHtmlDocument(
      id,
      template,
      userId,
    );
  }

  getProjectDocumentPdf(
    id: number,
    template?: string,
    userId?: number,
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    this.findProjectDocumentOrThrow(id);
    return this.documentGenerationService.generatePdfDocument(
      id,
      template,
      userId,
      mode,
      documentType,
    );
  }

  getProjectDocumentWord(
    id: number,
    template?: string,
    userId?: number,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    this.findProjectDocumentOrThrow(id);
    return this.documentGenerationService.generateWordDocument(
      id,
      template,
      userId,
      documentType,
    );
  }

  getProjectDocumentExcel(
    id: number,
    template?: string,
    userId?: number,
  ): Promise<Buffer> {
    this.findProjectDocumentOrThrow(id);
    return this.documentGenerationService.generateExcelDocument(
      id,
      template,
      userId,
    );
  }

  getProjectDocumentWordTemplate(
    id: number,
    template?: string,
    userId?: number,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    this.findProjectDocumentOrThrow(id);
    return this.documentGenerationService.generateWordFromTemplate(
      id,
      template,
      userId,
      documentType,
    );
  }

  private findProjectDocumentOrThrow(id: number): ProjectDocumentRecord {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('id must be a positive integer');
    }

    const projectDocument = this.projectDocuments.find(
      (item) => item.id === id,
    );
    if (!projectDocument) {
      throw new NotFoundException(`Project document with id ${id} not found`);
    }

    return projectDocument;
  }
}
