import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfGenerator {
  async generateFromHtml(htmlContent: string): Promise<Buffer> {
    return Buffer.from(htmlContent, 'utf-8');
  }
}