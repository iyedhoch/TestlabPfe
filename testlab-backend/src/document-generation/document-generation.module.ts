import { Module } from '@nestjs/common';
import { DocumentGenerationService } from './document-generation.service';
import { TestLabDataAdapter } from './adapters/testlab-data.adapter';
import { DocumentTemplateService } from './document-template.service';
import { DocumentVersionService } from './document-version.service';
import { HtmlGenerator } from './generators/html.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { WordGenerator } from './generators/word.generator';
import { WordTemplateGenerator } from './generators/word-template.generator';
import { ExcelGenerator } from './generators/excel.generator';

@Module({
  providers: [
    DocumentGenerationService,
    TestLabDataAdapter,
    DocumentTemplateService,
    DocumentVersionService,
    HtmlGenerator,
    PdfGenerator,
    WordGenerator,
    WordTemplateGenerator,
    ExcelGenerator,
  ],
  exports: [DocumentGenerationService],
})
export class DocumentGenerationModule {}