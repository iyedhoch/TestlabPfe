import { Module } from '@nestjs/common';
import { ProjectsService } from './project.service';
import { ProjectController } from './project.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [ProjectsService],
  controllers: [ProjectController],
})
export class ProjectModule {}
