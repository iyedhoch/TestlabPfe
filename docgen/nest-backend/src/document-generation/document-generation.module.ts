import { Module } from '@nestjs/common';
import { DocumentVersionModule } from '../document-version/document-version.module';
import { TemplateConfigModule } from '../template-config/template-config.module';
import { DocumentFilterService } from './filters/document-filter.service';
import { ExcelGenerator } from './generators/excel.generator';
import { HtmlGenerator } from './generators/html.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { WordGenerator } from './generators/word.generator';
import { WordTemplateGenerator } from './generators/word-template.generator';
import { DocumentGenerationService } from './document-generation.service';
import { StatisticsService } from './statistics/statistics.service';

@Module({
  imports: [TemplateConfigModule, DocumentVersionModule],
  providers: [
    DocumentGenerationService,
    DocumentFilterService,
    StatisticsService,
    HtmlGenerator,
    PdfGenerator,
    WordGenerator,
    WordTemplateGenerator,
    ExcelGenerator,
  ],
  exports: [DocumentGenerationService],
})
export class DocumentGenerationModule {}
