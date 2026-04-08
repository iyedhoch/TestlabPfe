import {
  Controller,
  Get,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { DocumentRequestDto } from './dto/document-request.dto';
import { DocumentGenerationService } from './services/document-generation.service';
import { DocumentVersionService } from './services/document-version.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly documentVersionService: DocumentVersionService,
  ) {}

  @Get('projects/:projectId/cahier/pdf')
  async generateCahierPdf(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generatePdf(
      projectId,
      'cahier',
      query.mode,
    );

    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'cahier',
      format: 'pdf',
      fileName: 'cahier-recette.pdf',
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="cahier-recette.pdf"',
    });
  }

  @Get('projects/:projectId/cahier/pdf-template-debug')
  async generateCahierPdfTemplateDebug(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generatePdf(
      projectId,
      'cahier',
      'template-debug',
    );

    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'cahier',
      format: 'pdf',
      fileName: 'cahier-recette-template-debug.pdf',
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="cahier-recette-template-debug.pdf"',
    });
  }

  @Get('projects/:projectId/cahier/word')
  async generateCahierWord(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateWord(
      projectId,
      'cahier',
    );

    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'cahier',
      format: 'word',
      fileName: 'cahier-recette.docx',
    });

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: 'attachment; filename="cahier-recette.docx"',
    });
  }

  @Get('projects/:projectId/cahier/excel')
  async generateCahierExcel(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateExcel(projectId);

    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'cahier',
      format: 'excel',
      fileName: 'cahier-recette.xlsx',
    });

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="cahier-recette.xlsx"',
    });
  }

  @Get('projects/:projectId/fsd/pdf')
  async generateFsdPdf(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const buffer = query.language
      ? await this.documentGenerationService.generatePdfWithLanguage(
          projectId,
          'fsd',
          query.mode,
          query.language,
        )
      : await this.documentGenerationService.generatePdf(
          projectId,
          'fsd',
          query.mode,
        );

    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'fsd',
      format: 'pdf',
      fileName: 'functional-specification-document.pdf',
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="functional-specification-document.pdf"',
    });
  }

  @Get('projects/:projectId/fsd/word')
  async generateFsdWord(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateWord(
      projectId,
      'fsd',
    );

    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'fsd',
      format: 'word',
      fileName: 'functional-specification-document.docx',
    });

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition:
        'attachment; filename="functional-specification-document.docx"',
    });
  }

  @Get('projects/:projectId/fsd/pdf-lang')
  async generateFsdPdfWithLanguage(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generatePdfWithLanguage(
      projectId,
      'fsd',
      query.mode,
      query.language || 'en',
    );

    const langSuffix = query.language === 'fr' ? '-fr' : '-en';
    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'fsd',
      format: 'pdf',
      fileName: `functional-specification-document${langSuffix}.pdf`,
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="functional-specification-document${langSuffix}.pdf"`,
    });
  }

  @Get('projects/:projectId/fsd/word-lang')
  async generateFsdWordWithLanguage(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateWordWithLanguage(
      projectId,
      'fsd',
      query.language || 'en',
    );

    const langSuffix = query.language === 'fr' ? '-fr' : '-en';
    this.documentVersionService.recordVersion({
      projectId,
      documentType: 'fsd',
      format: 'word',
      fileName: `functional-specification-document${langSuffix}.docx`,
    });

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition:
        `attachment; filename="functional-specification-document${langSuffix}.docx"`,
    });
  }

  @Get('templates')
  getTemplates() {
    return this.documentGenerationService.getTemplates();
  }

  @Get('versions/:projectId')
  getVersions(@Param('projectId') projectId: string) {
    return this.documentVersionService.getByProject(projectId);
  }
}
