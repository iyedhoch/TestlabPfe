import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DOCUMENT_VERSIONS } from '../mock-data/document-versions.data';
import type { DocumentVersionRecord } from '../mock-data/document-versions.data';
import { DocumentVersionDto } from './dto/document-version.dto';
import { VersionDiffDto } from './dto/version-diff.dto';

@Injectable()
export class DocumentVersionService {
  private readonly versions: DocumentVersionRecord[] = DOCUMENT_VERSIONS;

  createGeneratedVersion(input: {
    projectId: number;
    userId: number;
    format: 'html' | 'pdf' | 'word' | 'excel';
    documentType?: 'CAHIER_RECETTE' | 'FSD';
    fileName: string;
    content: string;
    templateSnapshot: {
      id: string;
      name: string;
      title: string;
      footer: string;
      showStatistics: boolean;
      showExecutions: boolean;
      showPreconditions: boolean;
      showSteps: boolean;
      showApprovals: boolean;
      showContext: boolean;
      failedOnly: boolean;
    };
    summary: string;
    author: string;
  }): DocumentVersionDto {
    this.validatePositiveInt(input.projectId, 'projectId');
    this.validatePositiveInt(input.userId, 'userId');

    const id = this.versions.length
      ? Math.max(...this.versions.map((item) => item.id)) + 1
      : 1;
    const versionNumber =
      this.versions
        .filter(
          (item) =>
            item.projectId === input.projectId && item.userId === input.userId,
        )
        .reduce((max, item) => Math.max(max, item.version), 0) + 1;

    const createdAt = new Date().toISOString();
    const newVersion: DocumentVersionRecord = {
      id,
      projectId: input.projectId,
      version: versionNumber,
      userId: input.userId,
      fileName: input.fileName,
      metadata: {
        documentType: input.documentType ?? 'CAHIER_RECETTE',
        createdAt,
        author: input.author,
        summary: input.summary,
        generatedFormat: input.format,
        generatedContent: input.content,
        templateSnapshot: input.templateSnapshot,
      },
    };

    this.versions.push(newVersion);

    return new DocumentVersionDto({
      id: newVersion.id,
      projectId: newVersion.projectId,
      version: newVersion.version,
      createdAt: newVersion.metadata.createdAt,
      author: newVersion.metadata.author,
      summary: newVersion.metadata.summary,
    });
  }

  getVersions(projectId: number, userId: number): DocumentVersionDto[] {
    this.validatePositiveInt(projectId, 'projectId');
    this.validatePositiveInt(userId, 'userId');

    return this.versions
      .filter(
        (version) =>
          version.projectId === projectId && version.userId === userId,
      )
      .map(
        (version) =>
          new DocumentVersionDto({
            id: version.id,
            projectId: version.projectId,
            version: version.version,
            createdAt: version.metadata.createdAt,
            author: version.metadata.author,
            summary: version.metadata.summary,
          }),
      );
  }

  downloadVersion(id: number, userId: number): Buffer {
    const version = this.findOwnedVersionOrThrow(id, userId);
    return Buffer.from(
      `Mock file for document version ${version.id} (${version.fileName}) (project ${version.projectId})`,
    );
  }

  compareVersions(v1: number, v2: number, userId: number): VersionDiffDto {
    this.validatePositiveInt(v1, 'version1');
    this.validatePositiveInt(v2, 'version2');
    this.validatePositiveInt(userId, 'userId');

    if (v1 === v2) {
      throw new BadRequestException('version1 and version2 must be different');
    }

    this.findOwnedVersionOrThrow(v1, userId);
    this.findOwnedVersionOrThrow(v2, userId);

    return new VersionDiffDto({
      version1: v1,
      version2: v2,
      changes: [
        'Title section modified',
        'New table added in appendix',
        'Metadata tags updated',
      ],
    });
  }

  restoreVersion(
    id: number,
    userId: number,
  ): {
    restored: boolean;
    restoredVersion: DocumentVersionDto;
    message: string;
  } {
    const version = this.findOwnedVersionOrThrow(id, userId);

    return {
      restored: true,
      restoredVersion: new DocumentVersionDto({
        id: version.id,
        projectId: version.projectId,
        version: version.version,
        createdAt: version.metadata.createdAt,
        author: version.metadata.author,
        summary: version.metadata.summary,
      }),
      message: `Version ${id} restored successfully`,
    };
  }

  private findVersionOrThrow(id: number): DocumentVersionRecord {
    this.validatePositiveInt(id, 'id');

    const version = this.versions.find((item) => item.id === id);

    if (!version) {
      throw new NotFoundException(`Document version with id ${id} not found`);
    }

    return version;
  }

  private findOwnedVersionOrThrow(
    id: number,
    userId: number,
  ): DocumentVersionRecord {
    const version = this.findVersionOrThrow(id);
    this.validatePositiveInt(userId, 'userId');

    if (version.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this document version',
      );
    }

    return version;
  }

  private validatePositiveInt(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${name} must be a positive integer`);
    }
  }
}
