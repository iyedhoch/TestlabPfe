import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { TestGenerationService } from './test-generation.service';
import {
  CreateTestSuiteDto,
  UpdateTestSuiteDto,
  MoveTestSuiteDto,
  ReorderTestSuitesDto,
} from './dto/test-suite.dto';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
  MoveTestCaseDto,
} from './dto/test-case.dto';
import {
  CreateTestStepDto,
  UpdateTestStepDto,
  ReorderTestStepsDto,
  UpdatePreconditionDto,
} from './dto/test-step.dto';

@Controller('test-generation')
export class TestGenerationController {
  constructor(private readonly service: TestGenerationService) {}

  // ─── Test Suites ─────────────────────────────────────────────────────────────

  @Get('test-suites')
  getAllTestSuites(@Query('projectId') projectId: string) {
    if (!projectId) throw new BadRequestException('projectId is required');
    return this.service.getAllTestSuites(projectId);
  }

  @Post('test-suites')
  @HttpCode(HttpStatus.CREATED)
  createTestSuite(@Body() dto: CreateTestSuiteDto) {
    return this.service.createTestSuite(dto);
  }

  @Put('test-suites/move')
  moveTestSuite(@Body() dto: MoveTestSuiteDto) {
    return this.service.moveTestSuite(dto);
  }

  @Put('test-suites/:id')
  updateTestSuite(@Param('id') id: string, @Body() dto: UpdateTestSuiteDto) {
    return this.service.updateTestSuite(id, dto);
  }

  @Delete('test-suites/:id')
  @HttpCode(HttpStatus.OK)
  deleteTestSuite(@Param('id') id: string) {
    return this.service.deleteTestSuite(id);
  }

  @Put('reorder-suites/:id')
  reorderTestSuites(
    @Param('id') projectId: string,
    @Body() dto: ReorderTestSuitesDto,
  ) {
    return this.service.reorderTestSuites(projectId, dto);
  }

  // ─── Test Cases ──────────────────────────────────────────────────────────────

  @Get('test-cases/:id')
  getTestCaseById(@Param('id') id: string) {
    return this.service.getTestCaseById(id);
  }

  @Post('test-cases')
  @HttpCode(HttpStatus.CREATED)
  createTestCase(@Body() dto: CreateTestCaseDto) {
    return this.service.createTestCase(dto);
  }

  @Put('test-cases/move')
  moveTestCase(@Body() dto: MoveTestCaseDto) {
    return this.service.moveTestCase(dto);
  }

  @Put('test-cases/:id')
  updateTestCase(@Param('id') id: string, @Body() dto: UpdateTestCaseDto) {
    return this.service.updateTestCase(id, dto);
  }

  @Delete('test-cases/:id')
  @HttpCode(HttpStatus.OK)
  deleteTestCase(@Param('id') id: string) {
    return this.service.deleteTestCase(id);
  }

  // ─── Test Steps ──────────────────────────────────────────────────────────────

  @Post('test-steps')
  @HttpCode(HttpStatus.CREATED)
  createTestStep(@Body() dto: CreateTestStepDto) {
    return this.service.createTestStep(dto);
  }

  @Put('test-steps/:id')
  updateTestStep(@Param('id') id: string, @Body() dto: UpdateTestStepDto) {
    return this.service.updateTestStep(id, dto);
  }

  @Delete('test-steps/:id')
  @HttpCode(HttpStatus.OK)
  deleteTestStep(@Param('id') id: string) {
    return this.service.deleteTestStep(id);
  }

  @Put('reorder-steps/:id')
  reorderTestSteps(
    @Param('id') testCaseId: string,
    @Body() dto: ReorderTestStepsDto,
  ) {
    return this.service.reorderTestSteps(testCaseId, dto);
  }

  // ─── Preconditions ───────────────────────────────────────────────────────────

  @Put('preconditions/:id')
  updatePrecondition(
    @Param('id') id: string,
    @Body() dto: UpdatePreconditionDto,
  ) {
    return this.service.updatePrecondition(id, dto);
  }
}
