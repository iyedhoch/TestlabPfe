import { Injectable } from '@nestjs/common';
import { HtmlGenerator } from '../generators/html.generator';
import { PdfGenerator } from '../generators/pdf.generator';
import { WordGenerator } from '../generators/word.generator';
import { ExcelGenerator } from '../generators/excel.generator';
import { DocumentDataService } from './document-data.service';
import type { SupportedDocumentType } from '../interfaces/document-model.interface';

@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly documentDataService: DocumentDataService,
    private readonly htmlGenerator: HtmlGenerator,
    private readonly pdfGenerator: PdfGenerator,
    private readonly wordGenerator: WordGenerator,
    private readonly excelGenerator: ExcelGenerator,
  ) {}

  getTemplates() {
    return this.documentDataService.getTemplates();
  }

  async generatePdf(
    projectId: string,
    documentType: SupportedDocumentType,
    mode?: string,
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    const html = this.htmlGenerator.generate(
      model,
      this.resolveMode(mode),
      documentType,
    );
    return this.pdfGenerator.generateFromHtml(html);
  }

  async generateWord(
    projectId: string,
    documentType: SupportedDocumentType,
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    return this.wordGenerator.generate(model, documentType);
  }

  async generateWordTemplate(
    projectId: string,
    documentType: SupportedDocumentType,
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    return this.wordGenerator.generate(model, documentType);
  }

  async generateExcel(projectId: string): Promise<Buffer> {
    const model = await this.documentDataService.getCahierData(projectId);
    return this.excelGenerator.generate(model);
  }

  async generatePdfWithLanguage(
    projectId: string,
    documentType: SupportedDocumentType,
    mode?: string,
    language: 'en' | 'fr' = 'en',
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    const html = this.htmlGenerator.generateWithLanguage(
      model,
      this.resolveMode(mode),
      documentType,
      language,
    );
    return this.pdfGenerator.generateFromHtml(html);
  }

  private resolveMode(mode?: string): string | undefined {
    if (mode === 'template-debug') {
      return 'template-debug';
    }

    return mode;
  }

  async generateWordWithLanguage(
    projectId: string,
    documentType: SupportedDocumentType,
    language: 'en' | 'fr' = 'en',
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    return this.wordGenerator.generateWithLanguage(
      model,
      documentType,
      language,
    );
  }

  private async getModel(projectId: string, documentType: SupportedDocumentType) {
    if (documentType === 'fsd') {
      return this.documentDataService.getFsdData(projectId);
    }

    return this.documentDataService.getCahierData(projectId);
  }
}
