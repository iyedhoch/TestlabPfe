export type ExecutionStatus = 'passed' | 'failed' | 'blocked';

export interface ProjectExecutionRecord {
  id: string;
  projectId: number;
  name: string;
  status: ExecutionStatus;
  durationMs: number;
  tester: string;
}

export const PROJECT_EXECUTIONS: ProjectExecutionRecord[] = [
  {
    id: 'exec-101',
    projectId: 1,
    name: 'Login smoke test',
    status: 'passed',
    durationMs: 1260,
    tester: 'alice',
  },
  {
    id: 'exec-102',
    projectId: 1,
    name: 'Invoice generation regression',
    status: 'failed',
    durationMs: 4420,
    tester: 'bob',
  },
  {
    id: 'exec-103',
    projectId: 1,
    name: 'Authorization matrix',
    status: 'blocked',
    durationMs: 0,
    tester: 'carol',
  },
  {
    id: 'exec-201',
    projectId: 2,
    name: 'Landing page validation',
    status: 'passed',
    durationMs: 980,
    tester: 'dora',
  },
  {
    id: 'exec-202',
    projectId: 2,
    name: 'Profile update flow',
    status: 'passed',
    durationMs: 1680,
    tester: 'dora',
  },
  {
    id: 'exec-203',
    projectId: 2,
    name: 'Payment API fallback',
    status: 'failed',
    durationMs: 5210,
    tester: 'eric',
  },
];
