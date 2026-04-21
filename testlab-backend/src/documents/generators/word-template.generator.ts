import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type {
  CahierDocumentModel,
  DocumentModel,
  FsdDocumentModel,
} from '../interfaces/document-model.interface';
import type { Suite, TestCase } from '../interfaces/cahier-recette.interface';

@Injectable()
export class WordTemplateGenerator {
  private readonly logger = new Logger(WordTemplateGenerator.name);

  async generate(documentModel: DocumentModel): Promise<Buffer> {
    const isFsd = this.isFsdModel(documentModel);
    const templatePath = this.resolveTemplatePath(isFsd ? 'fsd' : 'cahier');

    if (!templatePath) {
      throw new InternalServerErrorException(
        isFsd
          ? 'Word template file not found for FSD template generation'
          : 'Word template file not found for Cahier template generation',
      );
    }

    this.logger.log(`Template loaded successfully: ${templatePath}`);

    const templateBinary = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateBinary);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    const templateData = this.prepareTemplateData(documentModel);
    
    try {
      doc.render(templateData);
    } catch (error) {
      this.logger.error('Docxtemplater render error:', {
        error: error instanceof Error ? error.message : String(error),
        templateDataKeys: Object.keys(templateData),
      });
      throw new InternalServerErrorException(`Template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const resultBuffer = doc
      .getZip()
      .generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    return Buffer.from(resultBuffer);
  }

  private resolveTemplatePath(type: 'cahier' | 'fsd'): string | null {
    const candidates =
      type === 'fsd'
        ? [
            join(
              process.cwd(),
              'src',
              'documents',
              'templates',
              'word',
              'fsd_word_template.docx',
            ),
            join(
              process.cwd(),
              'dist',
              'src',
              'documents',
              'templates',
              'word',
              'fsd_word_template.docx',
            ),
            join(
              process.cwd(),
              'src',
              'documents',
              'templates',
              'word',
              'fsd-template.docx',
            ),
            join(
              process.cwd(),
              'dist',
              'src',
              'documents',
              'templates',
              'word',
              'fsd-template.docx',
            ),
          ]
        : [
            join(
              process.cwd(),
              'src',
              'documents',
              'templates',
              'word',
              'test cahier de recette.docx',
            ),
            join(
              process.cwd(),
              'dist',
              'src',
              'documents',
              'templates',
              'word',
              'test cahier de recette.docx',
            ),
            join(
              process.cwd(),
              'src',
              'documents',
              'templates',
              'docx',
              'cahier-template.docx',
            ),
            join(
              process.cwd(),
              'dist',
              'src',
              'documents',
              'templates',
              'docx',
              'cahier-template.docx',
            ),
            join(
              process.cwd(),
              'src',
              'documents',
              'templates',
              'word',
              'cahier-template.docx',
            ),
            join(
              process.cwd(),
              'dist',
              'src',
              'documents',
              'templates',
              'word',
              'cahier-template.docx',
            ),
          ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private isFsdModel(documentModel: DocumentModel): documentModel is FsdDocumentModel {
    return !('suites' in documentModel);
  }

  private prepareTemplateData(documentModel: DocumentModel): Record<string, unknown> {
    if (this.isFsdModel(documentModel)) {
      return this.buildFsdTemplateData(documentModel);
    }

    return this.buildCahierTemplateData(documentModel);
  }

  private buildCahierTemplateData(documentModel: CahierDocumentModel): Record<string, unknown> {
    const metadata = documentModel.metadata;

    return {
      projectName: documentModel.project?.name || '',
      projectDescription: documentModel.context?.description || '',
      clientName: metadata?.clientName || '',
      version: metadata?.version || '',
      date: this.formatDate(metadata?.date),
      author: metadata?.author || '',
      suites: this.mapSuitesForTemplate(documentModel.suites || []),
      approvals: (documentModel.approvals || []).map((approval) => ({
        name: approval.name || '',
        role: approval.role || '',
        date: this.formatDate(approval.date),
      })),
    };
  }

  private buildFsdTemplateData(documentModel: FsdDocumentModel): Record<string, unknown> {
    const metadata = documentModel.metadata || {
      title: '',
      projectName: '',
      clientName: '',
      version: '',
      date: '',
      author: '',
    };

    const normalizedMetadata = {
      title: metadata.title || '',
      projectName: metadata.projectName || '',
      clientName: metadata.clientName || metadata.projectName || '',
      version: metadata.version || '1.0',
      date: this.formatDate(metadata.date) || this.formatDate(new Date().toISOString()),
      author: metadata.author || 'System',
    };

    this.logger.log('Building FSD template data with metadata:', normalizedMetadata);

    const figures = (documentModel.figures || documentModel.dashboardScreenshots || []).map(
      (figure, index) => ({
        ...figure,
        figureNumber:
          (figure as { figureNumber?: string }).figureNumber || `${index + 1}`,
        figureTitle:
          (figure as { figureTitle?: string; caption?: string; altText?: string; title?: string }).figureTitle ||
          (figure as { caption?: string }).caption ||
          (figure as { altText?: string }).altText ||
          (figure as { title?: string }).title ||
          '',
      }),
    );

    const epics = (documentModel.epics || []).map((epic, epicIndex) => ({
      ...epic,
      epicNumber: `${epicIndex + 1}`,
      features: (epic.features || []).map((feature, featureIndex) => ({
        ...feature,
        featureNumber: `${epicIndex + 1}.${featureIndex + 1}`,
        userStories: (feature.userStories || []).map((story, storyIndex) => ({
          ...story,
          storyNumber: `${epicIndex + 1}.${featureIndex + 1}.${storyIndex + 1}`,
          acceptanceCriteria: story.acceptanceCriteria || [],
          reglesDeGestion: story.reglesDeGestion || [],
          regledegestion: story.reglesDeGestion || [],
          gestion: (story.gestion || []).map((item) => ({
            action: item.action || '',
            integration: item.integration || '',
          })),
          images: (story.images || []).map((item, imageIndex) => ({
            ...item,
            figureNumber:
              item.figureNumber || `${epicIndex + 1}.${featureIndex + 1}.${storyIndex + 1}.${imageIndex + 1}`,
            figureTitle: item.figureTitle || item.caption || item.alt || '',
          })),
        })),
      })),
    }));

    const functionalRequirements = (documentModel.functionalRequirements || []).map(
      (requirement, index) => ({
        ...requirement,
        requirementNumber: `${index + 1}`,
      }),
    );

    // Create data object with BOTH nested AND flat metadata
    // This ensures the template can access metadata fields either way
    const data: Record<string, unknown> = {
      // Nested metadata object - for {metadata.author} syntax
      metadata: normalizedMetadata,

      // Dot-key aliases are needed because some DOCX placeholders use names
      // like {metadata.author} and docxtemplater resolves them as flat keys.
      'metadata.title': normalizedMetadata.title,
      'metadata.projectName': normalizedMetadata.projectName,
      'metadata.clientName': normalizedMetadata.clientName,
      'metadata.version': normalizedMetadata.version,
      'metadata.date': normalizedMetadata.date,
      'metadata.author': normalizedMetadata.author,
      
      // IMPORTANT: Also include all metadata fields at root level
      // This is for {author}, {clientName}, {version}, {date} syntax
      author: normalizedMetadata.author,
      clientName: normalizedMetadata.clientName,
      version: normalizedMetadata.version,
      date: normalizedMetadata.date,
      title: normalizedMetadata.title,
      projectName: normalizedMetadata.projectName,
      
      // Additional fields required by template
      introduction: documentModel.introduction || {},
      purpose: documentModel.introduction?.purpose || '',
      objective: documentModel.introduction?.purpose || '',
      objectif: documentModel.introduction?.purpose || '',
      scope: documentModel.introduction?.scope || '',
      overallDescription: documentModel.overallDescription || {},
      projectOverview: documentModel.projectOverview || '',
      methodology: documentModel.methodology || '',
      revisions: (documentModel.revisions || []).map((revision) => ({
        ...revision,
        date: this.formatDate(revision.date),
      })),
      approvals: (documentModel.approvals || []).map((approval) => ({
        ...approval,
        date: this.formatDate(approval.date),
      })),
      referenceDocuments: documentModel.referenceDocuments || [],
      glossary: documentModel.glossary || [],
      functionalRequirements,
      nonFunctionalRequirements: documentModel.nonFunctionalRequirements || {},
      systemFeatures: documentModel.systemFeatures || [],
      epics,
      externalInterfaces: documentModel.externalInterfaces || {},
      dashboardScreenshots: documentModel.dashboardScreenshots || [],
      navigationItems: documentModel.navigationItems || [],
      functionalDescription: documentModel.functionalDescription || '',
      functionalModules: documentModel.functionalModules || [],
      businessRules: documentModel.businessRules || [],
      acceptanceCriteria: documentModel.acceptanceCriteria || [],
      figures,
      template: documentModel.template || {},
      footer: documentModel.template?.footer || '',
      hasEpics: epics.length > 0,
      hasApprovals: (documentModel.approvals || []).length > 0,
      hasReferenceDocuments: (documentModel.referenceDocuments || []).length > 0,
      hasGlossary: (documentModel.glossary || []).length > 0,
      hasRevisions: (documentModel.revisions || []).length > 0,
      hasFunctionalRequirements: functionalRequirements.length > 0,
      hasAcceptanceCriteria: (documentModel.acceptanceCriteria || []).length > 0,
    };

    const processedData = this.replaceNullishRecord(data);
    
    this.logger.log('Final FSD template data keys:', {
      hasMetadata: 'metadata' in processedData,
      hasMetadataAuthorAlias: 'metadata.author' in processedData,
      hasAuthor: 'author' in processedData,
      hasClientName: 'clientName' in processedData,
      hasVersion: 'version' in processedData,
      hasDate: 'date' in processedData,
    });

    return processedData;
  }

  private mapSuitesForTemplate(suites: Suite[]): Array<Record<string, unknown>> {
    return suites.map((suite) => ({
      name: suite.name || '',
      testCases: this.mapTestCasesForTemplate(suite.testCases || []),
      suites: this.mapSuitesForTemplate(suite.children || []),
      children: this.mapSuitesForTemplate(suite.children || []),
    }));
  }

  private mapTestCasesForTemplate(
    testCases: TestCase[],
  ): Array<Record<string, unknown>> {
    return testCases.map((testCase) => ({
      name: testCase.name || '',
      summary: testCase.summary || '',
      preconditions: (testCase.preconditions || []).map((precondition) => ({
        content: precondition.content || '',
      })),
      steps: (testCase.steps || []).map((step) => ({
        order: step.order,
        action: step.action || '',
        expectedResult: step.expectedResult || '',
      })),
    }));
  }

  private replaceNullishRecord(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      output[key] = this.replaceNullish(nestedValue);
    }
    return output;
  }

  private replaceNullish(value: unknown): unknown {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.replaceNullish(item));
    }

    if (typeof value === 'object') {
      return this.replaceNullishRecord(value as Record<string, unknown>);
    }

    return value;
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toISOString().slice(0, 10);
  }
}
