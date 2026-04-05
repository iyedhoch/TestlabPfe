import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnvironmentService } from './environment.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from './dto/environment.dto';
import { CreateEnvItemDto, UpdateEnvItemDto } from './dto/env-item.dto';

@Controller('environments')
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  // ─── Environments ────────────────────────────────────────────────

  @Get('paginated')
  findPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.environmentService.findPaginated(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      projectId,
    );
  }

  @Get('project/:projectId')
  findByProjectId(@Param('projectId') projectId: string) {
    return this.environmentService.findByProjectId(projectId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.environmentService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEnvironmentDto) {
    return this.environmentService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnvironmentDto) {
    return this.environmentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.environmentService.delete(id);
  }

  // ─── EnvItems ────────────────────────────────────────────────────

  @Post(':environmentId/env-items')
  @HttpCode(HttpStatus.CREATED)
  createEnvItem(
    @Param('environmentId') environmentId: string,
    @Body() dto: CreateEnvItemDto,
  ) {
    return this.environmentService.createEnvItem(environmentId, dto);
  }

  @Put('env-items/:id')
  updateEnvItem(@Param('id') id: string, @Body() dto: UpdateEnvItemDto) {
    return this.environmentService.updateEnvItem(id, dto);
  }

  @Delete('env-items/:id')
  deleteEnvItem(@Param('id') id: string) {
    return this.environmentService.deleteEnvItem(id);
  }
}
