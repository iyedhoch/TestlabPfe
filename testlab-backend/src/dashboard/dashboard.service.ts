import { Injectable } from '@nestjs/common';
import { ProjectStatus, StoryStatus } from '_prisma/enums';
import { PrismaService } from '../database/prisma.service';

type DashboardResponse = {
  statistics: {
    activeProjects: {
      count: number;
      badge: string;
      change: number;
    };
    testCases: {
      count: number;
      badge: string;
      newCases: number;
    };
    coverage: {
      percentage: number;
      badge: string;
      target: number;
    };
    lastExecution: {
      time: string;
      badge: string;
      testCount: number;
    };
  };
  executionTrend: {
    period: string;
    data: Array<{
      month: string;
      value: number;
      date?: string;
    }>;
  };
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private monthLabel(date: Date): string {
    return date.toLocaleString('en-US', { month: 'short' });
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private monthsBack(baseDate: Date, months: number): Date {
    return new Date(baseDate.getFullYear(), baseDate.getMonth() - months, 1);
  }

  private formatTime(date: Date | null): string {
    if (!date) return '--:--';
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  async getDashboardData(): Promise<DashboardResponse> {
    const now = new Date();
    const start30Days = new Date(now);
    start30Days.setDate(now.getDate() - 30);

    const startCurrentMonth = this.startOfMonth(now);
    const startPreviousMonth = this.monthsBack(now, 1);

    const [
      activeProjectsCount,
      currentMonthProjectsCount,
      previousMonthProjectsCount,
      totalTestCases,
      recentTestCases,
      totalStories,
      doneStories,
      latestExecutionProject,
      trendProjects,
    ] = await Promise.all([
      this.prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.prisma.project.count({ where: { creationDate: { gte: startCurrentMonth } } }),
      this.prisma.project.count({
        where: {
          creationDate: {
            gte: startPreviousMonth,
            lt: startCurrentMonth,
          },
        },
      }),
      this.prisma.testCase.count(),
      this.prisma.testCase.count({
        where: {
          testSuite: {
            project: {
              updatedAt: { gte: start30Days },
            },
          },
        },
      }),
      this.prisma.userStory.count(),
      this.prisma.userStory.count({ where: { status: StoryStatus.DONE } }),
      this.prisma.project.findFirst({
        where: { lastExecutionDate: { not: null } },
        orderBy: { lastExecutionDate: 'desc' },
        select: { lastExecutionDate: true, testCaseCount: true },
      }),
      this.prisma.project.findMany({
        where: {
          creationDate: {
            gte: this.monthsBack(now, 5),
          },
        },
        select: {
          creationDate: true,
          testCaseCount: true,
        },
      }),
    ]);

    const activeProjectsChange = currentMonthProjectsCount - previousMonthProjectsCount;
    const targetCoverage = 85;
    const coveragePercentage =
      totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0;
    const coverageDelta = coveragePercentage - targetCoverage;

    const monthBuckets: Record<string, { month: string; value: number; date: string }> = {};
    for (let i = 5; i >= 0; i--) {
      const bucketDate = this.monthsBack(now, i);
      const bucketStart = this.startOfMonth(bucketDate);
      const key = bucketStart.toISOString();
      monthBuckets[key] = {
        month: this.monthLabel(bucketStart),
        value: 0,
        date: bucketStart.toISOString(),
      };
    }

    for (const project of trendProjects) {
      const bucketStart = this.startOfMonth(project.creationDate).toISOString();
      if (monthBuckets[bucketStart]) {
        monthBuckets[bucketStart].value += project.testCaseCount;
      }
    }

    const trendData = Object.values(monthBuckets).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      statistics: {
        activeProjects: {
          count: activeProjectsCount,
          badge:
            activeProjectsChange >= 0
              ? `+${activeProjectsChange} this month`
              : `${activeProjectsChange} this month`,
          change: activeProjectsChange,
        },
        testCases: {
          count: totalTestCases,
          badge: `${recentTestCases} updated in last 30 days`,
          newCases: recentTestCases,
        },
        coverage: {
          percentage: coveragePercentage,
          badge:
            coverageDelta >= 0
              ? `+${coverageDelta}% vs target`
              : `${coverageDelta}% vs target`,
          target: targetCoverage,
        },
        lastExecution: {
          time: this.formatTime(latestExecutionProject?.lastExecutionDate ?? null),
          badge: latestExecutionProject
            ? 'Latest project execution'
            : 'No executions yet',
          testCount: latestExecutionProject?.testCaseCount ?? 0,
        },
      },
      executionTrend: {
        period: '6 months',
        data: trendData,
      },
    };
  }
}
