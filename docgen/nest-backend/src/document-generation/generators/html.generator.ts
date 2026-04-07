import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import type { Suite, TestCase } from '../interfaces/cahier-recette.interface';
import type {
  CahierDocumentModel,
  DocumentModel,
  SupportedDocumentType,
} from '../interfaces/document-model.interface';

@Injectable()
export class HtmlGenerator {
  private static helpersRegistered = false;
  private compiledTemplates = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  generate(
    model: DocumentModel,
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): string {
    const template = this.getCompiledTemplate(mode, documentType);
    const renderModel = this.normalizeModel(model, documentType);
    return template(renderModel);
  }

  private getCompiledTemplate(
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): Handlebars.TemplateDelegate {
    const templateSegments =
      documentType === 'fsd'
        ? ['fsd', mode === 'debug' ? 'fsd-debug.hbs' : 'fsd.hbs']
        : [mode === 'debug' ? 'cahier-recette-debug.hbs' : 'cahier-recette.hbs'];

    const templateName = path.join(...templateSegments);

    const cachedTemplate = this.compiledTemplates.get(templateName);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    const templatePath = path.join(
      process.cwd(),
      'templates',
      'pdf',
      ...templateSegments,
    );

    if (!fs.existsSync(templatePath)) {
      throw new InternalServerErrorException(
        `Template not found: ${templatePath}`,
      );
    }

    const source = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(source);
    this.compiledTemplates.set(templateName, compiledTemplate);
    return compiledTemplate;
  }

  private registerHelpers(): void {
    if (HtmlGenerator.helpersRegistered) {
      return;
    }

    Handlebars.registerHelper('suiteHeading', (depth: number, numbering: string, name: string) => {
      const normalizedDepth = Number.isInteger(depth) ? depth : 0;
      const headingLevel = Math.min(Math.max(2 + normalizedDepth, 2), 4);
      const title = numbering
        ? `${Handlebars.escapeExpression(numbering)}. ${Handlebars.escapeExpression(name)}`
        : Handlebars.escapeExpression(name);
      return new Handlebars.SafeString(
        `<h${headingLevel} class="suite-title">${title}</h${headingLevel}>`,
      );
    });

    Handlebars.registerHelper('sectionNumber', (...args: unknown[]) => {
      const values = args.slice(0, -1);
      if (values.length === 0) {
        return '';
      }

      if (typeof values[0] === 'string') {
        const prefix = values[0].trim();
        const indexValue = Number(values[1]);
        if (!Number.isFinite(indexValue)) {
          return prefix;
        }

        const suffix = `${Math.floor(indexValue) + 1}`;
        return prefix ? `${prefix}.${suffix}` : suffix;
      }

      return values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => `${Math.floor(value) + 1}`)
        .join('.');
    });

    Handlebars.registerHelper('formatDate', (value: string) => {
      if (!value) {
        return '';
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      const day = `${date.getDate()}`.padStart(2, '0');
      const month = `${date.getMonth() + 1}`.padStart(2, '0');
      const year = `${date.getFullYear()}`;
      return `${day}/${month}/${year}`;
    });

    HtmlGenerator.helpersRegistered = true;
  }

  private normalizeModel(
    model: DocumentModel,
    documentType: SupportedDocumentType,
  ): DocumentModel | (CahierDocumentModel & { suites: RenderSuite[] }) {
    if (documentType !== 'cahier' || !this.isCahierModel(model)) {
      return model;
    }

    return this.normalizeCahierModel(model);
  }

  private normalizeCahierModel(
    model: CahierDocumentModel,
  ): CahierDocumentModel & { suites: RenderSuite[] } {
    const sortedSuites = [...model.suites]
      .sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.name.localeCompare(right.name);
      })
      .map((suite, index) => this.mapSuite(suite, 0, `${index + 1}`));

    return {
      ...model,
      metadata: {
        ...model.metadata,
        companyLogo: this.resolveLogoPath(model.metadata.companyLogo),
        clientLogo: this.resolveLogoPath(model.metadata.clientLogo),
      },
      suites: sortedSuites,
    };
  }

  private isCahierModel(model: DocumentModel): model is CahierDocumentModel {
    return 'suites' in model && Array.isArray(model.suites);
  }

  private resolveLogoPath(logoPath?: string): string | undefined {
    if (!logoPath) {
      return undefined;
    }

    // Already a URL or data URL
    if (/^(https?:|data:|file:)/i.test(logoPath)) {
      return logoPath;
    }

    // Convert relative path to base64 data URL
    if (logoPath.startsWith('src/')) {
      try {
        const absolutePath = path.join(process.cwd(), logoPath);
        const fileBuffer = fs.readFileSync(absolutePath);
        const base64String = fileBuffer.toString('base64');
        const extension = path.extname(logoPath).toLowerCase().slice(1);
        const mimeType = this.getMimeType(extension);
        return `data:${mimeType};base64,${base64String}`;
      } catch (error) {
        console.error(`Failed to read logo file: ${logoPath}`, error);
        return undefined;
      }
    }

    return logoPath;
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }

  private mapSuite(suite: Suite, depth: number, numbering: string): RenderSuite {
    const sortedTestCases = [...suite.testCases]
      .map((testCase) => this.mapTestCase(testCase))
      .sort((left, right) => {
        const byCode = left.code.localeCompare(right.code);
        if (byCode !== 0) {
          return byCode;
        }

        return left.name.localeCompare(right.name);
      });

    const sortedChildren = [...suite.children].sort((left, right) => {
      const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.name.localeCompare(right.name);
    });

    return {
      ...suite,
      depth,
      numbering,
      order: suite.order,
      testCases: sortedTestCases,
      children: sortedChildren.map((child, index) =>
        this.mapSuite(child, depth + 1, `${numbering}.${index + 1}`),
      ),
    };
  }

  private mapTestCase(testCase: TestCase): TestCase {
    return {
      ...testCase,
      preconditions: [...testCase.preconditions].sort(
        (left, right) => left.order - right.order,
      ),
      steps: [...testCase.steps].sort((left, right) => left.order - right.order),
    };
  }
}

type RenderSuite = Suite & {
  depth: number;
  numbering: string;
  children: RenderSuite[];
};
