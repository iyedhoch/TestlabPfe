import { Module } from '@nestjs/common';
import { ProjectModule } from './project/project.module';
import { DatabaseModule } from './database/database.module';
import { EnvironmentModule } from './environment/environment.module';
import { TestGenerationModule } from './testGeneration/test-generation.module';
import { SpecModule } from './specification/spec.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ProjectModule,
    DatabaseModule,
    EnvironmentModule,
    TestGenerationModule,
    SpecModule,
    DashboardModule,
    DocumentsModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
