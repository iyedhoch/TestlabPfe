import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import Docxtemplater from 'docxtemplater';
import htmlToDocx from 'html-to-docx';
import PizZip from 'pizzip';
import {
  hydrateHtmlWithRichEdits,
  type RichEditHydrationPayload,
} from './rich-editing.helper';
import type {
  CahierDocumentModel,
  DocumentModel,
  SupportedDocumentType,
} from '../interfaces/document-model.interface';
import { HtmlGenerator } from './html.generator';

@Injectable()
export class WordGenerator {
  private readonly logger = new Logger(WordGenerator.name);

  constructor(private readonly htmlGenerator: HtmlGenerator) {}

  async generate(
    documentModel: DocumentModel,
    documentType: SupportedDocumentType = 'cahier',
    editPayload?: RichEditHydrationPayload,
  ): Promise<Buffer> {
    if (documentType === 'cahier' && !this.hasRichEditPayload(editPayload)) {
      return this.generateCahierFromTemplate(documentModel);
    }

    if (documentType === 'fsd') {
      return this.generateFsdFromTemplate(documentModel);
    }

    const html = this.htmlGenerator.generate(documentModel, undefined, documentType);
    let hydratedHtml = html;
    try {
      hydratedHtml = await hydrateHtmlWithRichEdits(html, editPayload);
    } catch (error) {
      this.logger.warn(
        'Rich edit hydration failed for DOCX export, falling back to plain HTML',
      );
      hydratedHtml = html;
    }

    const fileBuffer = await htmlToDocx(hydratedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: true,
    });

    return Buffer.from(fileBuffer);
  }

  private hasRichEditPayload(payload?: RichEditHydrationPayload): boolean {
    if (!payload) {
      return false;
    }

    return Boolean(
      (payload.richEditValues && Object.keys(payload.richEditValues).length > 0) ||
        (payload.editValues && Object.keys(payload.editValues).length > 0) ||
        (payload.sectionBackgroundValues &&
          Object.keys(payload.sectionBackgroundValues).length > 0) ||
        payload.pageStyle?.backgroundColor,
    );
  }

  private generateCahierFromTemplate(documentModel: DocumentModel): Buffer {
    const templatePath = this.resolveCahierTemplatePath();

    if (!templatePath) {
      throw new InternalServerErrorException('DOCX template rendering failed');
    }

    const cahierModel = this.toCahierModel(documentModel);
    const data = this.buildCahierTemplateData(cahierModel);

    console.log('Using DOCX template:', templatePath);
    console.log('DATA RECEIVED IN TEMPLATE:', JSON.stringify(data, null, 2));

    this.logger.log('Using DOCX template for Cahier');

    try {
      const templateBinary = fs.readFileSync(templatePath, 'binary');

      try {
        const rendered = this.renderTemplate(templateBinary, data, {
          start: '{{',
          end: '}}',
        });
        this.logger.log('Template loaded successfully');
        return rendered;
      } catch (doubleBraceError) {
        this.logger.warn(
          'DOCX render with {{ }} delimiters failed, retrying with default delimiters',
        );
        this.logger.error(
          'DOCX render error details (double braces)',
          doubleBraceError instanceof Error
            ? doubleBraceError.stack
            : JSON.stringify(doubleBraceError),
        );
      }

      try {
        const rendered = this.renderTemplate(templateBinary, data);
        this.logger.log('Template loaded successfully');
        return rendered;
      } catch (defaultDelimiterError) {
        this.logger.error(
          'DOCX render error details (default delimiters)',
          defaultDelimiterError instanceof Error
            ? defaultDelimiterError.stack
            : JSON.stringify(defaultDelimiterError),
        );
        this.logger.warn(
          'Returning original DOCX template because rendering failed',
        );
        return Buffer.from(fs.readFileSync(templatePath));
      }
    } catch (error) {
      this.logger.error(
        'DOCX template rendering failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('DOCX template rendering failed');
    }
  }

  private generateFsdFromTemplate(documentModel: DocumentModel): Buffer {
    const templatePath = this.resolveFsdTemplatePath();

    if (!templatePath) {
      throw new InternalServerErrorException('FSD DOCX template not found');
    }

    const fsdModel = this.toFsdModel(documentModel);
    const data = this.buildFsdTemplateData(fsdModel);

    console.log('Using FSD DOCX template:', templatePath);
    console.log('FSD DATA RECEIVED IN TEMPLATE:', JSON.stringify(data, null, 2));

    this.logger.log('Using DOCX template for FSD');

    try {
      // Read as Buffer and normalize split Word XML runs that break docxtemplater tags
      const originalTemplateBinary = fs.readFileSync(templatePath);
      this.logger.log('Normalizing FSD DOCX template XML fragments (join split runs)...');
      const templateBinary = this.normalizeFsdTemplateStructure(originalTemplateBinary);

      try {
        const rendered = this.renderTemplate(templateBinary, data, {
          start: '{{',
          end: '}}',
        });
        this.logger.log('FSD template loaded successfully');
        return rendered;
      } catch (doubleBraceError) {
        this.logger.warn(
          'FSD DOCX render with {{ }} delimiters failed, retrying with default delimiters',
        );
        this.logger.error(
          'FSD DOCX render error details (double braces)',
          doubleBraceError instanceof Error
            ? doubleBraceError.stack
            : JSON.stringify(doubleBraceError),
        );
      }

      try {
        const rendered = this.renderTemplate(templateBinary, data);
        this.logger.log('FSD template loaded successfully');
        return rendered;
      } catch (defaultDelimiterError) {
        this.logger.error(
          'FSD DOCX render error details (default delimiters)',
          defaultDelimiterError instanceof Error
            ? defaultDelimiterError.stack
            : JSON.stringify(defaultDelimiterError),
        );
        this.logger.warn(
          'Returning original FSD DOCX template because rendering failed',
        );
        return Buffer.from(fs.readFileSync(templatePath));
      }
    } catch (error) {
      this.logger.error(
        'FSD DOCX template rendering failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('FSD DOCX template rendering failed');
    }
  }

  private renderTemplate(
    templateBinary: Buffer | string,
    data: Record<string, unknown>,
    delimiters?: { start: string; end: string },
  ): Buffer {
    const zip = new PizZip(templateBinary as any);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => 'N/A',
      parser: (rawTag: string) => {
        const tag = rawTag.trim();
        return {
          get: (scope: Record<string, unknown>) => {
            // 1) Exact-key lookup allows non-standard tags like "order. action -> expectedResult".
            if (scope && Object.prototype.hasOwnProperty.call(scope, tag)) {
              return (scope as Record<string, unknown>)[tag];
            }

            // 2) Dot-path lookup for normal nested tags.
            const parts = tag.split('.').map((part) => part.trim()).filter(Boolean);
            if (parts.length === 0) {
              return 'N/A';
            }

            let current: unknown = scope;
            for (const part of parts) {
              if (!current || typeof current !== 'object') {
                return 'N/A';
              }

              const next = (current as Record<string, unknown>)[part];
              if (next === undefined || next === null) {
                return 'N/A';
              }

              current = next;
            }

            return current;
          },
        };
      },
      ...(delimiters ? { delimiters } : {}),
    });

    doc.render(data);

    return doc
      .getZip()
      .generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private normalizeFsdTemplateStructure(templateBinary: Buffer): Buffer {
    try {
      const zip = new PizZip(templateBinary);
      const documentXmlFile = zip.file('word/document.xml');

      if (!documentXmlFile) {
        return templateBinary;
      }

      const originalDocumentXml = documentXmlFile.asText();
      const updatedDocumentXml = originalDocumentXml.replace(
        /\{(?:[^{}]|<\/w:t>[\s\S]*?<w:t[^>]*>)+\}/g,
        (match) => match.replace(/<\/w:t>[\s\S]*?<w:t[^>]*>/g, ''),
      );

      if (updatedDocumentXml === originalDocumentXml) {
        return templateBinary;
      }

      zip.file('word/document.xml', updatedDocumentXml);
      return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
    } catch (err) {
      this.logger.warn('Normalization of FSD template failed, using original template');
      return templateBinary;
    }
  }

  private resolveCahierTemplatePath(): string | null {
    const candidates = [
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
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private resolveFsdTemplatePath(): string | null {
    const candidates = [
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
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private toCahierModel(documentModel: DocumentModel): CahierDocumentModel {
    if ('suites' in documentModel && 'project' in documentModel) {
      return documentModel as CahierDocumentModel;
    }

    throw new InternalServerErrorException('DOCX template rendering failed');
  }

  private toFsdModel(documentModel: DocumentModel): any {
    if ('epics' in documentModel && 'metadata' in documentModel) {
      return documentModel;
    }

    throw new InternalServerErrorException('FSD DOCX template rendering failed');
  }

  private buildFsdTemplateData(model: any): Record<string, unknown> {
    const projectName = model.metadata?.projectName || 'N/A';
    const version = model.metadata?.version || 'N/A';
    const date = model.metadata?.date || 'N/A';
    const author = model.metadata?.author || 'N/A';
    const clientName = model.metadata?.clientName || 'N/A';
    const primaryApproval = model.approvals?.[0];
    const approverName =
      primaryApproval?.approverName || primaryApproval?.name || 'N/A';
    const approverRole =
      primaryApproval?.approverRole || primaryApproval?.role || 'N/A';
    const approvalDate =
      primaryApproval?.approvalDate || primaryApproval?.date || 'N/A';

    // Transform epics data to add numbering properties for template rendering
    const transformedEpics = this.transformEpicsForTemplate(model.epics || []);
    
    // Transform figures data to ensure it has proper structure for template rendering
    const transformedFigures = this.transformFiguresForTemplate(model.figures || []);

    const payload: Record<string, unknown> = {
      // Primary keys (lowercase)
      projectName,
      version,
      date,
      author,
      clientName,
      approverName,
      approverRole,
      approvalDate,

      // Case aliases for compatibility
      ProjectName: projectName,
      Version: version,
      Date: date,
      Author: author,
      ClientName: clientName,

      // Additional document-level aliases
      documentTitle: model.metadata?.title || 'N/A',
      fileName: `fsd-${projectName}-${version}.docx`,
      templateName: model.template?.name || 'N/A',

      // FSD-specific data
      metadata: model.metadata,
      introduction: model.introduction,
      overallDescription: model.overallDescription,
      projectOverview: model.projectOverview,
      methodology: model.methodology,
      glossary: model.glossary,
      revisions: model.revisions,
      functionalRequirements: model.functionalRequirements,
      nonFunctionalRequirements: model.nonFunctionalRequirements,
      systemFeatures: model.systemFeatures,
      epics: transformedEpics,
      externalInterfaces: model.externalInterfaces,
      approvals: model.approvals,
      referenceDocuments: model.referenceDocuments,
      dashboardScreenshots: model.dashboardScreenshots,
      navigationItems: model.navigationItems,
      functionalDescription: model.functionalDescription,
      functionalModules: model.functionalModules,
      businessRules: model.businessRules,
      acceptanceCriteria: model.acceptanceCriteria,
      figures: transformedFigures,
      template: model.template,
    };

    return this.replaceNullishRecord(payload);
  }

  /**
   * Transform epics data to add numbering properties for docxtemplater loops.
   * Adds epicNumber, featureNumber, storyNumber for template rendering.
   */
  private transformEpicsForTemplate(epics: any[]): any[] {
    let epicCounter = 1;
    
    return (epics || []).map((epic) => {
      const epicNumber = epicCounter;
      let featureCounter = 1;

      const features = (epic.features || []).map((feature: any) => {
        const featureNumber = featureCounter;
        let storyCounter = 1;

        const userStories = (feature.userStories || []).map((story: any) => ({
          ...story,
          storyNumber: storyCounter++,
        }));

        featureCounter++;
        return {
          ...feature,
          featureNumber,
          userStories,
        };
      });

      epicCounter++;
      return {
        ...epic,
        epicNumber,
        features,
      };
    });
  }

  /**
   * Transform figures data to ensure proper structure for docxtemplater.
   * Ensures figureNumber and figureTitle are strings for template rendering.
   */
  private transformFiguresForTemplate(figures: any[]): any[] {
    return (figures || []).map((figure) => ({
      figureNumber: String(figure.figureNumber || ''),
      figureTitle: String(figure.figureTitle || ''),
    }));
  }

  private buildCahierTemplateData(
    model: CahierDocumentModel,
  ): Record<string, unknown> {
    const projectName = model.project?.name || 'N/A';
    const projectDescription = model.context?.description || 'N/A';
    const projectObjective = model.context?.objective || 'N/A';
    const clientName = model.metadata?.clientName || 'N/A';
    const version = model.metadata?.version || 'N/A';
    const date = model.metadata?.date || 'N/A';
    const author = model.metadata?.author || 'N/A';
    const primaryApproval = model.approvals?.[0];
    const approverName =
      primaryApproval?.approverName || primaryApproval?.name || 'N/A';
    const approverRole =
      primaryApproval?.approverRole || primaryApproval?.role || 'N/A';
    const approvalDate =
      primaryApproval?.approvalDate || primaryApproval?.date || 'N/A';

    const payload: Record<string, unknown> = {
      // Primary keys
      projectName,
      projectDescription,
      description: projectDescription,
      projectObjective,
      clientName,
      version,
      date,
      author,
      approverName,
      approverRole,
      approvalDate,

      // Case aliases observed in user DOCX template
      ProjectName: projectName,
      ProjectDescription: projectDescription,
      ProjectObjective: projectObjective,
      ClientName: clientName,
      Version: version,
      Date: date,
      Author: author,

      // Additional document-level aliases
      documentTitle: model.metadata?.title || 'N/A',
      fileName: `cahier-recette-${model.project?.id ?? 'N/A'}-${version}.docx`,
      templateName: model.template?.name || 'N/A',
      projectOwner: model.project?.owner || 'N/A',
      projectId: model.project?.id ?? 'N/A',
      testCaseCount: this.countTestCases(model.suites || []),
      openDefects: model.project?.openDefects ?? 'N/A',

      metadata: model.metadata,
      context: model.context,
      project: model.project,
      suites: model.suites,
      approvals: model.approvals,
      template: model.template,
    };

    return this.replaceNullishRecord(payload);
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
      return 'N/A';
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.replaceNullish(item));
    }

    if (typeof value === 'object') {
      return this.replaceNullishRecord(value as Record<string, unknown>);
    }

    return value;
  }

  private countTestCases(suites: CahierDocumentModel['suites']): number {
    return suites.reduce((count, suite) => {
      const local = suite.testCases?.length || 0;
      const nested = this.countTestCases(suite.children || []);
      return count + local + nested;
    }, 0);
  }

  async generateWithLanguage(
    documentModel: DocumentModel,
    documentType: SupportedDocumentType = 'cahier',
    language: 'en' | 'fr' = 'en',
    editPayload?: RichEditHydrationPayload,
  ): Promise<Buffer> {
    if (documentType === 'cahier' && !this.hasRichEditPayload(editPayload)) {
      return this.generateCahierFromTemplate(documentModel);
    }

    if (documentType === 'fsd') {
      return this.generateFsdFromTemplate(documentModel);
    }

    const html = this.htmlGenerator.generateWithLanguage(
      documentModel,
      undefined,
      documentType,
      language,
    );

    let hydratedHtml = html;
    try {
      hydratedHtml = await hydrateHtmlWithRichEdits(html, editPayload);
    } catch (error) {
      this.logger.warn(
        'Rich edit hydration failed for DOCX export, falling back to plain HTML',
      );
      hydratedHtml = html;
    }

    const fileBuffer = await htmlToDocx(hydratedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: true,
    });

    return Buffer.from(fileBuffer);
  }
}
