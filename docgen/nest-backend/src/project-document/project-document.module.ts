import { Module } from '@nestjs/common';
import { DocumentAccessGuard } from '../auth/document-access.guard';
import { DocumentGenerationModule } from '../document-generation/document-generation.module';
import { ProjectDocumentController } from './project-document.controller';
import { ProjectDocumentService } from './project-document.service';

@Module({
  imports: [DocumentGenerationModule],
  controllers: [ProjectDocumentController],
  providers: [ProjectDocumentService, DocumentAccessGuard],
})
export class ProjectDocumentModule {}
