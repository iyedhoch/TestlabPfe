import { Injectable } from '@nestjs/common';
import type { CahierDocumentModel, FsdDocumentModel, SupportedDocumentType } from '../adapters/testlab-data.adapter';

@Injectable()
export class WordTemplateGenerator {
  async generate(
    model: CahierDocumentModel | FsdDocumentModel,
    _documentType: SupportedDocumentType = 'cahier',
  ): Promise<Buffer> {
    return Buffer.from(JSON.stringify(model, null, 2), 'utf-8');
  }
}