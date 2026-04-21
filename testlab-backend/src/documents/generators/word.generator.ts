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
import puppeteer from 'puppeteer';
import { buildPuppeteerLaunchOptions } from './puppeteer-launch.helper';
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
    editValues?: Record<string, string>,
  ): Promise<Buffer> {
    if (documentType === 'cahier') {
      return this.generateCahierFromTemplate(documentModel);
    }

    const html = this.htmlGenerator.generate(documentModel, undefined, documentType);
    const hydratedHtml = await this.hydrateHtmlWithEdits(html, editValues);

    const fileBuffer = await htmlToDocx(hydratedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: true,
    });

    return Buffer.from(fileBuffer);
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

  private async hydrateHtmlWithEdits(
    htmlContent: string,
    editValues?: Record<string, string>,
  ): Promise<string> {
    if (!editValues || Object.keys(editValues).length === 0) {
      return htmlContent;
    }

    const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      await page.evaluate((values) => {
        const body = document.body;

        const shouldAutoMarkEditable = (element: HTMLElement): boolean => {
          if (element.hasAttribute('data-edit-path')) {
            return false;
          }

          if (element.closest('style,script')) {
            return false;
          }

          const textContent = element.textContent?.replace(/\u00a0/g, ' ').trim() || '';
          if (!textContent.length) {
            return false;
          }

          if (element.children.length > 0) {
            return false;
          }

          return true;
        };

        const buildAutoEditPath = (element: HTMLElement, root: HTMLElement): string => {
          const segments: string[] = [];
          let current: HTMLElement | null = element;

          while (current && current !== root) {
            const parentElement: HTMLElement | null = current.parentElement;
            if (!parentElement) {
              break;
            }

            const currentTagName = current.tagName;
            const siblings = Array.from(parentElement.children).filter(
              (candidate: Element) => candidate.tagName === currentTagName,
            );
            const index = Math.max(0, siblings.indexOf(current));
            segments.unshift(`${current.tagName.toLowerCase()}${index}`);
            current = parentElement;
          }

          return `auto.${segments.join('.')}`;
        };

        body
          .querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,li,th,td,span')
          .forEach((element) => {
            if (!shouldAutoMarkEditable(element)) {
              return;
            }

            element.setAttribute('data-edit-path', buildAutoEditPath(element, body));
          });

        document.querySelectorAll<HTMLElement>('[data-edit-path]').forEach((element) => {
          const path = element.getAttribute('data-edit-path');
          if (!path) {
            return;
          }

          if (Object.prototype.hasOwnProperty.call(values, path)) {
            element.textContent = values[path];
          }
        });
      }, editValues);

      return await page.content();
    } finally {
      await browser.close();
    }
  }

  private renderTemplate(
    templateBinary: string,
    data: Record<string, unknown>,
    delimiters?: { start: string; end: string },
  ): Buffer {
    const zip = new PizZip(templateBinary);
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

  private toCahierModel(documentModel: DocumentModel): CahierDocumentModel {
    if ('suites' in documentModel && 'project' in documentModel) {
      return documentModel as CahierDocumentModel;
    }

    throw new InternalServerErrorException('DOCX template rendering failed');
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
  ): Promise<Buffer> {
    const html = this.htmlGenerator.generateWithLanguage(
      documentModel,
      undefined,
      documentType,
      language,
    );

    const fileBuffer = await htmlToDocx(html, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: true,
    });

    return Buffer.from(fileBuffer);
  }
}
