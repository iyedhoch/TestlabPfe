import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import Docxtemplater from 'docxtemplater';
import * as JSZip from 'jszip';
import PizZip from 'pizzip';
import type {
  CahierDocumentModel,
  DocumentModel,
  FsdDocumentModel,
} from '../interfaces/document-model.interface';
import type { FsdAcceptanceCriterion } from '../interfaces/fsd.interface';
import type { Suite, TestCase } from '../interfaces/cahier-recette.interface';
import { fetchRemoteBinary, toDataUri } from './remote-image.helper';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ImageModule = require('open-docxtemplater-image-module');

@Injectable()
export class WordTemplateGenerator {
  private readonly logger = new Logger(WordTemplateGenerator.name);
  private static readonly IMAGE_FETCH_TIMEOUT_MS = 15_000;
  private static readonly TRANSPARENT_PNG_DATA_URI =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2p5ocAAAAASUVORK5CYII=';

  private static readonly TRANSPARENT_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2p5ocAAAAASUVORK5CYII=',
    'base64',
  );

  private async hydrateFsdRemoteImagesForTemplate(
    templateData: Record<string, unknown>,
  ): Promise<void> {
    const epics = templateData.epics;

    if (!Array.isArray(epics)) {
      return;
    }

    for (const epic of epics) {
      const features = (epic as { features?: unknown[] })?.features;
      if (!Array.isArray(features)) {
        continue;
      }

      for (const feature of features) {
        const stories = (feature as { userStories?: unknown[] })?.userStories;
        if (!Array.isArray(stories)) {
          continue;
        }

        for (const story of stories) {
          const images = (story as { images?: unknown[] })?.images;
          if (!Array.isArray(images)) {
            continue;
          }

          for (const imageItem of images) {
            const imageRecord = imageItem as { image?: unknown };
            const currentValue =
              typeof imageRecord.image === 'string' ? imageRecord.image.trim() : '';

            if (!currentValue) {
              imageRecord.image = WordTemplateGenerator.TRANSPARENT_PNG_DATA_URI;
              continue;
            }

            if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(currentValue)) {
              continue;
            }

            if (/^https?:\/\//i.test(currentValue)) {
              try {
                const result = await fetchRemoteBinary(currentValue, {
                  timeoutMs: WordTemplateGenerator.IMAGE_FETCH_TIMEOUT_MS,
                });

                if (result && result.buffer.length > 0) {
                  imageRecord.image = toDataUri(result.contentType, result.buffer);
                  continue;
                }
              } catch {
                this.logger.warn(
                  `Unable to fetch FSD DOCX image during hydration: ${currentValue}`,
                );
              }

              imageRecord.image = WordTemplateGenerator.TRANSPARENT_PNG_DATA_URI;
              continue;
            }

            if (fs.existsSync(currentValue)) {
              try {
                const localImageBuffer = fs.readFileSync(currentValue);
                if (localImageBuffer.length > 0) {
                  const extension = currentValue.toLowerCase().split('.').pop();
                  const mime =
                    extension === 'jpg' || extension === 'jpeg'
                      ? 'image/jpeg'
                      : extension === 'webp'
                        ? 'image/webp'
                        : extension === 'gif'
                          ? 'image/gif'
                          : 'image/png';

                  imageRecord.image = `data:${mime};base64,${localImageBuffer.toString('base64')}`;
                  continue;
                }
              } catch {
                this.logger.warn(
                  `Unable to read local FSD DOCX image during hydration: ${currentValue}`,
                );
              }
            }

            imageRecord.image = WordTemplateGenerator.TRANSPARENT_PNG_DATA_URI;
          }
        }
      }
    }
        // ── Hydrate company and client logos for footer ──
    const hydrateLogo = async (key: string, logoUrl: unknown) => {
      if (typeof logoUrl !== 'string' || !logoUrl.trim()) {
        (templateData as Record<string, unknown>)[key] = [];
        return;
      }

      const url = logoUrl.trim();

      // Already a data URI
      if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(url)) {
        (templateData as Record<string, unknown>)[key] = [{ image: url }];
        return;
      }

      // External URL — fetch and inline
      if (/^https?:\/\//i.test(url)) {
        try {
          const result = await fetchRemoteBinary(url, {
            timeoutMs: WordTemplateGenerator.IMAGE_FETCH_TIMEOUT_MS,
          });
          if (result && result.buffer.length > 0) {
            const dataUri = toDataUri(result.contentType, result.buffer);
            (templateData as Record<string, unknown>)[key] = [{ image: dataUri, size: [200, 80] }];

            
            return;
          }
        } catch {
          this.logger.warn(`Unable to fetch logo for Word footer: ${url}`);
        }
      }

      // If file path exists (unlikely for logos but just in case)
      if (fs.existsSync(url)) {
        try {
          const buf = fs.readFileSync(url);
          if (buf.length > 0) {
            const ext = url.split('.').pop()?.toLowerCase() ?? 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
              : ext === 'webp' ? 'image/webp'
              : ext === 'gif' ? 'image/gif'
              : 'image/png';
            const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
            (templateData as Record<string, unknown>)[key] = [{ image: dataUri }];

            
            return;
          }
        } catch {
          this.logger.warn(`Unable to read local logo file: ${url}`);
        }
      }

      // Fallback – empty array hides the placeholder
      (templateData as Record<string, unknown>)[key] = [];
    };

    await hydrateLogo('companylogo', (templateData as Record<string, unknown>).companyLogo);
    await hydrateLogo('clientlogo', (templateData as Record<string, unknown>).clientLogo);

  }

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

          // Handle section tags (#, /, ^) – MUST be before direct property lookup
          if (tag.startsWith('#') || tag.startsWith('/') || tag.startsWith('^')) {
            const cleanTag = tag.substring(1);
            if (scope && typeof scope === 'object' && Object.prototype.hasOwnProperty.call(scope as Record<string, unknown>, cleanTag)) {
              return (scope as Record<string, unknown>)[cleanTag] ?? '';
            }
            // Return undefined for missing tags so docxtemplater can walk parent scopes.
            return undefined;
          }

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
              const value = scopeObject[tag];
              return value ?? '';
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
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`Template tag not found: ${tag} (current path: ${key})`);
                }
                return undefined;
              }
            }

            return current ?? '';
          }

          return undefined;
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
    // Also normalize footer parts (word/footer1.xml, word/footer2.xml, etc.)
    const footerFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith('word/footer') && name.endsWith('.xml')
    );
    for (const footerPath of footerFiles) {
      const footerFile = zip.file(footerPath);
      if (!footerFile) continue;

      const originalFooterXml = footerFile.asText();
      let footerXml = originalFooterXml;

      // Re-join split tags (same regex as for document)
      footerXml = footerXml.replace(
        /\{(?:[^{}]|<\/w:t>[\s\S]*?<w:t[^>]*>)+\}/g,
        (match) => match.replace(/<\/w:t>[\s\S]*?<w:t[^>]*>/g, ''),
      );

      // Force {%image} tags into a proper paragraph if they aren't already
      const imageParagraphRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
      let replacedImage = false;
      const updatedFooterXml = footerXml.replace(imageParagraphRegex, (paragraph) => {
        if (!paragraph.includes('{%image}')) return paragraph;

        replacedImage = true;
        const pPr = paragraph.match(/<w:pPr[\s\S]*?<\/w:pPr>/i)?.[0] || '';
        const buildPara = (text: string, preserve = false): string =>
          `<w:p>${pPr}<w:r><w:t${preserve ? ' xml:space="preserve"' : ''}>${text}</w:t></w:r></w:p>`;

        if (paragraph.includes('{#') && paragraph.includes('{/')) {
            const tags: string[] = paragraph.match(/\{[#/%][^}]*\}/g) || [];
            
            // Determine alignment based on the logo type
            const isCompany = paragraph.includes('companylogo');
            const alignment = isCompany ? 'left' : 'right';
            
            return tags.map((tag, index) => {
                // For the start and image tags, apply the alignment; for the end tag, same alignment
                const alignPPr = `<w:pPr><w:jc w:val="${alignment}"/></w:pPr>`;
                return `<w:p>${alignPPr}<w:r><w:t xml:space="preserve">${tag}</w:t></w:r></w:p>`;
            }).join('');
        } else {
            // Single {%image} – default centre alignment (shouldn't occur in footer)
            return buildPara('{%image}');
        }
      });

      if (replacedImage && updatedFooterXml !== originalFooterXml) {
        zip.file(footerPath, updatedFooterXml);
      }
    }

    if (!documentXmlFile) {
      return templateBinary;
    }

    const originalDocumentXml = documentXmlFile.asText();
    let documentXml = originalDocumentXml;

    documentXml = documentXml.replace(
      /\{(?:[^{}]|<\/w:t>[\s\S]*?<w:t[^>]*>)+\}/g,
      (match) => match.replace(/<\/w:t>[\s\S]*?<w:t[^>]*>/g, ''),
    );

    let replacedImageParagraph = false;
    const updatedDocumentXml = documentXml.replace(
      /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi,
      (paragraph) => {
        if (
          !paragraph.includes('{#images}') ||
          !paragraph.includes('{%image}') ||
          !paragraph.includes('{/images}')
        ) {
          return paragraph;
        }

        replacedImageParagraph = true;
        const paragraphProps = paragraph.match(/<w:pPr[\s\S]*?<\/w:pPr>/i)?.[0] || '';
        const buildParagraph = (text: string, preserveSpace = false) =>
          `<w:p>${paragraphProps}<w:r><w:t${preserveSpace ? ' xml:space="preserve"' : ''}>${text}</w:t></w:r></w:p>`;

        return [
          buildParagraph('{#images}'),
          buildParagraph('{%image}'),
          buildParagraph('Figure {figureNumber} : {figureTitle}', true),
          buildParagraph('{/images}'),
        ].join('');
      },
    );



    zip.file('word/document.xml', updatedDocumentXml);
    return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private ensureUpdateFieldsInTemplate(templateBinary: Buffer): Buffer {
    const zip = new PizZip(templateBinary);
    const settingsPath = 'word/settings.xml';

    // Build the settings XML with updateFields forced to true
    const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:updateFields w:val="true"/>
</w:settings>`;

    // Replace or create the settings part
    zip.file(settingsPath, settingsXml);

    // Ensure the content types include the settings part
    const contentTypePath = '[Content_Types].xml';
    const contentTypeFile = zip.file(contentTypePath);
    if (contentTypeFile) {
        let contentTypes = contentTypeFile.asText();
        if (!contentTypes.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.settings')) {
            contentTypes = contentTypes.replace(
                '</Types>',
                `<Default Extension="settings" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings"/></Types>`
            );
            zip.file(contentTypePath, contentTypes);
        }
    }

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
    const normalizedForFsd = isFsd
      ? this.normalizeFsdImageTemplateStructure(originalTemplateBinary)
      : originalTemplateBinary;
    // Force auto-update of fields (TOC, TOF) on open
    const templateBinary = this.ensureUpdateFieldsInTemplate(normalizedForFsd);
    const useImageModule = isFsd;
    const doc = this.createDoc(templateBinary, useImageModule);

    const templateData = this.prepareTemplateData(documentModel);
    
    // Log comprehensive data information for debugging
    const epicsData = (templateData as any).epics;
    const featuresCount = epicsData?.reduce((sum: number, epic: any) => sum + (epic.features?.length || 0), 0) || 0;
    const storiesCount = epicsData?.reduce((sum: number, epic: any) => 
      sum + epic.features?.reduce((fSum: number, f: any) => fSum + (f.userStories?.length || 0), 0) || 0, 0) || 0;

    this.logger.log('Template data structure:', {
      keys: Object.keys(templateData),
      hasEpics: 'epics' in templateData,
      epicCount: Array.isArray(epicsData) ? epicsData.length : 0,
      featuresCount,
      storiesCount,
      hasMetadata: 'metadata' in templateData,
      hasFunctionalRequirements: 'functionalRequirements' in templateData,
      requirementCount: Array.isArray((templateData as any).functionalRequirements) ? (templateData as any).functionalRequirements.length : 0,
      hasApprovals: 'approvals' in templateData,
      approvalCount: Array.isArray((templateData as any).approvals) ? (templateData as any).approvals.length : 0,
      metadataTitle: (templateData as any).metadata?.title || 'N/A',
      metadataAuthor: (templateData as any).metadata?.author || 'N/A',
    });

    // If data is unexpectedly empty, log detailed diagnostic information
    if (!epicsData || (Array.isArray(epicsData) && epicsData.length === 0)) {
      this.logger.warn('⚠️  WARNING: No epics found in FSD document model!', {
        epicsType: typeof epicsData,
        epicsArray: Array.isArray(epicsData),
        epicsLength: epicsData?.length,
        documentModelHasEpics: 'epics' in documentModel,
        documentModelEpicCount: (documentModel as any).epics?.length,
      });
    }

    
    try {
      if (isFsd && useImageModule) {
        this.logger.log('Hydrating FSD images...');
        await this.hydrateFsdRemoteImagesForTemplate(templateData);
      }

      this.logger.log('Rendering template with docxtemplater...');
      doc.render(templateData);
      this.logger.log('Template rendered successfully');
    } catch (error) {
      this.logger.error('Docxtemplater render error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        properties:
          (error as { properties?: Record<string, unknown> })?.properties ||
          undefined,
        templateDataKeys: Object.keys(templateData),
        templateDataSample: JSON.stringify(templateData, null, 2).substring(0, 1000),
      });
      throw new InternalServerErrorException(`Template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const resultBuffer = doc
      .getZip()
      .generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    return Buffer.from(resultBuffer);
  }

  private buildFsdImageModule(): unknown {
    const imageModule = new ImageModule({
      centered: true,
      fileType: 'docx',
      getImage: (tagValue: unknown) => {
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

        if (fs.existsSync(raw)) {
          try {
            return fs.readFileSync(raw);
          } catch {
            this.logger.warn(`Unable to read local FSD DOCX image: ${raw}`);
          }
        }

        return WordTemplateGenerator.TRANSPARENT_PNG;
      },
      getSize: () => [120, 50],
      
    });

    const renderFn = (imageModule as { render?: unknown }).render;
    if (typeof renderFn === 'function') {
      (imageModule as { render: unknown }).render = (
        part: { module?: string } & Record<string, unknown>,
        options: {
          scopeManager?: {
            getValue: (tag: string, meta?: { part: unknown }) => unknown;
          };
        } & Record<string, unknown>,
      ) => {
        const scopeManager = options?.scopeManager;
        const originalGetValue = scopeManager?.getValue?.bind(scopeManager);

        if (scopeManager && typeof originalGetValue === 'function') {
          scopeManager.getValue = (tag: string, meta?: { part: unknown }) =>
            originalGetValue(tag, meta || { part });
        }

        try {
          return (renderFn as (
            modulePart: Record<string, unknown>,
            moduleOptions: Record<string, unknown>,
          ) => unknown).call(imageModule, part, options);
        } finally {
          if (scopeManager && typeof originalGetValue === 'function') {
            scopeManager.getValue = originalGetValue;
          }
        }
      };
    }

    return imageModule;
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
              'cahier-recette-fixed.docx',
            ),
            join(
              process.cwd(),
              'dist',
              'src',
              'documents',
              'templates',
              'word',
              'cahier-recette-fixed.docx',
            ),
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
    const project = documentModel.project;
    const template = documentModel.template;

    const suites = this.mapSuitesForTemplate(documentModel.suites || []);
    const approvals = (documentModel.approvals || []).map((approval) => ({
      approverName: approval.approverName || approval.name || '',
      approverRole: approval.approverRole || approval.role || '',
      approvalDate: this.toCahierDateString(approval.approvalDate || approval.date),
    }));

    const titleSeed = metadata?.clientName || project?.name || '';
    const documentTitle = metadata?.title?.trim()
      ? metadata.title.trim()
      : titleSeed
        ? `Cahier de recette - ${titleSeed}`
        : 'Cahier de recette';

    const testCaseCount = suites.reduce((sum, suite) => {
      const items = (suite as { testCases?: unknown[] }).testCases || [];
      return sum + (Array.isArray(items) ? items.length : 0);
    }, 0);

    this.logger.log('Building Cahier template data with metadata:', {
      hasMetadata: !!metadata,
      metadataKeys: metadata ? Object.keys(metadata) : [],
    });

    const data = {
      clientName: metadata?.clientName || project?.name || '',
      projectName: project?.name || '',
      version: metadata?.version || '',
      date: this.toCahierDateString(metadata?.date),
      author: metadata?.author || '',
      documentTitle,
      fileName: this.buildCahierFileName(project?.id, metadata?.version),
      templateName: template?.name || '',
      approvals,
      projectDescription: documentModel.context?.description || '',
      projectObjective: documentModel.context?.objective || '',
      projectOwner: project?.owner || '',
      suites,
      testCaseCount,
      openDefects: this.coerceOpenDefects(project?.openDefects),
      template: {
        footer: template?.footer || '',
      },
    };

    const processedData = this.replaceNullishRecord(data);

    this.logger.log('Final Cahier template data keys:', {
      hasProjectName: 'projectName' in processedData,
      hasAuthor: 'author' in processedData,
      hasSuites: 'suites' in processedData,
      suiteCount: Array.isArray((processedData as any).suites) ? (processedData as any).suites.length : 0,
      hasApprovals: 'approvals' in processedData,
      approvalCount: Array.isArray((processedData as any).approvals) ? (processedData as any).approvals.length : 0,
    });

    return processedData;
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
      companyLogo: metadata.companyLogo || '',
      clientLogo: metadata.clientLogo || '',
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

    const images = epics.flatMap((epic) =>
      (epic.features || []).flatMap((feature) =>
        (feature.userStories || []).flatMap((story) =>
          (story.images || []).map((item) => ({
            image: item.image || item.url || '',
            figureNumber: item.figureNumber || '',
            figureTitle: item.figureTitle || item.caption || item.alt || '',
          })),
        ),
      ),
    );

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
      'metadata.companyLogo': normalizedMetadata.companyLogo,
      'metadata.clientLogo': normalizedMetadata.clientLogo,
      
      // IMPORTANT: Also include all metadata fields at root level
      // This is for {author}, {clientName}, {version}, {date} syntax
      author: normalizedMetadata.author,
      clientName: normalizedMetadata.clientName,
      version: normalizedMetadata.version,
      date: normalizedMetadata.date,
      title: normalizedMetadata.title,
      projectName: normalizedMetadata.projectName,
      companyLogo: normalizedMetadata.companyLogo,
      clientLogo: normalizedMetadata.clientLogo,
      
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
      images,
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
      hasReferenceContent:
        documentModel.hasReferenceContent ??
        ((documentModel.referenceDocuments || []).length > 0 ||
          (documentModel.glossary || []).length > 0),
    };

    const processedData = this.replaceNullishRecord(data);
    
    this.logger.log('Final FSD template data keys:', {
      hasMetadata: 'metadata' in processedData,
      hasMetadataAuthorAlias: 'metadata.author' in processedData,
      hasAuthor: 'author' in processedData,
      hasClientName: 'clientName' in processedData,
      hasVersion: 'version' in processedData,
      hasDate: 'date' in processedData,
      hasEpics: 'epics' in processedData,
      epicCount: Array.isArray((processedData as any).epics) ? (processedData as any).epics.length : 0,
      hasFunctionalRequirements: 'functionalRequirements' in processedData,
      functionalRequirementCount: Array.isArray((processedData as any).functionalRequirements) ? (processedData as any).functionalRequirements.length : 0,
    });

    return processedData;
  }

  private mapSuitesForTemplate(suites: Suite[]): Array<Record<string, unknown>> {
    return this.mapSuitesForTemplateWithPrefix(suites, '');
  }

  private mapTestCasesForTemplate(
    testCases: TestCase[],
    suiteNumber: string,
  ): Array<Record<string, unknown>> {
    return testCases.map((testCase, index) => ({
      caseNumber: `${suiteNumber}.${index + 1}`,
      code: testCase.code || '',
      name: testCase.name || '',
      summary: testCase.summary || '',
      preconditions: (testCase.preconditions || []).map((precondition) => ({
        content: precondition.content || '',
      })),
      steps: (testCase.steps || []).map((step, stepIndex) => ({
        order: step.order ?? stepIndex + 1,
        action: step.action || '',
        expectedResult: step.expectedResult || '',
      })),
    }));
  }

  private mapSuitesForTemplateWithPrefix(
    suites: Suite[],
    prefix: string,
  ): Array<Record<string, unknown>> {
    const result: Array<Record<string, unknown>> = [];

    suites.forEach((suite, index) => {
      const suiteNumber = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;

      result.push({
        suitenumber: suiteNumber,
        name: suite.name || '',
        testCases: this.mapTestCasesForTemplate(
          suite.testCases || [],
          suiteNumber,
        ),
      });

      if (suite.children && suite.children.length > 0) {
        result.push(...this.mapSuitesForTemplateWithPrefix(suite.children, suiteNumber));
      }
    });

    return result;
  }

  private buildCahierFileName(
    projectId?: number | string,
    version?: string,
  ): string {
    const safeProjectId =
      typeof projectId === 'number' || typeof projectId === 'string'
        ? String(projectId).trim()
        : '';
    const safeVersion = (version || '').trim();
    const parts = ['cahier-recette', safeProjectId, safeVersion].filter(
      (item) => item.length > 0,
    );

    return `${parts.join('-') || 'cahier-recette'}.docx`;
  }

  private coerceOpenDefects(value?: number | string): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '';
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    return String(value);
  }

  private toCahierDateString(value?: string | Date): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString('fr-FR');
    }

    const normalized = typeof value === 'string' ? value.trim() : String(value);

    if (!normalized) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('fr-FR');
      }
    }

    return normalized;
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
    return '';  // ← Return empty string, NOT 'N/A'
  }

  if (Array.isArray(value)) {
    // ← IMPORTANT: Keep arrays as arrays, don't convert empty arrays to 'N/A'
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
