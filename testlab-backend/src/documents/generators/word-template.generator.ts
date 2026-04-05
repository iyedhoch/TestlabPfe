import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type {
  CahierDocumentModel,
  DocumentModel,
} from '../interfaces/document-model.interface';
import type { Suite, TestCase } from '../interfaces/cahier-recette.interface';

@Injectable()
export class WordTemplateGenerator {
  private readonly logger = new Logger(WordTemplateGenerator.name);

  async generate(documentModel: DocumentModel): Promise<Buffer> {
    const templatePath = this.resolveTemplatePath();
    if (!templatePath) {
      throw new InternalServerErrorException(
        'Word template file not found for Cahier template generation',
      );
    }

    this.logger.log('Template loaded successfully');

    const templateBinary = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(templateBinary);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const templateData = this.prepareTemplateData(documentModel);
    doc.render(templateData);

    const resultBuffer = doc
      .getZip()
      .generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    return Buffer.from(resultBuffer);
  }

  private resolveTemplatePath(): string | null {
    const candidates = [
      // Explicitly prioritize the exact user-provided path.
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
      join(process.cwd(), 'src', 'documents', 'templates', 'docx', 'cahier-template.docx'),
      join(process.cwd(), 'dist', 'src', 'documents', 'templates', 'docx', 'cahier-template.docx'),
      join(process.cwd(), 'src', 'documents', 'templates', 'word', 'cahier-template.docx'),
      join(process.cwd(), 'dist', 'src', 'documents', 'templates', 'word', 'cahier-template.docx'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private prepareTemplateData(documentModel: DocumentModel): Record<string, unknown> {
    if (!('suites' in documentModel)) {
      throw new InternalServerErrorException(
        'Cahier template generation expects a Cahier document model',
      );
    }

    const cahierModel = documentModel as CahierDocumentModel;
    const metadata = cahierModel.metadata;

    return {
      projectName: cahierModel.project?.name || '',
      projectDescription: cahierModel.context?.description || '',
      clientName: metadata?.clientName || '',
      version: metadata?.version || '',
      date: this.formatDate(metadata?.date),
      author: metadata?.author || '',
      suites: this.mapSuitesForTemplate(cahierModel.suites || []),
      approvals: (cahierModel.approvals || []).map((approval) => ({
        name: approval.name || '',
        role: approval.role || '',
        date: this.formatDate(approval.date),
      })),
    };
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
