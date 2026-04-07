import type { FsdDocument } from '../document-generation/interfaces/fsd.interface';

export const FSD_DOCUMENT: FsdDocument = {
  metadata: {
    title: 'Functional Specification Document - Insurance Contract Lifecycle Platform',
    projectName: 'Insurance Contract Lifecycle Platform',
    clientName: 'Mutuelle Horizon Assurances',
    version: '1.0',
    date: '2026-03-27',
    author: 'Business Analysis and Product Engineering Team',
  },
  introduction: {
    purpose:
      'This document defines the functional scope, expected behaviors, and acceptance baseline for the insurance contract lifecycle platform used by underwriting, operations, and customer support teams.',
    scope:
      'The scope includes quote creation, underwriting validation, policy issuance, endorsement lifecycle, claims initiation checkpoints, and integration touchpoints with policy and pricing APIs.',
    definitions: [
      {
        term: 'Policy',
        definition:
          'A legally binding insurance contract issued after underwriting validation and premium confirmation.',
      },
      {
        term: 'Endorsement',
        definition:
          'A mid-term policy change that updates contract terms, guarantees, or insured information.',
      },
      {
        term: 'Risk Score',
        definition:
          'A computed indicator used by underwriting rules to assess application eligibility and pricing adjustments.',
      },
    ],
  },
  overallDescription: {
    productPerspective:
      'The platform is a central orchestration layer over existing insurer systems, exposing guided workflows for commercial teams while enforcing underwriting controls from core back-office systems.',
    userClasses:
      'Primary users are sales advisors, underwriting analysts, contract operations managers, and customer support specialists. Secondary users include compliance officers and audit stakeholders.',
    assumptions:
      'Pricing API, customer profile service, and policy administration API are available during business hours. User authentication is managed by the enterprise identity provider.',
  },
  functionalRequirements: [
    {
      id: 'FR-001',
      title: 'Create Motor Insurance Quote',
      description:
        'The system shall allow a sales advisor to create a motor insurance quote by capturing customer, vehicle, and coverage details, then storing the quote in draft status.',
      priority: 'Critical',
      relatedUserStory: 'US-QUO-01',
    },
    {
      id: 'FR-002',
      title: 'Calculate Premium and Taxes',
      description:
        'The system shall calculate annual premium, fees, and taxes based on selected guarantees and risk factors returned by the pricing service.',
      priority: 'Critical',
      relatedUserStory: 'US-PRI-03',
    },
    {
      id: 'FR-003',
      title: 'Enforce Underwriting Eligibility Rules',
      description:
        'The system shall evaluate underwriting rules and block policy issuance when mandatory eligibility conditions are not met.',
      priority: 'High',
      relatedUserStory: 'US-UW-07',
    },
    {
      id: 'FR-004',
      title: 'Issue Policy and Generate Contract Pack',
      description:
        'The system shall issue a policy from an approved quote and generate contract documents including schedule, conditions, and payment plan summary.',
      priority: 'Critical',
      relatedUserStory: 'US-POL-02',
    },
    {
      id: 'FR-005',
      title: 'Submit Mid-Term Endorsement Request',
      description:
        'The system shall allow contract managers to request and validate endorsements with effective date control and automatic premium recalculation.',
      priority: 'High',
      relatedUserStory: 'US-END-05',
    },
  ],
  nonFunctionalRequirements: {
    performance:
      'For 95% of quote simulations, premium calculation response time shall be below 2 seconds under normal operating load.',
    security:
      'All user actions related to quote validation, issuance, and endorsements shall be authenticated, role-authorized, and audit-trailed.',
    usability:
      'Primary quote workflows shall be executable in fewer than 8 screens with contextual validation messages and clear completion status.',
  },
  systemFeatures: [
    {
      name: 'Quote Management',
      description:
        'Supports quote lifecycle from draft to validated proposal with complete pricing and eligibility checks.',
      userStories: [
        {
          id: 'US-QUO-01',
          title: 'Create quote draft',
          description:
            'As a sales advisor, I want to create a draft quote so that I can save and resume customer onboarding later.',
        },
        {
          id: 'US-PRI-03',
          title: 'View detailed premium breakdown',
          description:
            'As a sales advisor, I want to see premium components so that I can explain contract pricing to the customer.',
        },
      ],
    },
    {
      name: 'Policy Issuance and Document Pack',
      description:
        'Transforms approved quotes into active policies and generates mandatory contractual documents.',
      userStories: [
        {
          id: 'US-POL-02',
          title: 'Issue policy after validation',
          description:
            'As an underwriting analyst, I want to issue the policy after checks pass so that coverage can start immediately.',
        },
      ],
    },
    {
      name: 'Endorsement Workflow',
      description:
        'Handles policy updates with effective date governance and downstream financial adjustments.',
      userStories: [
        {
          id: 'US-END-05',
          title: 'Request endorsement with controls',
          description:
            'As a contract manager, I want guided endorsement rules so that contractual changes stay compliant.',
        },
      ],
    },
  ],
  externalInterfaces: {
    userInterface:
      'Web portal with responsive workflows for quote creation, policy issuance, and endorsement handling for operational teams.',
    apiInterfaces:
      'REST APIs integrated with customer profile service, pricing engine, underwriting rules service, policy administration system, and document archive API.',
  },
  approvals: [
    {
      name: 'Nadia El Mansouri',
      role: 'Product Owner - Insurance Platforms',
      date: '2026-03-27',
    },
    {
      name: 'Thomas Leroy',
      role: 'Head of Underwriting Operations',
      date: '2026-03-27',
    },
  ],
};
