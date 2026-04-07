//? test suites api payloads
export interface IGetTestSuitesPayload {
  projectId: string;
}
export interface ICreateTestSuitePayload {
  name: string;
  projectId: string;
  parentId?: string;
}

export interface IUpdateTestSuitePayload {
  id: string;
  name: string;
}

export interface IReorderTestSuites {
  projectId: string;
  suites: Pick<ITestSuite, "id" | "order">[];
}

export interface IMoveTestSuitePayload {
  suiteId: string;
  destinationSuiteId: string;
}

//? test cases api payloads
export interface ICreateTestCasePayload {
  name: string;
  summary: string;
  testSuiteId: string;
  preconditions: {
    content: string;
    order: number;
  }[];
  testSteps: {
    action: string;
    expectedResult: string;
    order: number;
  }[];
}
export interface IUpdateTestCasePayload {
  id: string;
  name: string;
  summary: string;
}

export interface IMoveTestCasePayload {
  testCaseId: string;
  destinationSuiteId: string;
}

//? test steps api payloads
export interface IUpdateTestStepPayload {
  id: string;
  action: string;
  expectedResult: string;
}

export interface IReorderTestStepsPayload {
  testCaseId: string;
  steps: Pick<ITestStep, "id" | "order">[];
}

export interface ICreateTestStepPayload {
  testCaseId: string;
  action: string;
  expectedResult: string;
  insertAfterOrder: number;
}

//? preconditions api payloads

export interface IUpdatePreconditionPayload {
  id: string;
  content: string;
}

//? test generation models
export interface IPrecondition {
  id: string;
  content: string;
  order: number;
  testCaseId: string;
}

export interface ITestStep {
  id: string;
  action: string;
  expectedResult: string;
  order: number;
  testCaseId: string;
}

export interface ITestCase {
  id: string;
  name: string;
  summary: string;
  testSuiteId: string;
  testSteps: any[];
  preconditions: IPrecondition[];
}

export interface ITestSuite {
  id: string;
  name: string;
  projectId: string;
  order: number;
  testCases: ITestCase[];
  children: ITestSuite[];
}
