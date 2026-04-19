export interface FsdSelectionEpicDto {
  id: string;
  name: string;
  featureCount: number;
  userStoryCount: number;
  features: FsdSelectionFeatureDto[];
}

export interface FsdSelectionFeatureDto {
  id: string;
  name: string;
  userStoryCount: number;
  userStories: FsdSelectionUserStoryDto[];
}

export interface FsdSelectionUserStoryDto {
  id: string;
  name: string;
}

export interface CahierSelectionSuiteDto {
  id: string;
  name: string;
  order: number;
  parentId: string | null;
  testCaseCount: number;
  childSuiteCount: number;
  testCases: CahierSelectionTestCaseDto[];
}

export interface CahierSelectionTestCaseDto {
  id: string;
  name: string;
}
