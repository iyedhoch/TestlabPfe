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
  Header,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentRequestDto } from './dto/document-request.dto';
import { GenerateCahierDto } from './dto/generate-cahier.dto';
import { GenerateFsdDto } from './dto/generate-fsd.dto';
import { WordTemplateGenerator } from './generators/word-template.generator';
import { DocumentGenerationService } from './services/document-generation.service';
import { DocumentDataService } from './services/document-data.service';
import { DocumentVersionService } from './services/document-version.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CLOUDINARY_FOLDER_NAME } from '../config/enum';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
    private readonly documentDataService: DocumentDataService,
    private readonly wordTemplateGenerator: WordTemplateGenerator,
    private readonly documentVersionService: DocumentVersionService,
    private readonly cloudinaryService: CloudinaryService,
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

  private resolveMimeType(format: 'pdf' | 'word' | 'excel'): string {
    if (format === 'pdf') {
      return 'application/pdf';
    }

    if (format === 'word') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  private resolveFileName(
    title: string | undefined,
    format: 'pdf' | 'word' | 'excel',
  ): string {
    const extension = this.resolveExtension(format);
    const baseName = this.sanitizeFileName(title || '') || 'document';
    return `${baseName}.${extension}`;
  }

  private buildDisposition(
    title: string | undefined,
    format: 'pdf' | 'word' | 'excel',
  ): string {
    const fileName = this.resolveFileName(title, format);
    const encoded = encodeURIComponent(fileName);
    return `attachment; filename="${fileName}"; filename*=UTF-8''${encoded}`;
  }

  private sendBinaryDownload(
    res: Response,
    buffer: Buffer,
    title: string | undefined,
    format: 'pdf' | 'word' | 'excel',
  ): void {
    res.setHeader('Content-Type', this.resolveMimeType(format));
    res.setHeader('Content-Disposition', this.buildDisposition(title, format));
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  private resolveFsdPayloadTitle(payload: GenerateFsdDto): string {
    const metadata = payload.metadata;
    const explicitTitle = payload.title || metadata?.title;
    if (explicitTitle?.trim()) {
      return explicitTitle.trim();
    }

    const projectName = (payload.projectName || metadata?.projectName || 'Project')
      .trim();
    const version = (payload.version || metadata?.version || '1.0').trim();
    return `FSD_${projectName}_V${version}`;
  }

  @Post('uploads/logo')
  @Roles(UserRole.BA, UserRole.QA, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocumentLogo(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Seuls les fichiers image sont acceptes.');
    }

    const uploadResult = await this.cloudinaryService.uploadBufferToCloudinary(
      file.buffer,
      CLOUDINARY_FOLDER_NAME.PROJECT,
    );

    return { url: uploadResult.secure_url };
  }

  private normalizeVersionComparableValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeVersionComparableValue(item));
    }

    if (value && typeof value === 'object') {
      const transientKeys = new Set([
        'createdByName',
        'language',
        'mode',
        'sourceVersionId',
        'threadId',
      ]);

      const normalizedObject = Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((accumulator, key) => {
          if (transientKeys.has(key)) {
            return accumulator;
          }

          const normalizedValue = this.normalizeVersionComparableValue(
            (value as Record<string, unknown>)[key],
          );

          if (normalizedValue !== undefined) {
            accumulator[key] = normalizedValue;
          }

          return accumulator;
        }, {});

      const authorValue = normalizedObject.author;
      const authorsValue = normalizedObject.authors;

      if (typeof authorValue === 'string' && !Array.isArray(authorsValue)) {
        normalizedObject.authors = authorValue
          .split(';')
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }

      if (Array.isArray(authorsValue) && typeof authorValue !== 'string') {
        normalizedObject.author = (authorsValue as string[])
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
          .join('; ');
      }

      return normalizedObject;
    }

    if (typeof value === 'string') {
      return value.replace(/\u00a0/g, ' ').trim();
    }

    return value;
  }

  private stripRichEditFields<T extends Record<string, unknown>>(payload: T): T {
    return {
      ...payload,
      richEditValues: undefined,
      sectionBackgroundValues: undefined,
      pageStyle: undefined,
    } as T;
  }

  private stripAllEditFields<T extends Record<string, unknown>>(payload: T): T {
    return {
      ...payload,
      editValues: undefined,
      richEditValues: undefined,
      sectionBackgroundValues: undefined,
      pageStyle: undefined,
    } as T;
  }

  private async shouldCreateVersionSnapshot(
    sourceVersionId: string | undefined,
    payloadSnapshot: Record<string, unknown>,
  ): Promise<boolean> {
    if (!sourceVersionId) {
      return true;
    }

    try {
      const sourceVersion = await this.documentVersionService.getById(sourceVersionId);
      const sourceComparable = JSON.stringify(
        this.normalizeVersionComparableValue(sourceVersion.payloadSnapshot),
      );
      const payloadComparable = JSON.stringify(
        this.normalizeVersionComparableValue(payloadSnapshot),
      );

      return sourceComparable !== payloadComparable;
    } catch {
      return true;
    }
  }

  @Get('projects/:projectId/cahier/pdf')
  async generateCahierPdf(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'cahier',
    );
    const buffer = await this.documentGenerationService.generatePdf(
      projectId,
      'cahier',
      query.mode,
    );

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('pdf'),
      disposition: this.buildDisposition(title, 'pdf'),
    });
  }

  @Get('projects/:projectId/cahier/pdf-template-debug')
  async generateCahierPdfTemplateDebug(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'cahier',
    );
    const buffer = await this.documentGenerationService.generatePdf(
      projectId,
      'cahier',
      'template-debug',
    );

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('pdf'),
      disposition: this.buildDisposition(title, 'pdf'),
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

  @Post('projects/:projectId/cahier/save')
  @Roles(UserRole.QA, UserRole.ADMIN)
  async saveCahierSnapshot(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateCahierDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<{ saved: boolean; versionId?: string }> {
    const payloadSnapshot = {
      ...payload,
    };

    const shouldCreateVersion = await this.shouldCreateVersionSnapshot(
      payload.sourceVersionId,
      payloadSnapshot,
    );

    if (!shouldCreateVersion) {
      return { saved: false };
    }

    const version = await this.documentVersionService.createVersion({
      projectId,
      documentType: 'cahier',
      documentName: payload.title || 'Cahier de recette',
      status: payload.status || 'En cours',
      createdByName:
        user?.username || payload.createdByName || payload.author,
      sourceVersionId: payload.sourceVersionId,
      threadId: payload.threadId,
      payloadSnapshot,
    });

    return {
      saved: true,
      versionId: version.id,
    };
  }

  @Get('projects/:projectId/cahier/word')
  async generateCahierWord(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ): Promise<void> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'cahier',
    );
    const buffer = await this.documentGenerationService.generateWord(
      projectId,
      'cahier',
    );

    this.sendBinaryDownload(res, buffer, title, 'word');
  }

  @Get('projects/:projectId/cahier/excel')
  async generateCahierExcel(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'cahier',
    );
    const buffer = await this.documentGenerationService.generateExcel(projectId);

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('excel'),
      disposition: this.buildDisposition(title, 'excel'),
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

    const payloadSnapshot = {
      ...payload,
    };

    const shouldCreateVersion = await this.shouldCreateVersionSnapshot(
      payload.sourceVersionId,
      payloadSnapshot,
    );

    if (shouldCreateVersion) {
      await this.documentVersionService.createVersion({
        projectId,
        documentType: 'cahier',
        documentName: payload.title || 'Cahier de recette',
        status: payload.status || 'En cours',
        createdByName:
          user?.username || payload.createdByName || payload.author,
        sourceVersionId: payload.sourceVersionId,
        threadId: payload.threadId,
        payloadSnapshot,
      });
    }

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('pdf'),
      disposition: this.buildDisposition(payload.title, 'pdf'),
    });
  }

  @Post('projects/:projectId/cahier/word')
  @Roles(UserRole.QA, UserRole.ADMIN)
  async generateCahierWordFromPayload(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateCahierDto,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const buffer = await this.documentGenerationService.generateCahierDocumentFromPayload(
      projectId,
      payload,
      'word',
    );

    const payloadSnapshot = {
      ...payload,
    };

    const shouldCreateVersion = await this.shouldCreateVersionSnapshot(
      payload.sourceVersionId,
      payloadSnapshot,
    );

    if (shouldCreateVersion) {
      await this.documentVersionService.createVersion({
        projectId,
        documentType: 'cahier',
        documentName: payload.title || 'Cahier de recette',
        status: payload.status || 'En cours',
        createdByName:
          user?.username || payload.createdByName || payload.author,
        sourceVersionId: payload.sourceVersionId,
        threadId: payload.threadId,
        payloadSnapshot,
      });
    }

    const fileName = payload.title || 'Cahier de recette';
    this.sendBinaryDownload(res, buffer, fileName, 'word');
  }

  @Get('projects/:projectId/fsd/pdf')
  async generateFsdPdf(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'fsd',
    );
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
      type: this.resolveMimeType('pdf'),
      disposition: this.buildDisposition(title, 'pdf'),
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

    const payloadSnapshot = {
      ...payload,
    };

    const shouldCreateVersion = await this.shouldCreateVersionSnapshot(
      payload.sourceVersionId,
      payloadSnapshot,
    );

    if (shouldCreateVersion) {
      await this.documentVersionService.createVersion({
        projectId,
        documentType: 'fsd',
        documentName: this.resolveFsdPayloadTitle(payload),
        status: payload.status || 'En cours',
        createdByName:
          user?.username || payload.createdByName || payload.author,
        sourceVersionId: payload.sourceVersionId,
        threadId: payload.threadId,
        payloadSnapshot,
      });
    }

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('pdf'),
      disposition: this.buildDisposition(payload.title, 'pdf'),
    });
  }

  @Post('projects/:projectId/fsd/word')
  @Roles(UserRole.BA, UserRole.ADMIN)
  async generateFsdWordFromPayload(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateFsdDto,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<void> {
    const buffer = await this.documentGenerationService.generateFsdDocumentFromPayload(
      projectId,
      payload,
      'word',
    );

    const payloadSnapshot = {
      ...payload,
    };

    const shouldCreateVersion = await this.shouldCreateVersionSnapshot(
      payload.sourceVersionId,
      payloadSnapshot,
    );

    if (shouldCreateVersion) {
      await this.documentVersionService.createVersion({
        projectId,
        documentType: 'fsd',
        documentName: payload.title || 'Functional Specification Document',
        status: payload.status || 'En cours',
        createdByName:
          user?.username || payload.createdByName || payload.author,
        sourceVersionId: payload.sourceVersionId,
        threadId: payload.threadId,
        payloadSnapshot,
      });
    }

    const fileName = this.resolveFsdPayloadTitle(payload);
    this.sendBinaryDownload(res, buffer, fileName, 'word');
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

  @Post('projects/:projectId/fsd/save')
  @Roles(UserRole.BA, UserRole.ADMIN)
  async saveFsdSnapshot(
    @Param('projectId') projectId: string,
    @Body() payload: GenerateFsdDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<{ saved: boolean; versionId?: string }> {
    const payloadSnapshot = {
      ...payload,
    };

    const shouldCreateVersion = await this.shouldCreateVersionSnapshot(
      payload.sourceVersionId,
      payloadSnapshot,
    );

    if (!shouldCreateVersion) {
      return { saved: false };
    }

    const version = await this.documentVersionService.createVersion({
      projectId,
      documentType: 'fsd',
      documentName: this.resolveFsdPayloadTitle(payload),
      status: payload.status || 'En cours',
      createdByName:
        user?.username || payload.createdByName || payload.author,
      sourceVersionId: payload.sourceVersionId,
      threadId: payload.threadId,
      payloadSnapshot,
    });

    return {
      saved: true,
      versionId: version.id,
    };
  }

  @Get('projects/:projectId/fsd/word')
  async generateFsdWord(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(projectId, 'fsd');
    const data = await this.documentDataService.getFsdData(projectId);
    const buffer = await this.wordTemplateGenerator.generate(data);

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('word'),
      disposition: this.buildDisposition(title, 'word'),
    });
  }

  @Get('projects/:projectId/fsd/word-template')
  async generateFsdWordTemplate(
    @Param('projectId') projectId: string,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'fsd',
    );
    const buffer = await this.documentGenerationService.generateWordTemplate(
      projectId,
      'fsd',
    );

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('word'),
      disposition: this.buildDisposition(title, 'word'),
    });
  }

  @Get('projects/:projectId/fsd/pdf-lang')
  async generateFsdPdfWithLanguage(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
  ): Promise<StreamableFile> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'fsd',
    );
    const buffer = await this.documentGenerationService.generatePdfWithLanguage(
      projectId,
      'fsd',
      query.mode,
      query.language || 'en',
    );

    return new StreamableFile(buffer, {
      type: this.resolveMimeType('pdf'),
      disposition: this.buildDisposition(title, 'pdf'),
    });
  }

  @Get('projects/:projectId/fsd/word-lang')
  async generateFsdWordWithLanguage(
    @Param('projectId') projectId: string,
    @Query() query: DocumentRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const title = await this.documentGenerationService.getDocumentTitle(
      projectId,
      'fsd',
    );
    const buffer = await this.documentGenerationService.generateWordWithLanguage(
      projectId,
      'fsd',
      query.language || 'en',
    );

    this.sendBinaryDownload(res, buffer, title, 'word');
  }

  @Get('templates')
  getTemplates() {
    return this.documentGenerationService.getTemplates();
  }

  @Get('projects/:projectId/versions')
  async getVersionsByProject(
    @Param('projectId') projectId: string,
    @Query('documentType') documentTypeQuery?: 'fsd' | 'cahier',
  ) {
    const versions = await this.documentVersionService.getByProject(
      projectId,
      documentTypeQuery,
    );

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
    @Res() res: Response,
    @Query('format') formatQuery: 'pdf' | 'word' | 'excel' | undefined,
  ): Promise<void> {
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
      try {
        buffer = await this.documentGenerationService.generateFsdDocumentFromPayload(
          version.projectId,
          payload as GenerateFsdDto,
          format as 'pdf' | 'word',
        );
      } catch {
        try {
          buffer = await this.documentGenerationService.generateFsdDocumentFromPayload(
            version.projectId,
            this.stripRichEditFields(payload as Record<string, unknown>) as GenerateFsdDto,
            format as 'pdf' | 'word',
          );
        } catch {
          buffer = await this.documentGenerationService.generateFsdDocumentFromPayload(
            version.projectId,
            this.stripAllEditFields(payload as Record<string, unknown>) as GenerateFsdDto,
            format as 'pdf' | 'word',
          );
        }
      }
    } else {
      try {
        buffer = await this.documentGenerationService.generateCahierDocumentFromPayload(
          version.projectId,
          payload as GenerateCahierDto,
          format,
        );
      } catch {
        try {
          buffer = await this.documentGenerationService.generateCahierDocumentFromPayload(
            version.projectId,
            this.stripRichEditFields(payload as Record<string, unknown>) as GenerateCahierDto,
            format,
          );
        } catch {
          buffer = await this.documentGenerationService.generateCahierDocumentFromPayload(
            version.projectId,
            this.stripAllEditFields(payload as Record<string, unknown>) as GenerateCahierDto,
            format,
          );
        }
      }
    }

    let downloadTitle = version.documentName;
    if (version.documentType === 'fsd') {
      downloadTitle = this.resolveFsdPayloadTitle(payload as GenerateFsdDto);
    }

    this.sendBinaryDownload(res, buffer, downloadTitle, format);
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
