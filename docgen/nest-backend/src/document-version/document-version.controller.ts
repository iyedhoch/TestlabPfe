import {
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { DocumentVersionDto } from './dto/document-version.dto';
import { VersionDiffDto } from './dto/version-diff.dto';
import { DocumentVersionService } from './document-version.service';

@Controller('api/document-versions')
export class DocumentVersionController {
  constructor(
    private readonly documentVersionService: DocumentVersionService,
  ) {}

  @Get('download/:id')
  @Header('Content-Type', 'application/octet-stream')
  downloadVersion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: any,
  ): Buffer {
    return this.documentVersionService.downloadVersion(id, request.user.id);
  }

  @Get('compare')
  compareVersions(
    @Query('version1', ParseIntPipe) version1: number,
    @Query('version2', ParseIntPipe) version2: number,
    @Req() request: any,
  ): VersionDiffDto {
    return this.documentVersionService.compareVersions(
      version1,
      version2,
      request.user.id,
    );
  }

  @Post(':id/restore')
  restoreVersion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: any,
  ): {
    restored: boolean;
    restoredVersion: DocumentVersionDto;
    message: string;
  } {
    return this.documentVersionService.restoreVersion(id, request.user.id);
  }

  @Get(':projectId')
  getVersions(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() request: any,
  ): DocumentVersionDto[] {
    return this.documentVersionService.getVersions(projectId, request.user.id);
  }
}
