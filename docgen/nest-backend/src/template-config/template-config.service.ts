import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TEMPLATE_CONFIGS } from '../mock-data/template-configs.data';
import type { TemplateConfigRecord } from '../mock-data/template-configs.data';

@Injectable()
export class TemplateConfigService {
  // TODO: Replace mock data with external API calls.
  private readonly templates: TemplateConfigRecord[] = TEMPLATE_CONFIGS;

  getAllTemplates(): TemplateConfigRecord[] {
    return this.templates;
  }

  getActiveTemplate(preferredTemplateId?: string): TemplateConfigRecord {
    if (preferredTemplateId) {
      return this.findByIdOrThrow(preferredTemplateId);
    }

    const activeTemplate = this.templates.find((item) => item.active);
    if (!activeTemplate) {
      throw new NotFoundException('No active template configured');
    }

    return activeTemplate;
  }

  activateTemplate(id: string): TemplateConfigRecord {
    const template = this.findByIdOrThrow(id);

    for (const item of this.templates) {
      item.active = item.id === template.id;
    }

    return template;
  }

  private findByIdOrThrow(id: string): TemplateConfigRecord {
    const normalizedId = id?.trim();
    if (!normalizedId) {
      throw new BadRequestException('template id is required');
    }

    const template = this.templates.find((item) => item.id === normalizedId);
    if (!template) {
      throw new NotFoundException(`Template with id ${normalizedId} not found`);
    }

    return template;
  }
}
