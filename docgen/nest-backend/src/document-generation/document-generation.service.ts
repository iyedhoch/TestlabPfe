import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentVersionService } from '../document-version/document-version.service';
import { CAHIER_RECETTE_DOCUMENT } from '../mock-data/cahier-recette.data';
import { FSD_DOCUMENT } from '../mock-data/fsd.data';
import { PROJECT_DOCUMENTS } from '../mock-data/project-documents.data';
import type { ProjectDocumentRecord } from '../mock-data/project-documents.data';
import type { TemplateConfigRecord } from '../mock-data/template-configs.data';
import { TemplateConfigService } from '../template-config/template-config.service';
import { ExcelGenerator } from './generators/excel.generator';
import { HtmlGenerator } from './generators/html.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { WordGenerator } from './generators/word.generator';
import { WordTemplateGenerator } from './generators/word-template.generator';
import type { DocumentGenerator } from './interfaces/document-generator.interface';
import type {
  CahierDocumentModel,
  DocumentModel,
  FsdDocumentModel,
  SupportedDocumentType,
} from './interfaces/document-model.interface';

@Injectable()
export class DocumentGenerationService implements DocumentGenerator {
  private readonly projectDocuments: ProjectDocumentRecord[] =
    PROJECT_DOCUMENTS;

  constructor(
    private readonly templateConfigService: TemplateConfigService,
    private readonly documentVersionService: DocumentVersionService,
    private readonly htmlGenerator: HtmlGenerator,
    private readonly pdfGenerator: PdfGenerator,
    private readonly wordGenerator: WordGenerator,
    private readonly wordTemplateGenerator: WordTemplateGenerator,
    private readonly excelGenerator: ExcelGenerator,
  ) {}

  generateHtmlDocument(
    projectId: number,
    template?: string,
    userId?: number,
  ): string {
    this.validateInputs(projectId, template, 'cahier');
    const model = this.buildDocumentModel(projectId, template);
    const output = this.htmlGenerator.generate(model);

    this.documentVersionService.createGeneratedVersion({
      projectId,
      userId: this.resolveUserId(userId),
      format: 'html',
      fileName: `project-${projectId}.html`,
      content: output,
      templateSnapshot: model.template,
      summary: `Generated HTML document using ${model.template.name}`,
      author: model.metadata.author,
      documentType: 'CAHIER_RECETTE',
    });

    return output;
  }

  generatePdfDocument(
    projectId: number,
    template?: string,
    userId?: number,
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    this.validateInputs(projectId, template, documentType);
    const model = this.buildDocumentModel(projectId, template, documentType);
    const htmlContent = this.htmlGenerator.generate(model, mode, documentType);
    const outputPromise = this.pdfGenerator.generateFromHtml(htmlContent);

    return outputPromise.then((output) => {
      this.documentVersionService.createGeneratedVersion({
        projectId,
        userId: this.resolveUserId(userId),
        format: 'pdf',
        fileName: `project-${projectId}.pdf`,
        content: output.toString('base64'),
        templateSnapshot: model.template,
        summary: `Generated PDF document using ${model.template.name}`,
        author: model.metadata.author,
        documentType: this.toVersionDocumentType(documentType),
      });

      return output;
    });
  }

  generateWordDocument(
    projectId: number,
    template?: string,
    userId?: number,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    this.validateInputs(projectId, template, documentType);
    const model = this.buildDocumentModel(projectId, template, documentType);
    return this.wordGenerator.generate(model, documentType).then((output) => {
      this.documentVersionService.createGeneratedVersion({
        projectId,
        userId: this.resolveUserId(userId),
        format: 'word',
        fileName: `project-${projectId}.docx`,
        content: output.toString('base64'),
        templateSnapshot: model.template,
        summary: `Generated Word document using ${model.template.name}`,
        author: model.metadata.author,
        documentType: this.toVersionDocumentType(documentType),
      });

      return output;
    });
  }

  generateExcelDocument(
    projectId: number,
    template?: string,
    userId?: number,
  ): Promise<Buffer> {
    this.validateInputs(projectId, template, 'cahier');
    const model = this.buildDocumentModel(projectId, template, 'cahier');
    if (!this.isCahierModel(model)) {
      throw new BadRequestException('Excel generation supports cahier documents only');
    }

    return this.excelGenerator.generate(model).then((output) => {
      this.documentVersionService.createGeneratedVersion({
        projectId,
        userId: this.resolveUserId(userId),
        format: 'excel',
        fileName: `project-${projectId}.xlsx`,
        content: output.toString('base64'),
        templateSnapshot: model.template,
        summary: `Generated Excel document using ${model.template.name}`,
        author: model.metadata.author,
        documentType: 'CAHIER_RECETTE',
      });

      return output;
    });
  }

  generateWordFromTemplate(
    projectId: number,
    template?: string,
    userId?: number,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    this.validateInputs(projectId, template, documentType);
    const model = this.buildDocumentModel(projectId, template, documentType);
    return this.wordTemplateGenerator.generate(model).then((output) => {
      this.documentVersionService.createGeneratedVersion({
        projectId,
        userId: this.resolveUserId(userId),
        format: 'word',
        fileName: `project-${projectId}-template.docx`,
        content: output.toString('base64'),
        templateSnapshot: model.template,
        summary: `Generated Word document from template using ${model.template.name}`,
        author: model.metadata.author,
        documentType: this.toVersionDocumentType(documentType),
      });

      return output;
    });
  }

  private validateInputs(
    projectId: number,
    template?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): void {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw new BadRequestException('projectId must be a positive integer');
    }

    if (template !== undefined && template.trim().length === 0) {
      throw new BadRequestException('template cannot be empty');
    }

    if (!this.isSupportedDocumentType(documentType)) {
      throw new BadRequestException(
        "type must be one of: 'cahier', 'fsd'",
      );
    }
  }

  private buildDocumentModel(
    projectId: number,
    template?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): DocumentModel {
    const project = this.projectDocuments.find((item) => item.id === projectId);
    if (!project) {
      throw new BadRequestException(`Project with id ${projectId} not found`);
    }

    const templateConfig =
      this.templateConfigService.getActiveTemplate(template);
    const generatedDate = new Date().toISOString();

    if (documentType === 'fsd') {
      return this.buildFsdDocumentModel(project, templateConfig, generatedDate);
    }

    return this.buildCahierDocumentModel(project, templateConfig, generatedDate);
  }

  private buildCahierDocumentModel(
    project: ProjectDocumentRecord,
    templateConfig: TemplateConfigRecord,
    generatedDate: string,
  ): CahierDocumentModel {
    return {
      metadata: {
        ...CAHIER_RECETTE_DOCUMENT.metadata,
        title: templateConfig.title,
        author: project.owner,
        date: generatedDate,
      },
      context: CAHIER_RECETTE_DOCUMENT.context,
      project: {
        id: project.id,
        name: project.projectName,
        owner: project.owner,
      },
      suites: CAHIER_RECETTE_DOCUMENT.suites,
      approvals: CAHIER_RECETTE_DOCUMENT.approvals,
      template: this.toTemplateSnapshot(templateConfig),
    };
  }

  private buildFsdDocumentModel(
    project: ProjectDocumentRecord,
    templateConfig: TemplateConfigRecord,
    generatedDate: string,
  ): FsdDocumentModel {
    return {
      metadata: {
        ...FSD_DOCUMENT.metadata,
        projectName: project.projectName,
        author: project.owner,
        date: generatedDate,
      },
      introduction: FSD_DOCUMENT.introduction,
      overallDescription: FSD_DOCUMENT.overallDescription,
      functionalRequirements: FSD_DOCUMENT.functionalRequirements,
      nonFunctionalRequirements: FSD_DOCUMENT.nonFunctionalRequirements,
      systemFeatures: FSD_DOCUMENT.systemFeatures,
      externalInterfaces: FSD_DOCUMENT.externalInterfaces,
      approvals: FSD_DOCUMENT.approvals,
      template: this.toTemplateSnapshot(templateConfig),
    };
  }

  private resolveUserId(userId?: number): number {
    if (userId === undefined || userId === null) {
      return 1;
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('userId must be a positive integer');
    }

    return userId;
  }

  private toTemplateSnapshot(
    template: TemplateConfigRecord,
  ): DocumentModel['template'] {
    return {
      id: template.id,
      name: template.name,
      title: template.title,
      footer: template.footer,
      showStatistics: template.showStatistics,
      showExecutions: template.showExecutions,
      showPreconditions: template.showPreconditions,
      showSteps: template.showSteps,
      showApprovals: template.showApprovals,
      showContext: template.showContext,
      failedOnly: template.failedOnly,
    };
  }

  private isCahierModel(model: DocumentModel): model is CahierDocumentModel {
    return 'suites' in model && Array.isArray(model.suites);
  }

  private isSupportedDocumentType(value: string): value is SupportedDocumentType {
    return value === 'cahier' || value === 'fsd';
  }

  private toVersionDocumentType(
    documentType: SupportedDocumentType,
  ): 'CAHIER_RECETTE' | 'FSD' {
    return documentType === 'fsd' ? 'FSD' : 'CAHIER_RECETTE';
  }
}
