import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from './dto/environment.dto';
import { CreateEnvItemDto, UpdateEnvItemDto } from './dto/env-item.dto';

const ENV_ITEM_SELECT = {
  id: true,
  environmentKey: true,
  value: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class EnvironmentService {
  constructor(private prisma: PrismaService) {}

  // ─── Environments ────────────────────────────────────────────────

  async findPaginated(page = 1, limit = 10, projectId?: string) {
    const where = projectId ? { projectId } : {};
    const skip = (page - 1) * limit;

    const [total, environments] = await this.prisma.$transaction([
      this.prisma.environment.count({ where }),
      this.prisma.environment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { envItems: { select: ENV_ITEM_SELECT } },
      }),
    ]);

    return {
      data: environments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(id: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
      include: { envItems: { select: ENV_ITEM_SELECT } },
    });

    if (!environment) throw new NotFoundException('Environment not found');
    return environment;
  }

  async findByProjectId(projectId: string) {
    return this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { envItems: { select: ENV_ITEM_SELECT } },
    });
  }

  async create(dto: CreateEnvironmentDto) {
    const { envItems, ...envData } = dto;

    const environment = await this.prisma.environment.create({
      data: {
        ...envData,
        status: envData.status ?? 'Projet',
        description: envData.description ?? '',
        ...(envItems?.length && {
          envItems: {
            create: envItems.map((item) => ({
              environmentKey: item.key,
              value: item.value,
            })),
          },
        }),
      },
      include: { envItems: { select: ENV_ITEM_SELECT } },
    });

    return environment;
  }

  async update(id: string, dto: UpdateEnvironmentDto) {
    await this.findById(id); // throws if not found

    const { envItems, ...envData } = dto;

    // If envItems provided: delete all existing, then recreate
    if (envItems !== undefined) {
      await this.prisma.envItem.deleteMany({ where: { environmentId: id } });
    }

    return this.prisma.environment.update({
      where: { id },
      data: {
        ...envData,
        ...(envItems !== undefined &&
          envItems.length > 0 && {
            envItems: {
              create: envItems.map((item) => ({
                environmentKey: item.key,
                value: item.value,
              })),
            },
          }),
      },
      include: { envItems: { select: ENV_ITEM_SELECT } },
    });
  }

  async delete(id: string) {
    await this.findById(id); // throws if not found
    await this.prisma.environment.delete({ where: { id } }); // cascade deletes envItems
  }

  // ─── EnvItems ────────────────────────────────────────────────────

  async createEnvItem(environmentId: string, dto: CreateEnvItemDto) {
    await this.findById(environmentId); // throws if environment not found

    return this.prisma.envItem.create({
      data: {
        environmentKey: dto.key,
        value: dto.value,
        environmentId,
      },
    });
  }

  async updateEnvItem(id: string, dto: UpdateEnvItemDto) {
    const envItem = await this.prisma.envItem.findUnique({ where: { id } });
    if (!envItem) throw new NotFoundException('EnvItem not found');

    return this.prisma.envItem.update({
      where: { id },
      data: {
        ...(dto.key && { environmentKey: dto.key }),
        ...(dto.value !== undefined && { value: dto.value }),
      },
    });
  }

  async deleteEnvItem(id: string) {
    const envItem = await this.prisma.envItem.findUnique({ where: { id } });
    if (!envItem) throw new NotFoundException('EnvItem not found');
    await this.prisma.envItem.delete({ where: { id } });
  }
}
