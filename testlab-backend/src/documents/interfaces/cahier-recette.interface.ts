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
  openDefects?: number;
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
  approverName?: string;
  approverRole?: string;
  approvalDate?: string;
}

export interface CahierRecetteDocument {
  metadata: Metadata;
  editValues?: Record<string, string>;
  richEditValues?: Record<string, string>;
  sectionBackgroundValues?: Record<string, string>;
  pageStyle?: {
    backgroundColor?: string;
  };
  context: Context;
  project: ProjectInfo;
  suites: Suite[];
  approvals: Approval[];
}
