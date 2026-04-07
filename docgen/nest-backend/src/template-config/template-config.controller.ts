import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { TemplateConfigRecord } from '../mock-data/template-configs.data';
import { TemplateConfigService } from './template-config.service';

@Controller('api/templates')
export class TemplateConfigController {
  constructor(private readonly templateConfigService: TemplateConfigService) {}

  @Get()
  getAllTemplates(): TemplateConfigRecord[] {
    return this.templateConfigService.getAllTemplates();
  }

  @Get('active')
  getActiveTemplate(
    @Query('template') template?: string,
  ): TemplateConfigRecord {
    return this.templateConfigService.getActiveTemplate(template);
  }

  @Post(':id/activate')
  activateTemplate(@Param('id') id: string): TemplateConfigRecord {
    return this.templateConfigService.activateTemplate(id);
  }
}
