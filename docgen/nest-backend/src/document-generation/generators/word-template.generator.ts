import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TemplateHandler } = require('easy-template-x');
import type { DocumentModel } from '../interfaces/document-model.interface';

@Injectable()
export class WordTemplateGenerator {
  async generate(documentModel: DocumentModel): Promise<Buffer> {
    const templatePath = join(
      process.cwd(),
      'templates',
      'word',
      'fsd-template.docx',
    );

    // Load template file
    const templateBuffer = fs.readFileSync(templatePath);

    // Create template handler
    const handler = new TemplateHandler();

    // Prepare data for template injection
    const templateData = this.prepareTemplateData(documentModel);

    // Temporary debug output to validate template mapping shape.
    console.log(JSON.stringify(templateData, null, 2));

    // Process template with data
    const resultBuffer = await handler.process(templateBuffer, templateData);

    return Buffer.from(resultBuffer);
  }

  private prepareTemplateData(documentModel: DocumentModel): Record<string, any> {
    const metadata = documentModel.metadata || ({} as Record<string, any>);

    return {
      metadata: {
        title: metadata.title || '',
        clientName: metadata.clientName || '',
        version: metadata.version || '',
        date: this.formatDate(metadata.date),
        author: metadata.author || '',
      },
      introduction: {
        purpose:
          'introduction' in documentModel && documentModel.introduction
            ? documentModel.introduction.purpose || ''
            : '',
      },
      functionalRequirements:
        'functionalRequirements' in documentModel
          ? (documentModel.functionalRequirements || []).map((req, index) => ({
              code: `FR-${index + 1}`,
              name: (req as any).name || req.title || '',
              description: req.description || '',
            }))
          : [],
      systemFeatures:
        'systemFeatures' in documentModel
          ? (documentModel.systemFeatures || []).map((feature: any) => ({
              name: feature?.name || '',
              overview: feature?.overview || feature?.description || '',
              actors: this.toText(feature?.actors),
              preconditions: this.toText(feature?.preconditions),
              steps: (feature?.steps || []).map((step: any) => ({
                description: step?.description || step?.action || '',
              })),
              rules: this.toText(feature?.rules),
              data: this.toText(feature?.data),
              acceptanceCriteria: this.toText(feature?.acceptanceCriteria),
            }))
          : [],
      approvals: (documentModel.approvals || []).map((approval) => ({
        name: approval.name || '',
        role: approval.role || '',
        date: this.formatDate(approval.date),
      })),
    };
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

  private toText(value: unknown): string {
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(', ');
    }

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }
}
