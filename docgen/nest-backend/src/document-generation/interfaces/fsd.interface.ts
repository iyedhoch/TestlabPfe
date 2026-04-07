export interface FsdMetadata {
  title: string;
  projectName: string;
  clientName: string;
  version: string;
  date: string;
  author: string;
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
  metadata: FsdMetadata;
  introduction: FsdIntroduction;
  overallDescription: FsdOverallDescription;
  functionalRequirements: FsdFunctionalRequirement[];
  nonFunctionalRequirements: FsdNonFunctionalRequirements;
  systemFeatures: FsdSystemFeature[];
  externalInterfaces?: FsdExternalInterfaces;
  approvals: FsdApproval[];
}
