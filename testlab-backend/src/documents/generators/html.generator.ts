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
  private static readonly FSD_UPDATED_TEMPLATE_TEST_MODE =
    'fsd-updated-template-test';
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

  generateWithLanguage(
    model: DocumentModel,
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
    language: 'en' | 'fr' = 'en',
  ): string {
    const template = this.getCompiledTemplateWithLanguage(
      mode,
      documentType,
      language,
    );
    const renderModel = this.normalizeModel(model, documentType);
    return template(renderModel);
  }

  private getCompiledTemplate(
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): Handlebars.TemplateDelegate {
    const templateSegments =
      documentType === 'fsd'
        ? [
            'fsd',
            mode === 'debug'
              ? 'fsd-debug.hbs'
              : mode === HtmlGenerator.FSD_UPDATED_TEMPLATE_TEST_MODE
                ? 'fsd-fr-v5.hbs'
                : 'fsd.hbs',
          ]
        : [
            mode === 'template-debug'
              ? 'cahier-recette-debug.hbs'
              : mode === 'debug'
                ? 'cahier-recette-debug-data.hbs'
                : 'cahier-recette.hbs',
          ];

    const templateName = path.join(...templateSegments);
    const cachedTemplate = this.compiledTemplates.get(templateName);

    if (cachedTemplate) {
      return cachedTemplate;
    }

    const templatePath = this.resolveTemplatePath(templateSegments);

    if (!templatePath) {
      throw new InternalServerErrorException(
        `Template not found for segments: ${templateSegments.join('/')}`,
      );
    }

    const source = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(source);
    this.compiledTemplates.set(templateName, compiledTemplate);
    return compiledTemplate;
  }

  private getCompiledTemplateWithLanguage(
    mode?: string,
    documentType: SupportedDocumentType = 'cahier',
    language: 'en' | 'fr' = 'en',
  ): Handlebars.TemplateDelegate {
    const templateSegments =
      documentType === 'fsd'
        ? [
            'fsd',
            mode === 'debug'
              ? language === 'fr'
                ? 'fsd-debug-fr.hbs'
                : 'fsd-debug.hbs'
              : mode === HtmlGenerator.FSD_UPDATED_TEMPLATE_TEST_MODE
                ? 'fsd-fr-v5.hbs'
              : language === 'fr'
              ? 'fsd-fr-v5.hbs'
              : 'fsd.hbs',
          ]
        : [
            mode === 'template-debug'
              ? 'cahier-recette-debug.hbs'
              : mode === 'debug'
                ? 'cahier-recette-debug-data.hbs'
                : 'cahier-recette.hbs',
          ];

    const templateName = path.join(...templateSegments);
    const cachedTemplate = this.compiledTemplates.get(templateName);

    if (cachedTemplate) {
      return cachedTemplate;
    }

    const templatePath = this.resolveTemplatePath(templateSegments);

    if (!templatePath) {
      throw new InternalServerErrorException(
        `Template not found for segments: ${templateSegments.join('/')} (language: ${language})`,
      );
    }

    const source = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(source);
    this.compiledTemplates.set(templateName, compiledTemplate);
    return compiledTemplate;
  }

  private resolveTemplatePath(templateSegments: string[]): string | null {
    const candidates = [
      path.join(process.cwd(), 'src', 'documents', 'templates', 'pdf', ...templateSegments),
      path.join(process.cwd(), 'dist', 'src', 'documents', 'templates', 'pdf', ...templateSegments),
      path.join(process.cwd(), 'documents', 'templates', 'pdf', ...templateSegments),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
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

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

    Handlebars.registerHelper('add', (a: unknown, b: unknown) => {
      const left = Number(a);
      const right = Number(b);

      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return '';
      }

      return left + right;
    });

    Handlebars.registerHelper('path', (...args: unknown[]) => {
      const values = args.slice(0, -1);
      return values
        .map((value) => String(value ?? '').trim())
        .filter((value) => value.length > 0)
        .join('.');
    });

    Handlebars.registerHelper(
      'editable',
      function (this: Record<string, unknown>, editPath: unknown, fallbackValue: unknown) {
        const normalizedPath = String(editPath ?? '').trim();
        const editValues = this.editValues as Record<string, unknown> | undefined;

        if (
          normalizedPath.length > 0 &&
          editValues &&
          Object.prototype.hasOwnProperty.call(editValues, normalizedPath)
        ) {
          const overrideValue = editValues[normalizedPath];
          return overrideValue == null ? '' : String(overrideValue);
        }

        return fallbackValue == null ? '' : String(fallbackValue);
      },
    );

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
      .map((suite, index) => this.mapSuite(suite, 0, `${index + 1}`, `suites.${index}`));

    return {
      ...model,
      metadata: {
        ...model.metadata,
      },
      suites: sortedSuites,
    };
  }

  private isCahierModel(model: DocumentModel): model is CahierDocumentModel {
    return 'suites' in model && Array.isArray(model.suites);
  }

  private mapSuite(
    suite: Suite,
    depth: number,
    numbering: string,
    editPath: string,
  ): RenderSuite {
    const sortedTestCases = [...suite.testCases]
      .sort((left, right) => {
        const byCode = left.code.localeCompare(right.code);
        if (byCode !== 0) {
          return byCode;
        }
        return left.name.localeCompare(right.name);
      })
      .map((testCase, index) => this.mapTestCase(testCase, `${editPath}.testCases.${index}`));

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
      editPath,
      testCases: sortedTestCases,
      children: sortedChildren.map((child, index) =>
        this.mapSuite(child, depth + 1, `${numbering}.${index + 1}`, `${editPath}.children.${index}`),
      ),
    };
  }

  private mapTestCase(testCase: TestCase, editPath: string): RenderTestCase {
    return {
      ...testCase,
      editPath,
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
  editPath: string;
  children: RenderSuite[];
  testCases: RenderTestCase[];
};

type RenderTestCase = TestCase & {
  editPath: string;
};
