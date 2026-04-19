import {
  CahierSelectionSuiteDto,
  FsdSelectionEpicDto,
} from './dto/document-selection.dto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { DocumentRequestDto } from './dto/document-request.dto';
import { GenerateCahierDto } from './dto/generate-cahier.dto';
import { GenerateFsdDto } from './dto/generate-fsd.dto';
import { DocumentGenerationService } from './services/document-generation.service';
import { DocumentVersionService } from './services/document-version.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly documentVersionService: DocumentVersionService,
  ) {}

  private sanitizeFileName(input: string): string {
    return input
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveExtension(format: 'pdf' | 'word' | 'excel'): string {
    if (format === 'word') {
      return 'docx';
    }

    if (format === 'excel') {
      return 'xlsx';
    }

    return 'pdf';
  }

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

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="cahier-recette-template-debug.pdf"',
    });
  }

  @Get('projects/:projectId/cahier/preview/html')
  @Roles(UserRole.QA, UserRole.ADMIN)
  async getCahierHtmlPreview(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<{ html: string }> {
    const html = await this.documentGenerationService.generateHtmlPreview(
      projectId,
      'cahier',
      {
        mode: query.mode,
        language: query.language,
      },
    );

    return { html };
  }

  @Post('projects/:projectId/cahier/preview/html')
  @Roles(UserRole.QA, UserRole.ADMIN)
  async getCahierHtmlPreviewFromPayload(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateCahierDto,
  ): Promise<{ html: string }> {
    const html =
      await this.documentGenerationService.generateCahierHtmlPreviewFromPayload(
        projectId,
        payload,
      );

    return { html };
  }

  @Get('projects/:projectId/cahier/word')
  async generateCahierWord(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateWord(
      projectId,
      'cahier',
    );

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

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="cahier-recette.xlsx"',
    });
  }

  @Post('projects/:projectId/cahier/pdf')
  @Roles(UserRole.QA, UserRole.ADMIN)
  async generateCahierPdfFromPayload(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateCahierDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateCahierPdfFromPayload(
      projectId,
      payload,
    );

    await this.documentVersionService.createVersion({
      projectId,
      documentType: 'cahier',
      documentName: payload.title || 'Cahier de recette',
      status: payload.status || 'En cours',
      createdByName:
        user?.username || payload.createdByName || payload.author,
      sourceVersionId: payload.sourceVersionId,
      threadId: payload.threadId,
      payloadSnapshot: {
        ...payload,
      },
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="cahier-recette.pdf"',
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

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="functional-specification-document.pdf"',
    });
  }

  @Post('projects/:projectId/fsd/pdf')
  @Roles(UserRole.BA, UserRole.ADMIN)
  async generateFsdPdfFromPayload(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateFsdDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateFsdPdfFromPayload(
      projectId,
      payload,
    );

    await this.documentVersionService.createVersion({
      projectId,
      documentType: 'fsd',
      documentName: payload.title || 'Functional Specification Document',
      status: payload.status || 'En cours',
      createdByName:
        user?.username || payload.createdByName || payload.author,
      sourceVersionId: payload.sourceVersionId,
      threadId: payload.threadId,
      payloadSnapshot: {
        ...payload,
      },
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="functional-specification-document.pdf"',
    });
  }

  @Get('projects/:projectId/fsd/preview/html')
  @Roles(UserRole.BA, UserRole.ADMIN)
  async getFsdHtmlPreview(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<{ html: string }> {
    const html = await this.documentGenerationService.generateHtmlPreview(
      projectId,
      'fsd',
      {
        mode: query.mode,
        language: query.language,
      },
    );

    return { html };
  }

  @Post('projects/:projectId/fsd/preview/html')
  @Roles(UserRole.BA, UserRole.ADMIN)
  async getFsdHtmlPreviewFromPayload(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateFsdDto,
  ): Promise<{ html: string }> {
    const html =
      await this.documentGenerationService.generateFsdHtmlPreviewFromPayload(
        projectId,
        payload,
      );

    return { html };
  }

  @Get('projects/:projectId/fsd/word')
  async generateFsdWord(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const buffer = await this.documentGenerationService.generateWord(
      projectId,
      'fsd',
    );

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

  @Get('projects/:projectId/versions')
  async getVersionsByProject(@Param('projectId') projectId: string) {
    const versions = await this.documentVersionService.getByProject(projectId);

    return versions.map((version) => ({
      id: version.id,
      projectId: version.projectId,
      documentType: version.documentType,
      documentName: version.documentName,
      threadId: version.threadId,
      versionNumber: version.versionNumber,
      status: version.status,
      createdByName: version.createdByName,
      createdByInitials: version.createdByInitials,
      sourceVersionId: version.sourceVersionId,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    }));
  }

  @Get('versions/:versionId')
  async getVersionById(@Param('versionId') versionId: string) {
    return this.documentVersionService.getById(versionId);
  }

  @Delete('versions/:versionId')
  async deleteVersion(
    @Param('versionId') versionId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const version = await this.documentVersionService.getById(versionId);

    if (user?.role !== UserRole.ADMIN) {
      if (user?.role === UserRole.QA && version.documentType !== 'cahier') {
        throw new ForbiddenException(
          'QA users can only delete Cahier versions.',
        );
      }

      if (user?.role === UserRole.BA && version.documentType !== 'fsd') {
        throw new ForbiddenException('BA users can only delete FSD versions.');
      }
    }

    await this.documentVersionService.deleteById(versionId);
    return {
      success: true,
    };
  }

  @Get('versions/:versionId/download')
  async downloadVersion(
    @Param('versionId') versionId: string,
    @Query('format') formatQuery?: 'pdf' | 'word' | 'excel',
  ): Promise<StreamableFile> {
    const version = await this.documentVersionService.getById(versionId);
    const payload = version.payloadSnapshot;

    const format =
      formatQuery || (version.documentType === 'fsd' ? 'pdf' : 'pdf');

    if (version.documentType === 'fsd' && format === 'excel') {
      throw new BadRequestException(
        'Le format excel n\'est pas disponible pour les documents FSD.',
      );
    }

    let buffer: Buffer;
    if (version.documentType === 'fsd') {
      buffer = await this.documentGenerationService.generateFsdDocumentFromPayload(
        version.projectId,
        payload as GenerateFsdDto,
        format as 'pdf' | 'word',
      );
    } else {
      buffer = await this.documentGenerationService.generateCahierDocumentFromPayload(
        version.projectId,
        payload as GenerateCahierDto,
        format,
      );
    }

    const extension = this.resolveExtension(format);
    const baseName =
      this.sanitizeFileName(version.documentName) || `${version.documentType}-document`;
    const fileName = `${baseName}-v${version.versionNumber}.${extension}`;

    const mimeType =
      format === 'pdf'
        ? 'application/pdf'
        : format === 'word'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new StreamableFile(buffer, {
      type: mimeType,
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get('projects/:projectId/selection/fsd/epics')
  getSelectableEpicsForFsd(
    @Param('projectId') projectId: string,
  ): Promise<FsdSelectionEpicDto[]> {
    return this.documentGenerationService.getSelectableEpicsForFsd(projectId);
  }

  @Get('projects/:projectId/selection/cahier/suites')
  getSelectableSuitesForCahier(
    @Param('projectId') projectId: string,
  ): Promise<CahierSelectionSuiteDto[]> {
    return this.documentGenerationService.getSelectableSuitesForCahier(projectId);
  }

}
