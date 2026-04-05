import { ProjectsService } from './project.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './project.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectsService) {}

  @Get()
  async getAllProjects() {
    return this.projectService.getProjects();
  }

  @Get('/paginated')
  async getPaginatedProjects(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.projectService.getPaginatedProjects(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Post()
  @UseInterceptors(FilesInterceptor('attachment'))
  async createProject(
    @Body() data: CreateProjectDto,
    @UploadedFiles()
    file: {
      attachment?: Express.Multer.File;
    },
  ) {
    return this.projectService.createProject(data, file[0]);
  }

  @Put('/:id')
  @UseInterceptors(FilesInterceptor('attachment'))
  async updateProject(
    @Param('id') id: string,
    @Body() data: UpdateProjectDto,
    @UploadedFiles()
    file: {
      attachment?: Express.Multer.File;
    },
  ) {
    return this.projectService.updateProject(id, data, file[0]);
  }

  @Delete('/:id')
  async deleteProject(@Param('id') id: string) {
    return this.projectService.deleteProject(id);
  }

  @Post('/export')
  async exportProjects(
    @Body('projectIds') projectIds: string[],
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.projectService.exportProjects(
      projectIds || [],
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=projects-export-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  }
}
