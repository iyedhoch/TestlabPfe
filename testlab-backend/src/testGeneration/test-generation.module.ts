import { Module } from '@nestjs/common';
import { TestGenerationController } from './test-generation.controller';
import { TestGenerationService } from './test-generation.service';

@Module({
  controllers: [TestGenerationController],
  providers: [TestGenerationService],
})
export class TestGenerationModule {}
