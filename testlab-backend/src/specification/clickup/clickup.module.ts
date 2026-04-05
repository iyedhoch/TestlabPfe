import { Module } from '@nestjs/common';
import { ClickUpController } from './clickup.controller';
import { ClickUpService } from './clickup.service';

@Module({
  controllers: [ClickUpController],
  providers: [ClickUpService],
  exports: [ClickUpService],
})
export class ClickUpModule {}
