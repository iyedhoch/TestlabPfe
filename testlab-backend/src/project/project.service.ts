import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { UploadApiResponse } from 'cloudinary';
import { PrismaService } from '../database/prisma.service';
import { ProjectStatus } from '_prisma/enums';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CLOUDINARY_FOLDER_NAME } from '../config/enum';
import { formatStatus, getStatusClass } from '../helpers/functions';
import * as ejs from 'ejs';
import * as path from 'path';
import htmlPdf from 'html-pdf-node';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getProjects() {
    return this.prisma.project.findMany();
  }

  async getPaginatedProjects(page = 1, limit = 5) {
    const total = await this.prisma.project.count();
    const projects = await this.prisma.project.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: projects,
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

  async createProject(dto: CreateProjectDto, file?: Express.Multer.File) {
    const payload = {
      ...dto,
      creationDate: new Date(),
      status: dto.status ?? ProjectStatus.ACTIVE,
      platforms: dto.platforms || [],
      clickupListId: dto.clickupListId ?? '',
    };

    if (file) {
      const uploadResult: UploadApiResponse =
        await this.cloudinaryService.uploadBufferToCloudinary(
          file.buffer,
          CLOUDINARY_FOLDER_NAME.PROJECT,
        );
      return this.prisma.project.create({
        data: { ...payload, attachment: uploadResult.secure_url },
      });
    }

    return this.prisma.project.create({ data: payload });
  }

  async updateProject(
    id: string,
    dto: UpdateProjectDto,
    file?: Express.Multer.File,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    let attachmentUrl = project.attachment;
    if (file) {
      const uploadResult: UploadApiResponse =
        await this.cloudinaryService.uploadBufferToCloudinary(
          file.buffer,
          CLOUDINARY_FOLDER_NAME.PROJECT,
        );
      attachmentUrl = uploadResult.secure_url;
    }

    return this.prisma.project.update({
      where: { id },
      data: { ...dto, attachment: attachmentUrl },
    });
  }

  async deleteProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (project.attachment?.trim()) {
      try {
        const publicId = await this.cloudinaryService.extractPublicIdFromUrl(
          project.attachment,
        );
        if (publicId)
          await this.cloudinaryService.deleteFromCloudinary(publicId);
      } catch (err) {
        console.error('Cloudinary deletion error:', err);
      }
    }

    await this.prisma.project.delete({ where: { id } });
    return { message: 'Project deleted successfully', deletedProject: project };
  }

  async exportProjects(projectIds: string[] = []): Promise<void> {
    if (!Array.isArray(projectIds)) {
      throw new BadRequestException('Project IDs must be an array');
    }

    let projects;

    if (projectIds.length === 0) {
      projects = await this.prisma.project.findMany({
        select: {
          name: true,
          prefix: true,
          description: true,
          status: true,
          creationDate: true,
        },
        orderBy: { creationDate: 'desc' },
      });
    } else {
      projects = await this.prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          name: true,
          prefix: true,
          description: true,
          status: true,
          creationDate: true,
        },
        orderBy: { creationDate: 'desc' },
      });
    }

    if (!projects.length) {
      throw new NotFoundException('No projects found');
    }

    const formattedProjects = projects.map((project) => ({
      prefix: project.prefix,
      name: project.name,
      description: project.description,
      formattedStatus: formatStatus(project.status),
      statusClass: getStatusClass(project.status),
      formattedDate: project.creationDate.toLocaleDateString('fr-FR'),
    }));

    const templateData = {
      exportDate: new Date().toLocaleDateString('fr-FR'),
      exportInfo:
        projectIds.length === 0
          ? 'Exporting All Projects'
          : `Exporting ${projects.length} Selected Project(s)`,
      projects: formattedProjects,
    };

    const templatePath = path.join(
      __dirname,
      '../templates/projects-export.ejs',
    );
    const html = await ejs.renderFile(templatePath, templateData);

    const pdfOptions = {
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    };

    const file = { content: html };
    return htmlPdf.generatePdf(file, pdfOptions);
  }
}
