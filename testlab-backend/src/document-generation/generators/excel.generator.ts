import { Injectable } from '@nestjs/common';
import type { CahierDocumentModel } from '../adapters/testlab-data.adapter';

@Injectable()
export class ExcelGenerator {
  async generate(model: CahierDocumentModel): Promise<Buffer> {
    return Buffer.from(JSON.stringify(model, null, 2), 'utf-8');
  }
}