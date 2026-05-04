import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  EpicPriority,
  EpicStatus,
  StoryPriority,
  StoryStatus,
} from '_prisma/enums';
import { UploadApiResponse } from 'cloudinary';
import { CLOUDINARY_FOLDER_NAME } from '../config/enum';
import {
  CreateEpicDto,
  CreateFeatureDto,
  CreateTagDto,
  CreateUserStoryDto,
  UpdateTagDto,
  UpdateUserStoryDto,
} from './spec.dto';

@Injectable()
export class SpecService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ----------------------- HELPERS -----------------------

  private async uploadAttachment(
    fileBuffer?: Buffer | null,
  ): Promise<string | null> {
    if (!fileBuffer) return null;

    const result: UploadApiResponse =
      await this.cloudinaryService.uploadBufferToCloudinary(
        fileBuffer,
        CLOUDINARY_FOLDER_NAME.PROJECT,
      );
    return result.secure_url;
  }

    private async uploadStoryImage(
      fileBuffer: Buffer,
    ): Promise<{ url: string; publicId: string }> {
      const result: UploadApiResponse =
        await this.cloudinaryService.uploadBufferToCloudinary(
          fileBuffer,
          CLOUDINARY_FOLDER_NAME.PROJECT,
        );

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    private async uploadStoryImageBuffers(fileBuffers: Buffer[]) {
      return Promise.all(
        fileBuffers.map((fileBuffer) => this.uploadStoryImage(fileBuffer)),
      );
    }

    private async storeStoryImages(
      userStoryId: string,
      uploads: Array<{ url: string; publicId: string }>,
      captionBase: string,
      startOrder = 0,
    ) {
      if (uploads.length === 0) {
        return [];
      }

      return this.prisma.$transaction(
        uploads.map((upload, index) =>
          this.prisma.fsdUserStoryImage.create({
            data: {
              userStoryId,
              url: upload.url,
              cloudinaryPublicId: upload.publicId,
              caption: captionBase,
              altText: captionBase,
              order: startOrder + index,
            },
          }),
        ),
      );
    }

    private normalizeStoryFileBuffers(payload: {
      fileBuffer?: Buffer;
      fileBuffers?: Buffer[];
    }) {
      if (payload.fileBuffers?.length) {
        return payload.fileBuffers;
      }

      return payload.fileBuffer ? [payload.fileBuffer] : [];
    }

    private async getUserStoryWithImages(id: string) {
      return this.prisma.userStory.findUnique({
        where: { id },
        include: {
          fsdImages: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    }

  // ----------------------- EPIC -----------------------

  async createEpic(payload: CreateEpicDto) {
    return this.prisma.epic.create({
      data: {
        name: payload.name,
        projectId: payload.projectId,
        tagId: payload.tagId,
        description: payload.description,
        status: payload.status ?? EpicStatus.NEW,
        priority: payload.priority ?? EpicPriority.LOW,
        creationDate: new Date(),
      },
    });
  }

  async updateEpic(id: string, payload: Partial<CreateEpicDto>) {
    const epic = await this.prisma.epic.findUnique({ where: { id } });
    if (!epic) throw new Error('Epic not found');

    // ✅ Destructure out fields that don't belong in Prisma update
    const { epicId, projectId, ...safePayload } = payload as any;

    return this.prisma.epic.update({
      where: { id },
      data: {
        ...safePayload,
      },
    });
  }

  async deleteEpic(id: string) {
    const epic = await this.prisma.epic.findUnique({ where: { id } });
    if (!epic) throw new Error('Epic not found');

    await this.prisma.userStory.deleteMany({
      where: { feature: { epicId: id } },
    });
    await this.prisma.feature.deleteMany({ where: { epicId: id } });

    return this.prisma.epic.delete({ where: { id } });
  }

  async getEpicsByProject(projectId: string) {
    return this.prisma.epic.findMany({
      where: { projectId },
      include: {
        tag: true,
        features: {
          include: {
            tag: true,
            userStories: {
              include: {
                fsdImages: {
                  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        },
      },
      orderBy: { creationDate: 'asc' },
    });
  }

  // ----------------------- FEATURE -----------------------

  async createFeature(payload: CreateFeatureDto) {
    return this.prisma.feature.create({
      data: {
        name: payload.name,
        epicId: payload.epicId,
        tagId: payload.tagId,
        priority: payload.priority,
        status: payload.status,
        description: payload.description,
        creationDate: new Date(),
      },
    });
  }

  async updateFeature(id: string, payload: Partial<CreateFeatureDto>) {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) throw new Error('Feature not found');

    // ✅ Destructure out fields that don't belong in Prisma update
    const { epicId, featureId, projectId, ...safePayload } = payload as any;

    return this.prisma.feature.update({
      where: { id },
      data: {
        ...safePayload, // ✅ only clean fields: name, description, status, priority
      },
    });
  }

  async deleteFeature(id: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) throw new Error('Feature not found');

    await this.prisma.userStory.deleteMany({ where: { featureId: id } });

    return this.prisma.feature.delete({ where: { id } });
  }

  // ----------------------- USER STORY -----------------------

  async createUserStory(payload: CreateUserStoryDto) {
    const feature = await this.prisma.feature.findUnique({
      where: { id: payload.featureId },
    });
    if (!feature) throw new Error('Feature not found');

    const fileBuffers = this.normalizeStoryFileBuffers(payload);
    const uploads = fileBuffers.length
      ? await this.uploadStoryImageBuffers(fileBuffers)
      : [];

    const userStory = await this.prisma.userStory.create({
      data: {
        name: payload.name,
        featureId: payload.featureId,
        tagId: payload.tagId,
        priority: payload.priority ?? StoryPriority.LOW,
        status: payload.status ?? StoryStatus.TO_DO,
        description: payload.description,
        attachment: uploads[0]?.url ?? null,
      },
    });

    await this.storeStoryImages(userStory.id, uploads, payload.name, 0);

    return this.getUserStoryWithImages(userStory.id);
  }

  async updateUserStory(id: string, payload: Partial<UpdateUserStoryDto>) {
    const userStory = await this.prisma.userStory.findUnique({ where: { id } });
    if (!userStory) throw new Error('User Story not found');

    const fileBuffers = this.normalizeStoryFileBuffers(payload as any);
    const uploads = fileBuffers.length
      ? await this.uploadStoryImageBuffers(fileBuffers)
      : [];

    // ✅ Destructure out fields that don't belong in Prisma update
    const {
      featureId,
      fileBuffer,
      fileBuffers: _fileBuffers,
      storyId,
      epicId,
      attachment: _attachment,
      removeAttachment,
      ...safePayload
    } = payload as any;

    // ✅ Convert removeAttachment from string to boolean if needed (FormData sends strings)
    const shouldRemoveAttachment = removeAttachment === true || removeAttachment === 'true';

    // ✅ Determine attachment value:
    // 1. If explicitly removing (removeAttachment=true), set to null
    // 2. If uploading new file, upload to Cloudinary
    // 3. Otherwise, keep existing attachment
    const attachment = shouldRemoveAttachment
      ? uploads[0]?.url ?? null
      : uploads.length > 0
        ? userStory.attachment ?? uploads[0]?.url ?? null
        : userStory.attachment;

    await this.prisma.userStory.update({
      where: { id },
      data: {
        ...safePayload,
        attachment,
      },
    });

    if (uploads.length > 0) {
      const existingImageCount = await this.prisma.fsdUserStoryImage.count({
        where: { userStoryId: id },
      });

      await this.storeStoryImages(
        id,
        uploads,
        safePayload.name ?? userStory.name,
        existingImageCount,
      );
    }

    return this.getUserStoryWithImages(id);
  }

  async deleteUserStory(id: string) {
    const userStory = await this.prisma.userStory.findUnique({ where: { id } });
    if (!userStory) throw new Error('User Story not found');

    return this.prisma.userStory.delete({ where: { id } });
  }

  // ----------------------- TAG -----------------------

  async getAllTag() {
    return this.prisma.tag.findMany({
      orderBy: { label: 'asc' },
    });
  }

  async getTagById(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new Error('Tag not found');
    return tag;
  }

  async createTag(payload: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        label: payload.label,
        color: payload.color,
      },
    });
  }

  async updateTag(id: string, payload: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new Error('Tag not found');

    return this.prisma.tag.update({
      where: { id },
      data: {
        ...payload,
      },
    });
  }

  async deleteTag(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new Error('Tag not found');

    return this.prisma.tag.delete({ where: { id } });
  }
}
