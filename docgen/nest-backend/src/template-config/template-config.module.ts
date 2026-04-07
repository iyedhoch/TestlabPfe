import { Module } from '@nestjs/common';
import { TemplateConfigController } from './template-config.controller';
import { TemplateConfigService } from './template-config.service';

@Module({
  controllers: [TemplateConfigController],
  providers: [TemplateConfigService],
  exports: [TemplateConfigService],
})
export class TemplateConfigModule {}
