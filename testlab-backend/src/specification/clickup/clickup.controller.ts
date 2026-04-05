import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClickUpService } from './clickup.service';

@Controller('specs')
export class ClickUpController {
  constructor(private readonly clickUpService: ClickUpService) {}

  @Post('/clickup-import')
  @HttpCode(HttpStatus.OK)
  async importFromClickup(
    @Body()
    dto: {
      clickupApiToken: string;
      spaceId: string;
      folderId: string;
      listId: string;
      withFilters: boolean;
    },
  ) {
    return this.handleRequest(() =>
      this.clickUpService.importFromClickup(
        dto.clickupApiToken,
        dto.spaceId,
        dto.folderId,
        dto.listId,
        dto.withFilters,
      ),
    );
  }

  @Post('/clickup-projects')
  @HttpCode(HttpStatus.OK)
  async getAllProjects(@Body() dto: { clickupApiToken: string }) {
    return this.handleRequest(() =>
      this.clickUpService.getAllProjects(dto.clickupApiToken),
    );
  }

  @Get('/clickup-task/:taskId')
  async getTaskDetails(
    @Param('taskId') taskId: string,
    @Query('clickupApiToken') clickupApiToken: string,
  ) {
    return this.handleRequest(() =>
      this.clickUpService.getTaskDetails(clickupApiToken, taskId),
    );
  }

  // ─── Error Handling ───────────────────────────────────────────────────────

  private async handleRequest<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Re-throw NestJS HTTP exceptions as-is
      if (error?.status) throw error;

      const status = error.response?.status;

      if (status === 401)
        throw new UnauthorizedException('Invalid ClickUp API token');
      if (status === 404)
        throw new NotFoundException('Resource not found in ClickUp');

      throw new InternalServerErrorException(
        'Failed to process ClickUp request',
      );
    }
  }
}
