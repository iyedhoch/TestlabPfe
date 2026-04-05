import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { ExcelGenerator } from './generators/excel.generator';
import { HtmlGenerator } from './generators/html.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { WordGenerator } from './generators/word.generator';
import { WordTemplateGenerator } from './generators/word-template.generator';
import { DocumentDataService } from './services/document-data.service';
import { DocumentGenerationService } from './services/document-generation.service';
import { DocumentVersionService } from './services/document-version.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentDataService,
    DocumentGenerationService,
    DocumentVersionService,
    HtmlGenerator,
    PdfGenerator,
    WordGenerator,
    WordTemplateGenerator,
    ExcelGenerator,
  ],
})
export class DocumentsModule {}
