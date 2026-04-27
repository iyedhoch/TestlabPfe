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
import type { FsdAcceptanceCriterion } from '../interfaces/fsd.interface';
import type { Suite, TestCase } from '../interfaces/cahier-recette.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ImageModule = require('open-docxtemplater-image-module');

@Injectable()
export class WordTemplateGenerator {
  private readonly logger = new Logger(WordTemplateGenerator.name);
  private static readonly IMAGE_FETCH_TIMEOUT_MS = 15_000;

  private static readonly TRANSPARENT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2p5ocAAAAASUVORK5CYII=',
    'base64',
  );

  private shouldFallbackWithoutImageModule(error: unknown): boolean {
    const props = (error as { properties?: { id?: string; explanation?: string } })
      ?.properties;
    const message = error instanceof Error ? error.message : String(error || '');
    const explanation = props?.explanation || '';

    return (
      props?.id === 'multi_error' ||
      props?.id === 'raw_tag_outerxml_invalid' ||
      /raw tag not in paragraph/i.test(message) ||
      /tag\s+"?image"?\s+is\s+not\s+inside\s+a\s+paragraph/i.test(explanation)
    );
  }

  private buildTemplateParser() {
    return (rawTag: string) => {
      const tag = rawTag.trim();

      return {
        get: (scope: unknown) => {
          if (tag === '.') {
            if (
              scope &&
              typeof scope === 'object' &&
              Object.prototype.hasOwnProperty.call(
                scope as Record<string, unknown>,
                'combinedText',
              )
            ) {
              return (scope as Record<string, unknown>).combinedText ?? '';
            }

            return typeof scope === 'string' ? scope : '';
          }

          // Support primitive loop values when templates use named item tags
          // (for example: {#regledegestion}{regledegestion}{/regledegestion}).
          if (
            typeof scope === 'string' ||
            typeof scope === 'number' ||
            typeof scope === 'boolean'
          ) {
            return scope;
          }

          if (scope && typeof scope === 'object') {
            const scopeObject = scope as Record<string, unknown>;

            if (Object.prototype.hasOwnProperty.call(scopeObject, tag)) {
              return scopeObject[tag] ?? '';
            }

            const path = tag.split('.');
            let current: unknown = scopeObject;

            for (const key of path) {
              if (
                current &&
                typeof current === 'object' &&
                Object.prototype.hasOwnProperty.call(
                  current as Record<string, unknown>,
                  key,
                )
              ) {
                current = (current as Record<string, unknown>)[key];
              } else {
                return '';
              }
            }

            return current ?? '';
          }

          return '';
        },
      };
    };
  }

  private createDoc(
    templateBinary: Buffer | string,
    withImageModule: boolean,
  ): Docxtemplater {
    const zip = new PizZip(templateBinary);
    const modules: any[] = withImageModule ? [this.buildFsdImageModule()] : [];

    return new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules,
      nullGetter: () => '',
      parser: this.buildTemplateParser(),
    });
  }

  private normalizeFsdImageTemplateStructure(templateBinary: Buffer): Buffer {
    const zip = new PizZip(templateBinary);
    const documentXmlFile = zip.file('word/document.xml');

    if (!documentXmlFile) {
      return templateBinary;
    }

    const documentXml = documentXmlFile.asText();
    const imageLoopParagraphPattern =
      /<w:p\b[^>]*>[\s\S]*?<w:t>\{#images\}<\/w:t>[\s\S]*?<w:t[^>]*>\s*\{%image\}<\/w:t>[\s\S]*?<w:t>Figure \{figureNumber\} : \{figureTitle\}<\/w:t>[\s\S]*?<w:t>\{\/images\}<\/w:t>[\s\S]*?<\/w:p>/i;

    if (!imageLoopParagraphPattern.test(documentXml)) {
      return templateBinary;
    }

    const textRunPr =
      '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas" />' +
      '<w:b w:val="0" /><w:bCs w:val="0" /><w:i w:val="0" /><w:iCs w:val="0" />' +
      '<w:caps w:val="0" /><w:smallCaps w:val="0" /><w:noProof w:val="0" />' +
      '<w:color w:val="auto" /><w:sz w:val="24" /><w:szCs w:val="24" /><w:lang w:val="en-US" />' +
      '</w:rPr>';

    const captionRunPr =
      '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas" />' +
      '<w:b w:val="0" /><w:bCs w:val="0" /><w:i w:val="0" /><w:iCs w:val="0" />' +
      '<w:caps w:val="0" /><w:smallCaps w:val="0" /><w:noProof w:val="0" />' +
      '<w:color w:val="0F1115" /><w:sz w:val="19" /><w:szCs w:val="19" /><w:lang w:val="en-US" />' +
      '</w:rPr>';

    const paragraphPr =
      '<w:pPr><w:pStyle w:val="Normal" /><w:spacing w:before="80" /><w:ind w:left="454" />' +
      '<w:jc w:val="center" />' +
      '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas" w:cs="Consolas" />' +
      '<w:b w:val="0" /><w:bCs w:val="0" /><w:i w:val="0" /><w:iCs w:val="0" />' +
      '<w:caps w:val="0" /><w:smallCaps w:val="0" /><w:noProof w:val="0" />' +
      '<w:color w:val="auto" /><w:sz w:val="24" /><w:szCs w:val="24" /><w:lang w:val="en-US" />' +
      '</w:rPr></w:pPr>';

    const safeImageLoopBlock =
      `<w:p>${paragraphPr}<w:r>${textRunPr}<w:t>{#images}</w:t></w:r></w:p>` +
      `<w:p>${paragraphPr}<w:r>${textRunPr}<w:t>{%image}</w:t></w:r></w:p>` +
      `<w:p>${paragraphPr}<w:r>${captionRunPr}<w:t xml:space="preserve">Figure {figureNumber} : {figureTitle}</w:t></w:r></w:p>` +
      `<w:p>${paragraphPr}<w:r>${textRunPr}<w:t>{/images}</w:t></w:r></w:p>`;

    const updatedDocumentXml = documentXml.replace(
      imageLoopParagraphPattern,
      safeImageLoopBlock,
    );

    zip.file('word/document.xml', updatedDocumentXml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

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

    const originalTemplateBinary = fs.readFileSync(templatePath);
    const templateBinary = isFsd
      ? this.normalizeFsdImageTemplateStructure(originalTemplateBinary)
      : originalTemplateBinary;
    const useImageModule = isFsd;
    const doc = this.createDoc(templateBinary, useImageModule);

    const templateData = this.prepareTemplateData(documentModel);
    
    try {
      if (isFsd && useImageModule) {
        await doc.renderAsync(templateData);
      } else {
        doc.render(templateData);
      }
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

  private buildFsdImageModule(): unknown {
    return new ImageModule({
      centered: true,
      fileType: 'docx',
      getImage: async (tagValue: unknown) => {
        const raw = typeof tagValue === 'string' ? tagValue.trim() : '';
        if (!raw) {
          return WordTemplateGenerator.TRANSPARENT_PNG;
        }

        if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) {
          const base64 = raw.slice(raw.indexOf(',') + 1);
          if (base64) {
            return Buffer.from(base64, 'base64');
          }
        }

        if (/^https?:\/\//i.test(raw)) {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            WordTemplateGenerator.IMAGE_FETCH_TIMEOUT_MS,
          );

          try {
            const response = await fetch(raw, { signal: controller.signal });
            if (response.ok) {
              const imageBuffer = Buffer.from(await response.arrayBuffer());
              if (imageBuffer.length > 0) {
                return imageBuffer;
              }
            }
          } catch {
            this.logger.warn(`Unable to fetch FSD DOCX image: ${raw}`);
          } finally {
            clearTimeout(timeoutId);
          }
        }

        if (fs.existsSync(raw)) {
          try {
            return fs.readFileSync(raw);
          } catch {
            this.logger.warn(`Unable to read local FSD DOCX image: ${raw}`);
          }
        }

        return WordTemplateGenerator.TRANSPARENT_PNG;
      },
      getSize: () => [520, 280],
    });
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
          acceptanceCriteria: this.mapAcceptanceCriteriaForTemplate(story),
          reglesDeGestion: story.reglesDeGestion || [],
          regledegestion: story.reglesDeGestion || [],
          gestion: (story.gestion || []).map((item) => ({
            action: item.action || '',
            integration: item.integration || '',
          })),
          images: (story.images || []).map((item, imageIndex) => ({
            ...item,
            image: item.url || '',
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

  private mapAcceptanceCriteriaForTemplate(story: {
    acceptanceCriteria?: string[];
    acceptanceCriteriaDetails?: FsdAcceptanceCriterion[];
  }): Array<Record<string, unknown>> {
    const structuredCriteria = story.acceptanceCriteriaDetails || [];

    if (structuredCriteria.length > 0) {
      return structuredCriteria.map((criterion, index) => {
        const givenLine = `Étant donné que ${this.stripClausePrefix(criterion.given, [
          /^étant donné qu(?:e|['’])\s*/i,
          /^que\s+/i,
        ])}`.trim();
        const whenClause = this.stripClausePrefix(criterion.when, [/^quand\s+/i]);
        const whenLine = /^[aeiouyhàâæéèêëîïôœùûü]/i.test(whenClause)
          ? `Lorsqu’${whenClause}`
          : `Lorsque ${whenClause}`;
        const thenLine = `Alors ${this.stripClausePrefix(criterion.then, [/^alors\s+/i])}`.trim();
        const body = [givenLine, whenLine, thenLine]
          .filter((line) => line.length > 0)
          .join('\r\n');
        const candidateLabel = (criterion.criterionDescription || '').trim();
        const criterionLabel =
          candidateLabel && !this.isUuidLike(candidateLabel)
            ? candidateLabel
            : this.stripClausePrefix(criterion.given, [
                /^étant donné qu(?:e|['’])\s*/i,
                /^que\s+/i,
              ]).slice(0, 140) || `Critère ${index + 1}`;

        const renderScope = new String(body) as unknown as Record<string, unknown>;
        renderScope.id = criterionLabel;
        renderScope.criteredescription = criterionLabel;
        renderScope.criterionDescription = criterionLabel;
        renderScope.givenLine = givenLine;
        renderScope.whenLine = whenLine;
        renderScope.thenLine = thenLine;
        renderScope.combinedText = body;
        return renderScope;
      });
    }

    return (story.acceptanceCriteria || []).map((item, index) => {
      const criterionLabel = item.split('\n')[0] || `Critère ${index + 1}`;
      const body = item.replace(/\n/g, '\r\n');
      const renderScope = new String(body) as unknown as Record<string, unknown>;
      renderScope.id = criterionLabel;
      renderScope.criteredescription = criterionLabel;
      renderScope.criterionDescription = criterionLabel;
      renderScope.combinedText = body;
      return renderScope;
    });
  }

  private isUuidLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    );
  }

  private stripClausePrefix(value: string, patterns: RegExp[]): string {
    const normalized = value.trim();

    if (!normalized) {
      return '';
    }

    return patterns.reduce((currentValue, pattern) => currentValue.replace(pattern, ''), normalized);
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
