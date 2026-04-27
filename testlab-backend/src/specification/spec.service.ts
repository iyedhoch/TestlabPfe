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
            userStories: true,
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

    return this.prisma.userStory.create({
      data: {
        name: payload.name,
        featureId: payload.featureId,
        tagId: payload.tagId,
        priority: payload.priority ?? StoryPriority.LOW,
        status: payload.status ?? StoryStatus.TO_DO,
        description: payload.description,
        attachment: await this.uploadAttachment(payload.fileBuffer),
      },
    });
  }

  async updateUserStory(id: string, payload: Partial<UpdateUserStoryDto>) {
    const userStory = await this.prisma.userStory.findUnique({ where: { id } });
    if (!userStory) throw new Error('User Story not found');

    // ✅ Destructure out fields that don't belong in Prisma update
    const {
      featureId,
      fileBuffer,
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
    const attachment =
      shouldRemoveAttachment
        ? null
        : fileBuffer
          ? await this.uploadAttachment(fileBuffer)
          : userStory.attachment;

    return this.prisma.userStory.update({
      where: { id },
      data: {
        ...safePayload,
        attachment,
      },
    });
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
