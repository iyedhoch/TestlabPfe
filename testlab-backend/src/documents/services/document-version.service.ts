import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Prisma } from '_prisma/client';
import type { DocumentVersionStatus as PrismaDocumentVersionStatus } from '_prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { SupportedDocumentType } from '../interfaces/document-model.interface';

export type DocumentVersionStatusLabel = 'Brouillon' | 'En cours' | 'Complete';

export interface GeneratedDocumentVersion {
  id: string;
  projectId: string;
  documentType: SupportedDocumentType;
  documentName: string;
  threadId: string;
  versionNumber: number;
  status: DocumentVersionStatusLabel;
  createdByName: string;
  createdByInitials: string;
  payloadSnapshot: Record<string, unknown>;
  sourceVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DocumentVersionService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeInitials(name: string): string {
    const parts = name
      .split(' ')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      return 'LU';
    }

    const letters = parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return letters || 'LU';
  }

  private toPrismaStatus(
    status: DocumentVersionStatusLabel | undefined,
  ): PrismaDocumentVersionStatus {
    switch (status) {
      case 'Brouillon':
        return 'DRAFT';
      case 'Complete':
        return 'COMPLETE';
      case 'En cours':
      default:
        return 'IN_PROGRESS';
    }
  }

  private fromPrismaStatus(
    status: PrismaDocumentVersionStatus,
  ): DocumentVersionStatusLabel {
    switch (status) {
      case 'DRAFT':
        return 'Brouillon';
      case 'COMPLETE':
        return 'Complete';
      case 'IN_PROGRESS':
      default:
        return 'En cours';
    }
  }

  private mapVersion(version: {
    id: string;
    projectId: string;
    documentType: string;
    documentName: string;
    threadId: string;
    versionNumber: number;
    status: PrismaDocumentVersionStatus;
    createdByName: string;
    createdByInitials: string;
    payloadSnapshot: unknown;
    sourceVersionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): GeneratedDocumentVersion {
    return {
      id: version.id,
      projectId: version.projectId,
      documentType: version.documentType as SupportedDocumentType,
      documentName: version.documentName,
      threadId: version.threadId,
      versionNumber: version.versionNumber,
      status: this.fromPrismaStatus(version.status),
      createdByName: version.createdByName,
      createdByInitials: version.createdByInitials,
      payloadSnapshot:
        typeof version.payloadSnapshot === 'object' && version.payloadSnapshot
          ? (version.payloadSnapshot as Record<string, unknown>)
          : {},
      sourceVersionId: version.sourceVersionId,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    };
  }

  async createVersion(input: {
    projectId: string;
    documentType: SupportedDocumentType;
    documentName: string;
    status?: DocumentVersionStatusLabel;
    createdByName?: string;
    payloadSnapshot: Record<string, unknown>;
    sourceVersionId?: string;
    threadId?: string;
  }): Promise<GeneratedDocumentVersion> {
    const creator = input.createdByName?.trim() || 'Local User';
    const initials = this.normalizeInitials(creator);

    let threadId = input.threadId;
    let versionNumber = 1;

    if (input.sourceVersionId) {
      const sourceVersion = await this.prisma.documentVersion.findUnique({
        where: { id: input.sourceVersionId },
        select: {
          id: true,
          projectId: true,
          threadId: true,
        },
      });

      if (!sourceVersion || sourceVersion.projectId !== input.projectId) {
        throw new NotFoundException('Source document version not found.');
      }

      threadId = sourceVersion.threadId;
    }

    if (!threadId) {
      threadId = randomUUID();
    }

    const latestVersion = await this.prisma.documentVersion.findFirst({
      where: {
        projectId: input.projectId,
        threadId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
      select: {
        versionNumber: true,
      },
    });

    if (latestVersion) {
      versionNumber = latestVersion.versionNumber + 1;
    }

    const created = await this.prisma.documentVersion.create({
      data: {
        projectId: input.projectId,
        documentType: input.documentType,
        documentName: input.documentName,
        threadId,
        versionNumber,
        status: this.toPrismaStatus(input.status),
        createdByName: creator,
        createdByInitials: initials,
        payloadSnapshot: input.payloadSnapshot as Prisma.InputJsonValue,
        sourceVersionId: input.sourceVersionId,
      },
    });

    return this.mapVersion(created);
  }

  async getByProject(
    projectId: string,
    documentType?: SupportedDocumentType,
  ): Promise<GeneratedDocumentVersion[]> {
    const versions = await this.prisma.documentVersion.findMany({
      where: {
        projectId,
        ...(documentType ? { documentType } : {}),
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });

    return versions.map((version) => this.mapVersion(version));
  }

  async getById(versionId: string): Promise<GeneratedDocumentVersion> {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException('Document version not found.');
    }

    return this.mapVersion(version);
  }

  async deleteById(versionId: string): Promise<void> {
    const existing = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Document version not found.');
    }

    await this.prisma.documentVersion.delete({
      where: { id: versionId },
    });
  }
}
