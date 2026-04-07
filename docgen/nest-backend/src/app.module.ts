import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DocumentVersionModule } from './document-version/document-version.module';
import { ProjectDocumentModule } from './project-document/project-document.module';
import { TemplateConfigModule } from './template-config/template-config.module';

@Module({
  imports: [
    AuthModule,
    ProjectDocumentModule,
    DocumentVersionModule,
    TemplateConfigModule,
  ],
})
export class AppModule {}
