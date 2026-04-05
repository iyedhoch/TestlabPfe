import { BadRequestException, Injectable } from '@nestjs/common';
import { TestLabDataAdapter } from './adapters/testlab-data.adapter';
import { DocumentTemplateService } from './document-template.service';
import { DocumentVersionService } from './document-version.service';
import { ExcelGenerator } from './generators/excel.generator';
import { HtmlGenerator } from './generators/html.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { WordGenerator } from './generators/word.generator';
import { WordTemplateGenerator } from './generators/word-template.generator';

@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly adapter: TestLabDataAdapter,
    private readonly templateService: DocumentTemplateService,
    private readonly documentVersionService: DocumentVersionService,
    private readonly htmlGenerator: HtmlGenerator,
    private readonly pdfGenerator: PdfGenerator,
    private readonly wordGenerator: WordGenerator,
    private readonly wordTemplateGenerator: WordTemplateGenerator,
    private readonly excelGenerator: ExcelGenerator,
  ) {}

  async generateHtmlDocument(
    projectId: string,
    template?: string,
    _userId?: number,
  ): Promise<string> {
    this.assertProjectId(projectId);
    const model = await this.adapter.toCahierModel(projectId);
    void template;
    return this.htmlGenerator.generate(model);
  }

  async generatePdfDocument(
    projectId: string,
    template?: string,
    _userId?: number,
    mode?: string,
    documentType: 'cahier' | 'fsd' = 'cahier',
  ): Promise<Buffer> {
    this.assertProjectId(projectId);
    const templateConfig = this.templateService.getActiveTemplate(template);
    void templateConfig;

    const model =
      documentType === 'fsd'
        ? await this.adapter.toFsdModel(projectId)
        : await this.adapter.toCahierModel(projectId);

    const html = this.htmlGenerator.generate(model, mode, documentType);
    const buffer = await this.pdfGenerator.generateFromHtml(html);
    this.documentVersionService.createGeneratedVersion();
    return buffer;
  }

  async generateWordDocument(
    projectId: string,
    template?: string,
    _userId?: number,
    documentType: 'cahier' | 'fsd' = 'cahier',
  ): Promise<Buffer> {
    this.assertProjectId(projectId);
    const model =
      documentType === 'fsd'
        ? await this.adapter.toFsdModel(projectId)
        : await this.adapter.toCahierModel(projectId);
    const buffer = await this.wordGenerator.generate(model, documentType);
    this.documentVersionService.createGeneratedVersion();
    return buffer;
  }

  async generateExcelDocument(
    projectId: string,
    template?: string,
    _userId?: number,
  ): Promise<Buffer> {
    this.assertProjectId(projectId);
    const model = await this.adapter.toCahierModel(projectId);
    const buffer = await this.excelGenerator.generate(model);
    this.documentVersionService.createGeneratedVersion();
    return buffer;
  }

  async generateWordFromTemplate(
    projectId: string,
    template?: string,
    _userId?: number,
    documentType: 'cahier' | 'fsd' = 'cahier',
  ): Promise<Buffer> {
    this.assertProjectId(projectId);
    const model =
      documentType === 'fsd'
        ? await this.adapter.toFsdModel(projectId)
        : await this.adapter.toCahierModel(projectId);
    const buffer = await this.wordTemplateGenerator.generate(model, documentType);
    this.documentVersionService.createGeneratedVersion();
    return buffer;
  }

  private assertProjectId(projectId: string): void {
    if (!String(projectId ?? '').trim()) {
      throw new BadRequestException('projectId is required');
    }
  }
}