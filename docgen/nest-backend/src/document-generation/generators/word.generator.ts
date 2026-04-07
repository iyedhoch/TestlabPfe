import { Injectable } from '@nestjs/common';
import htmlToDocx from 'html-to-docx';
import type {
  DocumentModel,
  SupportedDocumentType,
} from '../interfaces/document-model.interface';
import { HtmlGenerator } from './html.generator';

@Injectable()
export class WordGenerator {
  constructor(private readonly htmlGenerator: HtmlGenerator) {}

  async generate(
    documentModel: DocumentModel,
    documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    const html = this.htmlGenerator.generate(documentModel, undefined, documentType);

    const fileBuffer = await htmlToDocx(html, null, {
      table: { row: { cantSplit: true } },
      footer: false,
      pageNumber: true,
    });

    return Buffer.from(fileBuffer);
  }
}
