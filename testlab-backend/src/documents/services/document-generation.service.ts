import { Injectable } from '@nestjs/common';
import { HtmlGenerator } from '../generators/html.generator';
import { PdfGenerator } from '../generators/pdf.generator';
import { WordGenerator } from '../generators/word.generator';
import { WordTemplateGenerator } from '../generators/word-template.generator';
import { ExcelGenerator } from '../generators/excel.generator';
import { DocumentDataService } from './document-data.service';
import type { GenerateCahierDto } from '../dto/generate-cahier.dto';
import type { GenerateFsdDto } from '../dto/generate-fsd.dto';
import type {
  CahierSelectionSuiteDto,
  FsdSelectionEpicDto,
} from '../dto/document-selection.dto';
import type {
  DocumentModel,
  SupportedDocumentType,
} from '../interfaces/document-model.interface';

@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly documentDataService: DocumentDataService,
    private readonly htmlGenerator: HtmlGenerator,
    private readonly pdfGenerator: PdfGenerator,
    private readonly wordGenerator: WordGenerator,
    private readonly wordTemplateGenerator: WordTemplateGenerator,
    private readonly excelGenerator: ExcelGenerator,
  ) {}

  private normalizeAuthors(authors?: string[], author?: string): string[] {
    const normalized = (authors || [])
      .map((item) => (item || '').trim())
      .filter((item) => item.length > 0);

    if (normalized.length > 0) {
      return normalized;
    }

    if (author?.trim()) {
      return [author.trim()];
    }

    return [];
  }

  private joinAuthors(authors?: string[], author?: string): string {
    const normalized = this.normalizeAuthors(authors, author);
    return normalized.join('; ');
  }

  private getEditValues(model: DocumentModel): Record<string, string> | undefined {
    if ('editValues' in model && model.editValues) {
      return model.editValues;
    }

    return undefined;
  }

  getTemplates() {
    return this.documentDataService.getTemplates();
  }

  async getDocumentTitle(
    projectId: string,
    documentType: SupportedDocumentType,
  ): Promise<string> {
    const model = await this.getModel(projectId, documentType);
    return model.metadata?.title?.trim() ||
      (documentType === 'fsd'
        ? 'Functional Specification Document'
        : 'Cahier de recette');
  }

  async getSelectableEpicsForFsd(
    projectId: string,
  ): Promise<FsdSelectionEpicDto[]> {
    return this.documentDataService.getSelectableEpicsForFsd(projectId);
  }

  async getSelectableSuitesForCahier(
    projectId: string,
  ): Promise<CahierSelectionSuiteDto[]> {
    return this.documentDataService.getSelectableSuitesForCahier(projectId);
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
    return this.pdfGenerator.generateFromHtml(html, this.getEditValues(model));
  }

  async generateWord(
    projectId: string,
    documentType: SupportedDocumentType,
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    return this.wordGenerator.generate(
      model,
      documentType,
      this.getEditValues(model),
    );
  }

  async generateWordTemplate(
    projectId: string,
    documentType: SupportedDocumentType,
  ): Promise<Buffer> {
    const model = await this.getModel(projectId, documentType);
    return this.wordTemplateGenerator.generate(model);
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
    return this.pdfGenerator.generateFromHtml(html, this.getEditValues(model));
  }

  async generateHtmlPreview(
    projectId: string,
    documentType: SupportedDocumentType,
    options?: {
      mode?: string;
      language?: 'en' | 'fr';
    },
  ): Promise<string> {
    const model = await this.getModel(projectId, documentType);
    const language =
      options?.language || (documentType === 'cahier' ? 'fr' : 'en');

    return this.htmlGenerator.generateWithLanguage(
      model,
      this.resolveMode(options?.mode),
      documentType,
      language,
    );
  }

  async generateFsdPdfFromPayload(
    projectId: string,
    payload: GenerateFsdDto,
    options?: {
      persistStepTwoData?: boolean;
    },
  ): Promise<Buffer> {
    if (options?.persistStepTwoData ?? true) {
      await this.documentDataService.persistFsdStepTwoData(projectId, {
        approvals: payload.approvals,
        referenceDocuments: payload.referenceDocuments,
        glossary: payload.glossary,
        revisions: payload.revisions,
      });
    }

    const model = await this.buildFsdModelFromPayload(projectId, payload);

    const language = payload.language || 'en';
    const html = this.htmlGenerator.generateWithLanguage(
      model,
      this.resolveStepTwoFsdMode(payload.mode, language),
      'fsd',
      language,
    );

    return this.pdfGenerator.generateFromHtml(html, model.editValues);
  }

  async generateCahierPdfFromPayload(
    projectId: string,
    payload: GenerateCahierDto,
  ): Promise<Buffer> {
    const model = await this.buildCahierModelFromPayload(projectId, payload);

    const language = payload.language || 'fr';
    const html = this.htmlGenerator.generateWithLanguage(
      model,
      payload.mode,
      'cahier',
      language,
    );

    return this.pdfGenerator.generateFromHtml(html);
  }

  async generateFsdHtmlPreviewFromPayload(
    projectId: string,
    payload: GenerateFsdDto,
  ): Promise<string> {
    const model = await this.buildFsdModelFromPayload(projectId, payload);

    const language = payload.language || 'en';
    return this.htmlGenerator.generateWithLanguage(
      model,
      this.resolveStepTwoFsdMode(payload.mode, language),
      'fsd',
      language,
    );
  }

  async generateCahierHtmlPreviewFromPayload(
    projectId: string,
    payload: GenerateCahierDto,
  ): Promise<string> {
    const model = await this.buildCahierModelFromPayload(projectId, payload);

    const language = payload.language || 'fr';
    return this.htmlGenerator.generateWithLanguage(
      model,
      this.resolveMode(payload.mode),
      'cahier',
      language,
    );
  }

  async generateFsdDocumentFromPayload(
    projectId: string,
    payload: GenerateFsdDto,
    format: 'pdf' | 'word',
  ): Promise<Buffer> {
    if (format === 'pdf') {
      return this.generateFsdPdfFromPayload(projectId, payload, {
        persistStepTwoData: false,
      });
    }

    await this.documentDataService.persistFsdStepTwoData(projectId, {
      approvals: payload.approvals,
      referenceDocuments: payload.referenceDocuments,
      glossary: payload.glossary,
      revisions: payload.revisions,
    });

    const model = await this.buildFsdModelFromPayload(projectId, payload);
    return this.wordTemplateGenerator.generate(model);
  }

  async generateCahierDocumentFromPayload(
    projectId: string,
    payload: GenerateCahierDto,
    format: 'pdf' | 'word' | 'excel',
  ): Promise<Buffer> {
    if (format === 'pdf') {
      return this.generateCahierPdfFromPayload(projectId, payload);
    }

    const model = await this.buildCahierModelFromPayload(projectId, payload);

    if (format === 'word') {
      return this.wordGenerator.generateWithLanguage(
        model,
        'cahier',
        payload.language || 'fr',
      );
    }

    return this.excelGenerator.generate(model);
  }

  private resolveMode(mode?: string): string | undefined {
    if (mode === 'template-debug') {
      return 'template-debug';
    }

    return mode;
  }

  private resolveStepTwoFsdMode(
    mode: string | undefined,
    _language: 'en' | 'fr',
  ): string | undefined {
    if (mode) {
      return this.resolveMode(mode);
    }

    return undefined;
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

  private async buildFsdModelFromPayload(
    projectId: string,
    payload: GenerateFsdDto,
  ) {
    const metadata = payload.metadata;
    const authors = payload.authors || metadata?.authors;
    const author = payload.author || metadata?.author;

    return this.documentDataService.getFsdData(projectId, {
      selectedEpicIds: payload.selectedEpicIds,
      selectedFeatureIds: payload.selectedFeatureIds,
      selectedUserStoryIds: payload.selectedUserStoryIds,
      overrides: {
        metadata: {
          title: payload.title || metadata?.title,
          projectName: payload.projectName || metadata?.projectName,
          clientName: payload.clientName || metadata?.clientName,
          version: payload.version || metadata?.version,
          date: payload.date || metadata?.date,
          author: this.joinAuthors(authors, author),
        },
        introduction: {
          purpose: payload.purpose,
          definitions: payload.definitions,
        },
        projectOverview: payload.projectOverview,
        methodology: payload.methodology,
        approvals: payload.approvals,
        referenceDocuments: payload.referenceDocuments,
        glossary: payload.glossary,
        revisions: payload.revisions?.map((item) => ({
          ...item,
          author: this.joinAuthors(item.authors, item.author),
        })),
        editValues: payload.editValues,
      },
    });
  }

  private async buildCahierModelFromPayload(
    projectId: string,
    payload: GenerateCahierDto,
  ) {
    return this.documentDataService.getCahierData(projectId, {
      selectedSuiteIds: payload.selectedSuiteIds,
      selectedTestCaseIds: payload.selectedTestCaseIds,
      overrides: {
        metadata: {
          title: payload.title,
          clientName: payload.clientName,
          version: payload.version,
          date: payload.date,
          author: this.joinAuthors(payload.authors, payload.author),
        },
        context: {
          description: payload.description,
          objective: payload.objective,
        },
        project: {
          owner: payload.projectOwner,
          openDefects: payload.openDefects,
        },
        approvals: payload.approvals?.map((approval) => ({
          name: approval.approverName,
          role: approval.approverRole,
          date: approval.approvalDate,
          approverName: approval.approverName,
          approverRole: approval.approverRole,
          approvalDate: approval.approvalDate,
        })),
      },
    });
  }
}
