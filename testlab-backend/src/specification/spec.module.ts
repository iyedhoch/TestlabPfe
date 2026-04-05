import { Module } from '@nestjs/common';
import { SpecService } from './spec.service';
import { SpecController } from './spec.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ClickUpModule } from './clickup/clickup.module';

@Module({
  imports: [CloudinaryModule, ClickUpModule],
  providers: [SpecService],
  controllers: [SpecController],
})
export class SpecModule {}
