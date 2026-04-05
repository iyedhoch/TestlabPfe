import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
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

@Injectable()
export class TestGenerationService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildHierarchy(
    suites: Array<{ id: string; parentId: string | null; [key: string]: any }>,
    parentId: string | null = null,
  ): any[] {
    return suites
      .filter((s) => s.parentId === parentId)
      .map((s) => ({ ...s, children: this.buildHierarchy(suites, s.id) }));
  }

  /**
   * Walk up the tree to check if `targetId` is a descendant of `parentId`.
   * Used to prevent circular moves (moving a suite into its own child).
   */
  private async checkIfDescendant(
    parentId: string,
    targetId: string,
  ): Promise<boolean> {
    let currentId: string | null = targetId;

    while (currentId) {
      const suite = await this.prisma.testSuite.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!suite) break;
      if (suite?.parentId === parentId) return true;
      currentId = suite?.parentId ?? null;
    }

    return false;
  }

  // ─── Test Suites ─────────────────────────────────────────────────────────────

  async getAllTestSuites(projectId: string): Promise<any[]> {
    const suites = await this.prisma.testSuite.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        testCases: {
          include: {
            preconditions: { orderBy: { order: 'asc' } },
            steps: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    // ✅ Rename steps → testSteps in each test case before building hierarchy
    const mappedSuites = suites.map((suite) => ({
      ...suite,
      testCases: suite.testCases.map(({ steps, ...tc }) => ({
        ...tc,
        testSteps: steps,
      })),
    }));
    return this.buildHierarchy(mappedSuites);
  }

  async createTestSuite(dto: CreateTestSuiteDto) {
    const { name, projectId, parentId } = dto;

    // If parentId provided, verify it exists and belongs to the same project
    if (parentId) {
      const parent = await this.prisma.testSuite.findFirst({
        where: { id: parentId, projectId },
      });
      if (!parent) {
        throw new BadRequestException(
          'Parent suite not found or does not belong to this project',
        );
      }
    }

    // Get max order within the same parent level
    const maxSuite = await this.prisma.testSuite.findFirst({
      where: { projectId, parentId: parentId ?? null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return this.prisma.testSuite.create({
      data: {
        name,
        projectId,
        parentId: parentId ?? null,
        order: maxSuite ? maxSuite.order + 1 : 1,
      },
    });
  }

  async updateTestSuite(id: string, dto: UpdateTestSuiteDto) {
    const suite = await this.prisma.testSuite.findUnique({ where: { id } });
    if (!suite) throw new NotFoundException('Test suite not found');

    const updated = await this.prisma.testSuite.update({
      where: { id },
      data: { name: dto.name },
    });

    return { id: updated.id, name: updated.name };
  }

  async deleteTestSuite(id: string) {
    const suite = await this.prisma.testSuite.findUnique({ where: { id } });
    if (!suite) throw new NotFoundException('Test suite not found');

    // Cascade handles children + testCases + steps + preconditions
    await this.prisma.testSuite.delete({ where: { id } });
  }

  async moveTestSuite(dto: MoveTestSuiteDto) {
    const { suiteId, destinationSuiteId } = dto;

    if (suiteId === destinationSuiteId) {
      throw new BadRequestException('Cannot move a test suite into itself');
    }

    return this.prisma.$transaction(async (tx) => {
      const suite = await tx.testSuite.findUnique({ where: { id: suiteId } });
      if (!suite) throw new NotFoundException('Test suite not found');

      if (destinationSuiteId) {
        const destination = await tx.testSuite.findUnique({
          where: { id: destinationSuiteId },
        });
        if (!destination)
          throw new NotFoundException('Destination test suite not found');

        if (destination.projectId !== suite.projectId) {
          throw new BadRequestException(
            'Destination suite must belong to the same project',
          );
        }

        const isDescendant = await this.checkIfDescendant(
          suiteId,
          destinationSuiteId,
        );
        if (isDescendant) {
          throw new BadRequestException(
            'Cannot move a test suite into its own descendant',
          );
        }
      }

      // Shift siblings in old parent down to fill the gap
      await tx.testSuite.updateMany({
        where: {
          parentId: suite.parentId,
          projectId: suite.projectId,
          order: { gt: suite.order },
        },
        data: { order: { decrement: 1 } },
      });

      // Find max order in new parent
      const maxInDest = await tx.testSuite.findFirst({
        where: { parentId: destinationSuiteId, projectId: suite.projectId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const moved = await tx.testSuite.update({
        where: { id: suiteId },
        data: {
          parentId: destinationSuiteId,
          order: (maxInDest?.order ?? 0) + 1,
        },
      });

      const allSuites = await tx.testSuite.findMany({
        where: { projectId: suite.projectId },
        orderBy: { order: 'asc' },
      });

      return { movedSuite: moved, allSuites };
    });
  }

  async reorderTestSuites(projectId: string, dto: ReorderTestSuitesDto) {
    const suiteIds = dto.suites.map((s) => s.id);

    const existing = await this.prisma.testSuite.findMany({
      where: { id: { in: suiteIds }, projectId },
      select: { id: true },
    });

    if (existing.length !== dto.suites.length) {
      throw new BadRequestException(
        'Some test suites do not belong to this project',
      );
    }

    await this.prisma.$transaction(
      dto.suites.map((s) =>
        this.prisma.testSuite.update({
          where: { id: s.id },
          data: { order: s.order },
        }),
      ),
    );

    return this.prisma.testSuite.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  // ─── Test Cases ──────────────────────────────────────────────────────────────

  async getTestCaseById(id: string) {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id },
      include: {
        preconditions: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
      },
    });
    if (!testCase) throw new NotFoundException('Test case not found');

    //Renaming the steps -> testSteps to match FRONT expectations
    const { steps, ...rest } = testCase;
    return { ...rest, testSteps: steps };
  }

  async createTestCase(dto: CreateTestCaseDto) {
    const { name, testSuiteId, summary, preconditions, testSteps } = dto;

    const suite = await this.prisma.testSuite.findUnique({
      where: { id: testSuiteId },
    });
    if (!suite) throw new NotFoundException('Test suite not found');

    return this.prisma.testCase
      .create({
        data: {
          name,
          summary: summary ?? '',
          testSuiteId,
          ...(preconditions?.length && {
            preconditions: {
              create: preconditions.map((pc, i) => ({
                content: pc.content,
                order: pc.order ?? i,
              })),
            },
          }),
          ...(testSteps?.length && {
            steps: {
              create: testSteps.map((step, i) => ({
                action: step.action,
                expectedResult: step.expectedResult,
                order: step.order ?? i,
              })),
            },
          }),
        },
        include: {
          preconditions: { orderBy: { order: 'asc' } },
          steps: { orderBy: { order: 'asc' } },
        },
      })
      .then((result) => ({
        ...result,
        testSteps: result.steps, // ✅ alias for frontend compatibility
        steps: undefined,
      }));
  }

  async updateTestCase(id: string, dto: UpdateTestCaseDto) {
    const testCase = await this.prisma.testCase.findUnique({ where: { id } });
    if (!testCase) throw new NotFoundException('Test case not found');

    return this.prisma.testCase.update({
      where: { id },
      data: { name: dto.name, summary: dto.summary ?? '' },
      include: {
        preconditions: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
      },
    });
  }

  async deleteTestCase(id: string) {
    const testCase = await this.prisma.testCase.findUnique({ where: { id } });
    if (!testCase) throw new NotFoundException('Test case not found');
    await this.prisma.testCase.delete({ where: { id } });
  }

  async moveTestCase(dto: MoveTestCaseDto) {
    const { testCaseId, destinationSuiteId } = dto;

    return this.prisma.$transaction(async (tx) => {
      const testCase = await tx.testCase.findUnique({
        where: { id: testCaseId },
      });
      if (!testCase) throw new NotFoundException('Test case not found');

      const destination = await tx.testSuite.findUnique({
        where: { id: destinationSuiteId },
      });
      if (!destination)
        throw new NotFoundException('Destination test suite not found');

      const oldSuiteId = testCase.testSuiteId;

      const moved = await tx.testCase.update({
        where: { id: testCaseId },
        data: { testSuiteId: destinationSuiteId },
      });

      const affectedCases = await tx.testCase.findMany({
        where: { testSuiteId: { in: [oldSuiteId, destinationSuiteId] } },
      });

      return { movedCase: moved, affectedCases };
    });
  }

  // ─── Test Steps ──────────────────────────────────────────────────────────────

  async createTestStep(dto: CreateTestStepDto) {
    const { testCaseId, action, expectedResult, insertAfterOrder } = dto;

    const testCase = await this.prisma.testCase.findUnique({
      where: { id: testCaseId },
    });
    if (!testCase) throw new NotFoundException('Test case not found');

    let newOrder: number;

    if (insertAfterOrder != null) {
      newOrder = insertAfterOrder + 1;

      // Shift all steps at or after the insertion point up by 1
      await this.prisma.testStep.updateMany({
        where: { testCaseId, order: { gte: newOrder } },
        data: { order: { increment: 1 } },
      });
    } else {
      const maxStep = await this.prisma.testStep.findFirst({
        where: { testCaseId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      newOrder = maxStep ? maxStep.order + 1 : 0;
    }

    return this.prisma.testStep.create({
      data: { action, expectedResult, order: newOrder, testCaseId },
    });
  }

  async updateTestStep(id: string, dto: UpdateTestStepDto) {
    const step = await this.prisma.testStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Test step not found');

    return this.prisma.testStep.update({
      where: { id },
      data: { action: dto.action, expectedResult: dto.expectedResult },
    });
  }

  async deleteTestStep(id: string) {
    const step = await this.prisma.testStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Test step not found');

    await this.prisma.testStep.delete({ where: { id } });

    // Close the gap left by the deleted step
    await this.prisma.testStep.updateMany({
      where: { testCaseId: step.testCaseId, order: { gt: step.order } },
      data: { order: { decrement: 1 } },
    });
  }

  async reorderTestSteps(testCaseId: string, dto: ReorderTestStepsDto) {
    const stepIds = dto.steps.map((s) => s.id);

    const existing = await this.prisma.testStep.findMany({
      where: { id: { in: stepIds }, testCaseId },
      select: { id: true },
    });

    if (existing.length !== dto.steps.length) {
      throw new BadRequestException(
        'Some test steps do not belong to this test case',
      );
    }

    await this.prisma.$transaction(
      dto.steps.map((s) =>
        this.prisma.testStep.update({
          where: { id: s.id },
          data: { order: s.order },
        }),
      ),
    );

    return this.prisma.testStep.findMany({
      where: { testCaseId },
      orderBy: { order: 'asc' },
    });
  }

  // ─── Preconditions ───────────────────────────────────────────────────────────

  async updatePrecondition(id: string, dto: UpdatePreconditionDto) {
    const precondition = await this.prisma.precondition.findUnique({
      where: { id },
    });
    if (!precondition) throw new NotFoundException('Precondition not found');

    return this.prisma.precondition.update({
      where: { id },
      data: { content: dto.content },
    });
  }
}
