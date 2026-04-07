import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { DocumentAccessGuard } from '../auth/document-access.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../auth/roles.enum';
import type { SupportedDocumentType } from '../document-generation/interfaces/document-model.interface';
import { ProjectDocumentDto } from './dto/project-document.dto';
import { ProjectDocumentService } from './project-document.service';

type RequestUser = {
  id?: number;
  role?: Role;
};

@Controller('api/project-documents')
export class ProjectDocumentController {
  constructor(
    private readonly projectDocumentService: ProjectDocumentService,
  ) {}

  @Get()
  getAllProjectDocuments(): ProjectDocumentDto[] {
    return this.projectDocumentService.getAllProjectDocuments();
  }

  @Get(':id')
  getProjectDocumentById(
    @Param('id', ParseIntPipe) id: number,
  ): ProjectDocumentDto {
    return this.projectDocumentService.getProjectDocumentById(id);
  }

  @Get(':id/document/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getProjectDocumentHtml(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Req() request?: { user?: RequestUser },
  ): string {
    return this.projectDocumentService.getProjectDocumentHtml(
      id,
      template,
      request?.user?.id,
    );
  }

  @Get(':id/document/pdf')
  async getProjectDocumentPdf(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Query('mode') mode?: string,
    @Query('type') type?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const documentType = this.normalizeDocumentType(type);
    const pdfBuffer = await this.projectDocumentService.getProjectDocumentPdf(
      id,
      template,
      request?.user?.id,
      mode,
      documentType,
    );

    const fileName =
      documentType === 'fsd'
        ? 'functional-specification-document.pdf'
        : 'cahier-recette.pdf';

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @UseGuards(JwtAuthGuard, DocumentAccessGuard)
  @Get(':id/document/pdf-secured')
  async getProjectDocumentPdfSecured(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Query('mode') mode?: string,
    @Query('type') type?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const documentType = this.normalizeDocumentType(type);
    const role = request?.user?.role ?? Role.ADMIN;
    const user = request?.user;

    console.log(
      `User ${user?.id ?? 'unknown'} with role ${role} requested ${documentType} PDF`,
    );

    const pdfBuffer = await this.projectDocumentService.getProjectDocumentPdf(
      id,
      template,
      request?.user?.id,
      mode,
      documentType,
    );

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="cahier-recette.pdf"',
    });
  }

  @Get(':id/document/word')
  async getProjectDocumentWord(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Query('type') type?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const documentType = this.normalizeDocumentType(type);
    const wordBuffer = await this.projectDocumentService.getProjectDocumentWord(
      id,
      template,
      request?.user?.id,
      documentType,
    );

    const fileName =
      documentType === 'fsd'
        ? 'functional-specification-document.docx'
        : 'cahier-recette.docx';

    return new StreamableFile(wordBuffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @UseGuards(JwtAuthGuard, DocumentAccessGuard)
  @Get(':id/document/word-secured')
  async getProjectDocumentWordSecured(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Query('type') type?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const documentType = this.normalizeDocumentType(type);
    const role = request?.user?.role ?? Role.ADMIN;
    const user = request?.user;

    console.log(
      `User ${user?.id ?? 'unknown'} with role ${role} requested ${documentType} WORD`,
    );

    const wordBuffer = await this.projectDocumentService.getProjectDocumentWord(
      id,
      template,
      request?.user?.id,
      documentType,
    );

    const fileName =
      documentType === 'fsd'
        ? 'functional-specification-document.docx'
        : 'cahier-recette.docx';

    return new StreamableFile(wordBuffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @Get(':id/document/excel')
  async getProjectDocumentExcel(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const excelBuffer = await this.projectDocumentService.getProjectDocumentExcel(
      id,
      template,
      request?.user?.id,
    );

    return new StreamableFile(excelBuffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="cahier-recette.xlsx"',
    });
  }

  @UseGuards(JwtAuthGuard, DocumentAccessGuard)
  @Get(':id/document/excel-secured')
  async getProjectDocumentExcelSecured(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const role = request?.user?.role ?? Role.ADMIN;
    const user = request?.user;

    console.log(`User ${user?.id ?? 'unknown'} with role ${role} requested cahier EXCEL`);

    const excelBuffer = await this.projectDocumentService.getProjectDocumentExcel(
      id,
      template,
      request?.user?.id,
    );

    return new StreamableFile(excelBuffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="cahier-recette.xlsx"',
    });
  }

  @Get(':id/document/word-template')
  async getProjectDocumentWordTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Query('type') type?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const documentType = this.normalizeDocumentType(type);
    const wordBuffer = await this.projectDocumentService.getProjectDocumentWordTemplate(
      id,
      template,
      request?.user?.id,
      documentType,
    );

    const fileName =
      documentType === 'fsd'
        ? 'functional-specification-document-template.docx'
        : 'cahier-recette-template.docx';

    return new StreamableFile(wordBuffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  @UseGuards(JwtAuthGuard, DocumentAccessGuard)
  @Get(':id/document/word-template-secured')
  async getProjectDocumentWordTemplateSecured(
    @Param('id', ParseIntPipe) id: number,
    @Query('template') template?: string,
    @Query('type') type?: string,
    @Req() request?: { user?: RequestUser },
  ): Promise<StreamableFile> {
    const documentType = this.normalizeDocumentType(type);
    const role = request?.user?.role ?? Role.ADMIN;
    const user = request?.user;

    console.log(
      `User ${user?.id ?? 'unknown'} with role ${role} requested ${documentType} WORD TEMPLATE`,
    );

    const wordBuffer = await this.projectDocumentService.getProjectDocumentWordTemplate(
      id,
      template,
      request?.user?.id,
      documentType,
    );

    const fileName =
      documentType === 'fsd'
        ? 'functional-specification-document-template.docx'
        : 'cahier-recette-template.docx';

    return new StreamableFile(wordBuffer, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: `attachment; filename="${fileName}"`,
    });
  }

  private normalizeDocumentType(type?: string): SupportedDocumentType {
    if (!type) {
      return 'cahier';
    }

    const normalized = type.toLowerCase();
    if (normalized === 'cahier' || normalized === 'fsd') {
      return normalized;
    }

    throw new BadRequestException("type must be one of: 'cahier', 'fsd'");
  }
}
