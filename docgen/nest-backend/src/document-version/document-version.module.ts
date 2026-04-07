import { Module } from '@nestjs/common';
import { DocumentVersionController } from './document-version.controller';
import { DocumentVersionService } from './document-version.service';

@Module({
  controllers: [DocumentVersionController],
  providers: [DocumentVersionService],
  exports: [DocumentVersionService],
})
export class DocumentVersionModule {}
