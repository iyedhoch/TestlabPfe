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
  acceptanceCriteria?: string[];
  acceptanceCriteriaDetails?: FsdAcceptanceCriterion[];
  reglesDeGestion?: string[];
  gestion?: Array<{
    action: string;
    integration: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    caption?: string;
    figureNumber?: string;
    figureTitle?: string;
  }>;
}

export interface FsdFeature {
  id: string;
  title: string;
  description: string;
  userStories: FsdUserStory[];
}

export interface FsdEpic {
  id: string;
  title: string;
  description: string;
  features: FsdFeature[];
}

export interface FsdSystemFeature {
  name: string;
  description: string;
  userStories: FsdUserStory[];
}

export interface FsdReferenceDocument {
  name: string;
  type: string;
  attachment: string;
}

export interface FsdGlossaryEntry {
  term: string;
  comment: string;
}

export interface FsdRevisionEntry {
  date: string;
  version: string;
  status: string;
  author: string;
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

export interface FsdDashboardScreenshot {
  url: string;
  altText?: string;
  caption?: string;
}

export interface FsdFigure {
  figureNumber: string;
  figureTitle: string;
}

export interface FsdNavigationItem {
  label: string;
  targetPage: string;
  type: string;
  accessRoles: string;
}

export interface FsdFunctionalModule {
  title: string;
  description: string;
}

export interface FsdBusinessRule {
  id: string;
  title: string;
  description: string;
  source?: string;
  priority?: string;
}

export type FsdAcceptanceStatus = 'pass' | 'fail' | 'open';

export interface FsdAcceptanceCriterion {
  id: string;
  userStory: string;
  criterionDescription: string;
  given: string;
  when: string;
  then: string;
  status: FsdAcceptanceStatus;
}

export interface FsdDocument {
  metadata: FsdMetadata;
  editValues?: Record<string, string>;
  richEditValues?: Record<string, string>;
  sectionBackgroundValues?: Record<string, string>;
  pageStyle?: {
    backgroundColor?: string;
  };
  introduction: FsdIntroduction;
  overallDescription: FsdOverallDescription;
  projectOverview?: string;
  methodology?: string;
  glossary?: FsdGlossaryEntry[];
  revisions?: FsdRevisionEntry[];
  functionalRequirements: FsdFunctionalRequirement[];
  nonFunctionalRequirements: FsdNonFunctionalRequirements;
  systemFeatures: FsdSystemFeature[];
  epics?: FsdEpic[];
  externalInterfaces?: FsdExternalInterfaces;
  approvals: FsdApproval[];
  referenceDocuments?: FsdReferenceDocument[];
  dashboardScreenshots?: FsdDashboardScreenshot[];
  navigationItems?: FsdNavigationItem[];
  functionalDescription?: string;
  functionalModules?: FsdFunctionalModule[];
  businessRules?: FsdBusinessRule[];
  acceptanceCriteria?: FsdAcceptanceCriterion[];
  figures?: FsdFigure[];
}
