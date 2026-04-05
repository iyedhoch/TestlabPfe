import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type SupportedDocumentType = 'cahier' | 'fsd';

export interface DocumentTemplateSnapshot {
  id: string;
  name: string;
  title: string;
  footer: string;
  showStatistics: boolean;
  showExecutions: boolean;
  showPreconditions: boolean;
  showSteps: boolean;
  showApprovals: boolean;
  showContext: boolean;
  failedOnly: boolean;
}

export interface Metadata {
  title: string;
  clientName: string;
  author: string;
  version: string;
  date: string;
  companyLogo?: string;
  clientLogo?: string;
}

export interface Context {
  description: string;
  objective: string;
}

export interface ProjectInfo {
  id: number;
  name: string;
  owner: string;
}

export interface Precondition {
  content: string;
  order: number;
}

export interface Step {
  order: number;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  code: string;
  name: string;
  summary: string;
  preconditions: Precondition[];
  steps: Step[];
}

export interface Suite {
  id: string;
  name: string;
  order?: number;
  children: Suite[];
  testCases: TestCase[];
}

export interface Approval {
  name: string;
  role: string;
  date: string;
}

export interface CahierRecetteDocument {
  metadata: Metadata;
  context: Context;
  project: ProjectInfo;
  suites: Suite[];
  approvals: Approval[];
}

export interface FsdDefinition {
  term: string;
  definition: string;
}

export interface FsdIntroduction {
  purpose: string;
  scope: string;
  definitions?: FsdDefinition[];
}

export interface FsdOverallDescription {
  productPerspective: string;
  userClasses: string;
  assumptions: string;
}

export type FsdRequirementPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface FsdFunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: FsdRequirementPriority;
  relatedUserStory?: string;
}

export interface FsdNonFunctionalRequirements {
  performance: string;
  security: string;
  usability: string;
}

export interface FsdUserStory {
  id: string;
  title: string;
  description: string;
}

export interface FsdSystemFeature {
  name: string;
  description: string;
  userStories: FsdUserStory[];
}

export interface FsdExternalInterfaces {
  userInterface: string;
  apiInterfaces: string;
}

export interface FsdApproval {
  name: string;
  role: string;
  date: string;
}

export interface FsdDocument {
  metadata: {
    title: string;
    projectName: string;
    clientName: string;
    version: string;
    date: string;
    author: string;
  };
  introduction: FsdIntroduction;
  overallDescription: FsdOverallDescription;
  functionalRequirements: FsdFunctionalRequirement[];
  nonFunctionalRequirements: FsdNonFunctionalRequirements;
  systemFeatures: FsdSystemFeature[];
  externalInterfaces?: FsdExternalInterfaces;
  approvals: FsdApproval[];
}

export interface FsdDocumentModel extends FsdDocument {
  template: DocumentTemplateSnapshot;
}

export interface CahierDocumentModel {
  metadata: Metadata;
  context: Context;
  project: ProjectInfo;
  suites: Suite[];
  approvals: Approval[];
  template: DocumentTemplateSnapshot;
}

@Injectable()
export class TestLabDataAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async toCahierModel(projectId: string): Promise<CahierDocumentModel> {
    const resolvedProjectId = this.normalizeProjectId(projectId);
    const project = await this.findProjectWithDocuments(resolvedProjectId);
    const today = this.currentDate();

    return {
      metadata: {
        title: this.buildCahierTitle(project?.name, resolvedProjectId),
        clientName: project?.name || resolvedProjectId,
        author: 'System',
        version: '1.0',
        date: today,
        companyLogo: undefined,
        clientLogo: undefined,
      },
      context: {
        description: this.safeText(
          project?.description,
          `Cahier de recette generated from TestLab project ${project?.name || resolvedProjectId}.`,
        ),
        objective: `Validate the business scenarios and test coverage for ${project?.name || resolvedProjectId}.`,
      },
      project: {
        id: this.projectNumericId(resolvedProjectId),
        name: project?.name || resolvedProjectId,
        owner: 'System',
      },
      suites: this.buildSuiteTree(project?.testSuites ?? []),
      approvals: [],
      template: this.defaultTemplateSnapshot(),
    };
  }

  async toFsdModel(projectId: string): Promise<FsdDocumentModel> {
    const resolvedProjectId = this.normalizeProjectId(projectId);
    const project = await this.findProjectWithDocuments(resolvedProjectId);
    const today = this.currentDate();
    const epics = project?.epics ?? [];
    const systemFeatures = this.buildSystemFeatures(epics);
    const functionalRequirements = this.buildFunctionalRequirements(epics);

    return {
      metadata: {
        title: this.buildFsdTitle(project?.name, resolvedProjectId),
        projectName: project?.name || resolvedProjectId,
        clientName: project?.name || resolvedProjectId,
        version: '1.0',
        date: today,
        author: 'System',
      },
      introduction: {
        purpose: this.safeText(
          project?.description,
          `This document defines the functional scope for ${project?.name || resolvedProjectId}.`,
        ),
        scope: `Feature and user story coverage for ${project?.name || resolvedProjectId}.`,
        definitions: [],
      },
      overallDescription: {
        productPerspective: this.safeText(
          project?.description,
          `The platform supports the delivery of ${project?.name || resolvedProjectId} capabilities.`,
        ),
        userClasses: 'Primary users are business analysts, testers, and project stakeholders.',
        assumptions:
          'The source TestLab project data is available and document generation runs in the backend service.',
      },
      functionalRequirements,
      nonFunctionalRequirements: {
        performance:
          'Document rendering should complete within acceptable backend limits for the selected project.',
        security:
          'Document generation should respect the current TestLab access rules when integrated with auth.',
        usability:
          'Generated documents should remain readable and consistent with the DocGen template pipeline.',
      },
      systemFeatures,
      externalInterfaces: {
        userInterface:
          'TestLab web interface used to configure and export documents.',
        apiInterfaces:
          'Internal NestJS APIs used to fetch projects, test suites, epics, features, and user stories.',
      },
      approvals: [],
      template: this.defaultTemplateSnapshot(),
    };
  }

  private async findProjectWithDocuments(projectId: string): Promise<any | null> {
    try {
      return await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          testSuites: {
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
            include: {
              testCases: {
                orderBy: [{ name: 'asc' }],
                include: {
                  preconditions: { orderBy: [{ order: 'asc' }] },
                  steps: { orderBy: [{ order: 'asc' }] },
                },
              },
            },
          },
          epics: {
            orderBy: [{ creationDate: 'asc' }],
            include: {
              features: {
                orderBy: [{ creationDate: 'asc' }],
                include: {
                  userStories: {
                    orderBy: [{ creationDate: 'asc' }],
                  },
                },
              },
            },
          },
        },
      });
    } catch {
      return null;
    }
  }

  private buildSuiteTree(testSuites: any[]): Suite[] {
    const suitesByParent = new Map<string | null, any[]>();

    for (const suite of testSuites) {
      const parentKey = suite.parentId ?? null;
      const items = suitesByParent.get(parentKey) ?? [];
      items.push(suite);
      suitesByParent.set(parentKey, items);
    }

    const sortSuites = (items: any[]): any[] => {
      return [...items].sort((left, right) => {
        const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return String(left.name ?? '').localeCompare(String(right.name ?? ''));
      });
    };

    const buildNode = (suite: any): Suite => {
      const children = sortSuites(suitesByParent.get(suite.id) ?? []).map(buildNode);

      return {
        id: String(suite.id),
        name: this.safeText(suite.name, 'Untitled suite'),
        order: suite.order ?? undefined,
        children,
        testCases: (suite.testCases ?? []).map((testCase: any) => this.mapTestCase(testCase)),
      };
    };

    return sortSuites(suitesByParent.get(null) ?? []).map(buildNode);
  }

  private mapTestCase(testCase: any): TestCase {
    return {
      id: String(testCase.id),
      code: `TC-${String(testCase.id)}`,
      name: this.safeText(testCase.name, 'Untitled test case'),
      summary: this.safeText(
        testCase.summary ?? testCase.description,
        'No summary provided.',
      ),
      preconditions: (testCase.preconditions ?? []).map((precondition: any, index: number) => ({
        content: this.safeText(precondition.content, ''),
        order: precondition.order ?? index + 1,
      })),
      steps: (testCase.steps ?? []).map((step: any, index: number) => ({
        order: step.order ?? index + 1,
        action: this.safeText(step.action, ''),
        expectedResult: this.safeText(step.expectedResult, ''),
      })),
    };
  }

  private buildSystemFeatures(epics: any[]): FsdSystemFeature[] {
    const features: FsdSystemFeature[] = [];

    for (const epic of epics ?? []) {
      for (const feature of epic.features ?? []) {
        features.push({
          name: this.safeText(feature.name, 'Untitled feature'),
          description: this.safeText(feature.description, 'No description provided.'),
          userStories: (feature.userStories ?? []).map((story: any) => ({
            id: String(story.id),
            title: this.safeText(story.name, 'Untitled user story'),
            description: this.safeText(story.description, 'No description provided.'),
          })),
        });
      }
    }

    return features;
  }

  private buildFunctionalRequirements(epics: any[]): FsdFunctionalRequirement[] {
    const requirements: FsdFunctionalRequirement[] = [];
    let index = 1;

    for (const epic of epics ?? []) {
      for (const feature of epic.features ?? []) {
        for (const story of feature.userStories ?? []) {
          requirements.push({
            id: `FR-${String(index).padStart(3, '0')}`,
            title: this.safeText(story.name, 'Untitled functional requirement'),
            description: this.safeText(story.description, 'No description provided.'),
            priority: this.mapStoryPriorityToRequirementPriority(story.priority),
            relatedUserStory: String(story.id),
          });
          index += 1;
        }
      }
    }

    return requirements;
  }

  private mapStoryPriorityToRequirementPriority(
    priority: string | null | undefined,
  ): FsdRequirementPriority {
    const normalized = String(priority ?? '').toUpperCase();

    if (normalized === 'HIGH' || normalized === 'CRITICAL') {
      return normalized === 'CRITICAL' ? 'Critical' : 'High';
    }

    if (normalized === 'LOW') {
      return 'Low';
    }

    return 'Medium';
  }

  private defaultTemplateSnapshot(): DocumentTemplateSnapshot {
    return {
      id: 'default',
      name: 'Default Template',
      title: 'Project Document',
      footer: 'Generated by TestLab document adapter',
      showStatistics: true,
      showExecutions: true,
      showPreconditions: true,
      showSteps: true,
      showApprovals: true,
      showContext: true,
      failedOnly: false,
    };
  }

  private normalizeProjectId(projectId: string): string {
    return String(projectId ?? '').trim();
  }

  private currentDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private projectNumericId(projectId: string): number {
    const digits = projectId.replace(/\D/g, '');
    if (digits.length > 0) {
      const parsed = Number.parseInt(digits.slice(0, 9), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    let hash = 0;
    for (const character of projectId) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return hash > 0 ? hash : 1;
  }

  private buildCahierTitle(projectName?: string, projectId?: string): string {
    return `Cahier de Recette - ${projectName || projectId || 'Project'}`;
  }

  private buildFsdTitle(projectName?: string, projectId?: string): string {
    return `Functional Specification Document - ${projectName || projectId || 'Project'}`;
  }

  private safeText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
}