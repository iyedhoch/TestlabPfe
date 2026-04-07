import { Injectable } from '@nestjs/common';
import type { ProjectExecutionRecord } from '../../mock-data/project-executions.data';

export interface ExecutionStatistics {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  passRate: number;
  averageDurationMs: number;
}

@Injectable()
export class StatisticsService {
  compute(executions: ProjectExecutionRecord[]): ExecutionStatistics {
    const total = executions.length;
    const passed = executions.filter((item) => item.status === 'passed').length;
    const failed = executions.filter((item) => item.status === 'failed').length;
    const blocked = executions.filter(
      (item) => item.status === 'blocked',
    ).length;
    const totalDuration = executions.reduce(
      (acc, item) => acc + item.durationMs,
      0,
    );

    return {
      total,
      passed,
      failed,
      blocked,
      passRate: total === 0 ? 0 : Number(((passed / total) * 100).toFixed(2)),
      averageDurationMs: total === 0 ? 0 : Math.round(totalDuration / total),
    };
  }
}
