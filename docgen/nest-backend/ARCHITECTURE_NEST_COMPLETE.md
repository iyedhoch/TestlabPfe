**Part 1 - Project Overview**

This NestJS backend is a document generation API for project QA and specification artifacts. It exposes endpoints that let a client:
1. List project documents.
2. Generate output files in HTML, PDF, Word, Word Template, and Excel.
3. Manage template activation.
4. Track generated document versions per user.

Main purpose:
1. Centralize generation of formal project documentation from a normalized model.
2. Produce delivery-ready artifacts for validation and reporting workflows.
3. Keep generation logic modular and format-specific.

Problems it solves:
1. Standardizes output from one data model to multiple export formats.
2. Separates concerns by module (project access, generation, versioning, templates, auth).
3. Provides selectable template behavior (show/hide sections, active template selection).
4. Tracks generated outputs as version records with metadata snapshots.

Document types generated:
1. Cahier de Recette:
- HTML, PDF, Word (HTML pipeline), Word (template pipeline), Excel.
2. FSD (Functional Specification Document):
- PDF, Word (HTML pipeline), Word (template pipeline).

Technologies used and where:
1. NestJS modules/controllers/services: overall API architecture.
2. Handlebars + hbs:
- hbs configured in bootstrap at [nest-backend/src/main.ts](nest-backend/src/main.ts).
- handlebars compilation/rendering in [nest-backend/src/document-generation/generators/html.generator.ts](nest-backend/src/document-generation/generators/html.generator.ts).
3. Puppeteer:
- HTML to PDF in [nest-backend/src/document-generation/generators/pdf.generator.ts](nest-backend/src/document-generation/generators/pdf.generator.ts).
4. html-to-docx:
- HTML to DOCX in [nest-backend/src/document-generation/generators/word.generator.ts](nest-backend/src/document-generation/generators/word.generator.ts).
5. easy-template-x:
- DOCX template injection in [nest-backend/src/document-generation/generators/word-template.generator.ts](nest-backend/src/document-generation/generators/word-template.generator.ts).
6. exceljs:
- XLSX workbook creation in [nest-backend/src/document-generation/generators/excel.generator.ts](nest-backend/src/document-generation/generators/excel.generator.ts).
7. docx library:
- Present in dependencies in [nest-backend/package.json](nest-backend/package.json), but not directly used in current Nest source.

---

**Part 2 - Folder Structure Explanation (src)**

### Folder: src root
Purpose:
- Application bootstrap and module composition.

Key responsibilities:
- Start Nest app.
- Register global date helper.
- Compose feature modules.

Used by:
- Runtime startup.

Depends on:
- Feature modules and Nest platform.

Files:
1. [nest-backend/src/main.ts](nest-backend/src/main.ts)
- What it does: boots NestExpressApplication, registers formatDate helper with hbs, sets views dir and engine.
- Why it exists: app entrypoint and global rendering setup.
- Who calls it: Node runtime via Nest start command.
- Returns: no business return; starts HTTP server on port 3000.
2. [nest-backend/src/app.module.ts](nest-backend/src/app.module.ts)
- What it does: root module imports Auth, ProjectDocument, DocumentVersion, TemplateConfig modules.
- Why it exists: composition root.
- Who calls it: Nest bootstrap process.
- Returns: module metadata class.
3. [nest-backend/src/app.controller.spec.ts](nest-backend/src/app.controller.spec.ts)
- What it does: legacy unit test for AppController/AppService.
- Why it exists: starter scaffold artifact.
- Who calls it: Jest test runner.
- Returns: test assertions.
- Important note: references non-existent AppController/AppService in this codebase state.

---

### Folder: auth
Purpose:
- Authentication/identity scaffolding.

Key responsibilities:
- Login/register endpoints.
- Fake header-based user resolution.
- Global guard enforcement.
- Public route decorator.

Used by:
- All protected endpoints through global guard.

Depends on:
- Mock users data.

Files:
1. [nest-backend/src/auth/auth.module.ts](nest-backend/src/auth/auth.module.ts)
- Does: registers AuthController/AuthService and global APP_GUARD with FakeAuthGuard.
- Why: central auth wiring.
- Called by: AppModule.
- Returns: module definition.
2. [nest-backend/src/auth/auth.controller.ts](nest-backend/src/auth/auth.controller.ts)
- Does: exposes POST login and POST register.
- Why: identity operations for consumers.
- Called by: HTTP clients.
- Returns: sanitized user payload and message.
3. [nest-backend/src/auth/auth.service.ts](nest-backend/src/auth/auth.service.ts)
- Does: validates credentials, registers users, validates userId, sanitizes user object.
- Why: business logic for auth.
- Called by: AuthController and FakeAuthGuard.
- Returns: user objects or registration response.
4. [nest-backend/src/auth/guards/fake-auth.guard.ts](nest-backend/src/auth/guards/fake-auth.guard.ts)
- Does: enforces x-user-id for non-public routes; sets request.user.
- Why: temporary security layer before JWT.
- Called by: Nest guard pipeline globally.
- Returns: boolean activation or throws Unauthorized.
5. [nest-backend/src/auth/decorators/public.decorator.ts](nest-backend/src/auth/decorators/public.decorator.ts)
- Does: defines Public decorator via metadata.
- Why: route-level bypass of guard.
- Called by: AuthController methods.
- Returns: metadata decorator.

---

### Folder: common
Purpose:
- Reserved cross-cutting area.

Key responsibilities:
- Future shared exceptions and filters.

Used by:
- Not used yet.

Depends on:
- None currently.

Files:
1. [nest-backend/src/common/exceptions/README.md](nest-backend/src/common/exceptions/README.md)
- Placeholder for custom exceptions.
2. [nest-backend/src/common/filters/README.md](nest-backend/src/common/filters/README.md)
- Placeholder for global/shared filters.

---

### Folder: document-generation
Purpose:
- Core orchestration for building and exporting documents.

Key responsibilities:
- Validate input.
- Build document model from project + templates + mock source.
- Route to format generators.
- Save version metadata snapshot for each generation.

Used by:
- ProjectDocumentService.

Depends on:
- TemplateConfigService, DocumentVersionService, mock data, generator classes.

Files:
1. [nest-backend/src/document-generation/document-generation.module.ts](nest-backend/src/document-generation/document-generation.module.ts)
- Does: wires generation services/generators.
- Why: modular dependency container for generation.
- Called by: ProjectDocumentModule.
- Returns: module exporting DocumentGenerationService.
2. [nest-backend/src/document-generation/document-generation.service.ts](nest-backend/src/document-generation/document-generation.service.ts)
- Does: generation entry methods:
- generateHtmlDocument
- generatePdfDocument
- generateWordDocument
- generateExcelDocument
- generateWordFromTemplate
- Why: central orchestration and version persistence.
- Called by: ProjectDocumentService.
- Returns: string for HTML, Buffer promises for binary formats.
3. [nest-backend/src/document-generation/filters/document-filter.service.ts](nest-backend/src/document-generation/filters/document-filter.service.ts)
- Does: applyTemplateFilters, currently failedOnly filter over execution rows.
- Why: support template-driven dataset filtering.
- Called by: currently not called in active orchestration.
- Returns: filtered execution list.
4. [nest-backend/src/document-generation/statistics/statistics.service.ts](nest-backend/src/document-generation/statistics/statistics.service.ts)
- Does: compute totals, pass rate, average duration from executions.
- Why: future reporting statistics.
- Called by: currently not called in active orchestration.
- Returns: ExecutionStatistics object.
5. [nest-backend/src/document-generation/generators/html.generator.ts](nest-backend/src/document-generation/generators/html.generator.ts)
- Does: loads/compiles Handlebars templates (cahier/fsd, normal/debug), registers helpers, normalizes/sorts cahier suites/cases/steps, resolves logo paths.
- Why: canonical renderer feeding HTML output and downstream PDF/Word HTML pipelines.
- Called by: DocumentGenerationService and WordGenerator.
- Returns: rendered HTML string.
6. [nest-backend/src/document-generation/generators/pdf.generator.ts](nest-backend/src/document-generation/generators/pdf.generator.ts)
- Does: launches Puppeteer, renders HTML page, exports A4 PDF with margins.
- Why: HTML-to-PDF conversion.
- Called by: DocumentGenerationService.
- Returns: PDF Buffer.
7. [nest-backend/src/document-generation/generators/word.generator.ts](nest-backend/src/document-generation/generators/word.generator.ts)
- Does: converts rendered HTML to DOCX via html-to-docx.
- Why: Word export without DOCX template.
- Called by: DocumentGenerationService.
- Returns: DOCX Buffer.
8. [nest-backend/src/document-generation/generators/word-template.generator.ts](nest-backend/src/document-generation/generators/word-template.generator.ts)
- Does: loads DOCX template file and injects mapped data via easy-template-x.
- Why: template-based DOCX generation.
- Called by: DocumentGenerationService.
- Returns: DOCX Buffer.
9. [nest-backend/src/document-generation/generators/excel.generator.ts](nest-backend/src/document-generation/generators/excel.generator.ts)
- Does: flattens suite hierarchy and writes tabular test steps to XLSX.
- Why: spreadsheet export for cahier test assets.
- Called by: DocumentGenerationService.
- Returns: XLSX Buffer.
10. [nest-backend/src/document-generation/interfaces/document-generator.interface.ts](nest-backend/src/document-generation/interfaces/document-generator.interface.ts)
- Does: contract for generation service methods.
- Why: explicit interface boundary.
- Called by: implemented by DocumentGenerationService.
- Returns: type contract only.
11. [nest-backend/src/document-generation/interfaces/document-model.interface.ts](nest-backend/src/document-generation/interfaces/document-model.interface.ts)
- Does: defines SupportedDocumentType, template snapshot, union document model.
- Why: normalized model contract across generators.
- Called by: generation service and generators.
- Returns: types/interfaces.
12. [nest-backend/src/document-generation/interfaces/cahier-recette.interface.ts](nest-backend/src/document-generation/interfaces/cahier-recette.interface.ts)
- Does: cahier domain interfaces (metadata, suites, testcases, approvals).
- Why: strong typing for cahier data.
- Called by: model definitions, generators, mock data.
- Returns: interfaces.
13. [nest-backend/src/document-generation/interfaces/fsd.interface.ts](nest-backend/src/document-generation/interfaces/fsd.interface.ts)
- Does: FSD domain interfaces.
- Why: strong typing for FSD data.
- Called by: model definitions and mock data.
- Returns: interfaces.

---

### Folder: document-version
Purpose:
- Generated document version lifecycle.

Key responsibilities:
- Create version metadata records when generation occurs.
- List versions per project/user.
- Download mock file.
- Compare and restore mocked versions with ownership checks.

Used by:
- DocumentGenerationService and direct version endpoints.

Depends on:
- Mock document version data.

Files:
1. [nest-backend/src/document-version/document-version.module.ts](nest-backend/src/document-version/document-version.module.ts)
- Does: registers controller/service and exports service.
- Why: isolated versioning feature module.
- Called by: AppModule and DocumentGenerationModule import.
- Returns: module definition.
2. [nest-backend/src/document-version/document-version.controller.ts](nest-backend/src/document-version/document-version.controller.ts)
- Does: exposes download/compare/restore/list endpoints.
- Why: HTTP interface for version management.
- Called by: HTTP clients.
- Returns: Buffer, DTOs, and restore response object.
3. [nest-backend/src/document-version/document-version.service.ts](nest-backend/src/document-version/document-version.service.ts)
- Does: createGeneratedVersion, getVersions, downloadVersion, compareVersions, restoreVersion, ownership validation.
- Why: version business rules.
- Called by: DocumentGenerationService and DocumentVersionController.
- Returns: DTOs, buffers, restore response.
4. [nest-backend/src/document-version/dto/document-version.dto.ts](nest-backend/src/document-version/dto/document-version.dto.ts)
- Does: response DTO for version listing.
- Why: stable API output shape.
- Called by: DocumentVersionService.
- Returns: DTO instances.
5. [nest-backend/src/document-version/dto/version-diff.dto.ts](nest-backend/src/document-version/dto/version-diff.dto.ts)
- Does: response DTO for compare result.
- Why: encapsulate diff payload.
- Called by: DocumentVersionService.
- Returns: DTO instances.

---

### Folder: mock-data
Purpose:
- In-memory source of users, projects, templates, versions, and document content.

Key responsibilities:
- Hold static data for all current features before real integrations.

Used by:
- Auth, TemplateConfig, ProjectDocument, DocumentGeneration, DocumentVersion services.

Depends on:
- Interfaces from document-generation.

Files:
1. [nest-backend/src/mock-data/users.data.ts](nest-backend/src/mock-data/users.data.ts)
- Does: MockUser interface + USERS array.
- Why: fake auth identity store.
- Called by: AuthService.
- Returns: in-memory users.
2. [nest-backend/src/mock-data/project-documents.data.ts](nest-backend/src/mock-data/project-documents.data.ts)
- Does: ProjectDocumentRecord + PROJECT_DOCUMENTS.
- Why: available project docs for generation.
- Called by: ProjectDocumentService and DocumentGenerationService.
- Returns: in-memory project metadata.
3. [nest-backend/src/mock-data/template-configs.data.ts](nest-backend/src/mock-data/template-configs.data.ts)
- Does: TemplateConfigRecord + TEMPLATE_CONFIGS (default/compact/failure-focus).
- Why: template behavior flags and active template.
- Called by: TemplateConfigService and DocumentGenerationService snapshot conversion.
- Returns: in-memory template configurations.
4. [nest-backend/src/mock-data/document-versions.data.ts](nest-backend/src/mock-data/document-versions.data.ts)
- Does: DocumentVersionRecord/Metadata + initial version entries.
- Why: persist mock version history.
- Called by: DocumentVersionService.
- Returns: in-memory version records.
5. [nest-backend/src/mock-data/project-executions.data.ts](nest-backend/src/mock-data/project-executions.data.ts)
- Does: execution model and sample execution rows.
- Why: planned filter/statistics pipeline.
- Called by: currently not wired into active generation.
- Returns: execution fixtures.
6. [nest-backend/src/mock-data/cahier-recette.data.ts](nest-backend/src/mock-data/cahier-recette.data.ts)
- Does: CAHIER_RECETTE_DOCUMENT hierarchical suite/testcase/step content.
- Why: base cahier source dataset.
- Called by: DocumentGenerationService buildCahierDocumentModel.
- Returns: typed cahier document object.
7. [nest-backend/src/mock-data/fsd.data.ts](nest-backend/src/mock-data/fsd.data.ts)
- Does: FSD_DOCUMENT specification content.
- Why: base FSD source dataset.
- Called by: DocumentGenerationService buildFsdDocumentModel.
- Returns: typed FSD object.

---

### Folder: project-document
Purpose:
- Public document-generation API facade per project.

Key responsibilities:
- Validate project existence.
- Expose generation endpoints.
- Delegate generation to DocumentGenerationService.

Used by:
- Frontend/API clients.

Depends on:
- DocumentGenerationModule and mock project list.

Files:
1. [nest-backend/src/project-document/project-document.module.ts](nest-backend/src/project-document/project-document.module.ts)
- Does: wires controller/service and imports generation module.
- Why: feature boundary.
- Called by: AppModule.
- Returns: module definition.
2. [nest-backend/src/project-document/project-document.controller.ts](nest-backend/src/project-document/project-document.controller.ts)
- Does: endpoints for list/detail/html/pdf/word/excel/word-template and document type normalization.
- Why: HTTP contract for project docs.
- Called by: HTTP clients.
- Returns: DTOs, HTML string, StreamableFile wrappers.
3. [nest-backend/src/project-document/project-document.service.ts](nest-backend/src/project-document/project-document.service.ts)
- Does: project lookup/validation and delegation to generation methods.
- Why: service-layer orchestration and error handling.
- Called by: ProjectDocumentController.
- Returns: DTOs and generated buffers/string.
4. [nest-backend/src/project-document/dto/project-document.dto.ts](nest-backend/src/project-document/dto/project-document.dto.ts)
- Does: project summary DTO.
- Why: stable output for list/detail endpoints.
- Called by: ProjectDocumentService.
- Returns: DTO instances.

---

### Folder: template-config
Purpose:
- Runtime template selection and activation.

Key responsibilities:
- Return template list.
- Resolve active template or explicit template.
- Activate template by id.

Used by:
- Generation service and template management endpoints.

Depends on:
- Mock template configurations.

Files:
1. [nest-backend/src/template-config/template-config.module.ts](nest-backend/src/template-config/template-config.module.ts)
- Does: wires template controller/service and exports service.
- Why: shared template service across modules.
- Called by: AppModule and DocumentGenerationModule.
- Returns: module definition.
2. [nest-backend/src/template-config/template-config.controller.ts](nest-backend/src/template-config/template-config.controller.ts)
- Does: template list/active/activate endpoints.
- Why: HTTP template administration.
- Called by: HTTP clients.
- Returns: template records.
3. [nest-backend/src/template-config/template-config.service.ts](nest-backend/src/template-config/template-config.service.ts)
- Does: find active template, resolve by preferred id, activate one template, validations.
- Why: template business logic and state mutation.
- Called by: TemplateConfigController and DocumentGenerationService.
- Returns: template records.

---

**Part 3 - Data Models / Entities**

### A) Cahier de Recette models

Source: [nest-backend/src/document-generation/interfaces/cahier-recette.interface.ts](nest-backend/src/document-generation/interfaces/cahier-recette.interface.ts)

1. Metadata
- title: string - document title.
- clientName: string - client/organization name.
- author: string - document author.
- version: string - document revision.
- date: string - document date.
- companyLogo: string optional - logo path/url.
- clientLogo: string optional - client logo path/url.
- Used in: CahierDocumentModel metadata and template rendering.

2. Context
- description: string - background/description.
- objective: string - document objective.
- Used in: context section of cahier templates.

3. ProjectInfo
- id: number - project id.
- name: string - project/product name.
- owner: string - owning team/person.
- Used in: cover/info sections.

4. Precondition
- content: string - precondition text.
- order: number - ordering.
- Used in: test case preconditions list.

5. Step
- order: number - execution order.
- action: string - step action.
- expectedResult: string - expected result.
- Used in: step table in templates and Excel rows.

6. TestCase
- id: string - internal testcase id.
- code: string - business testcase code.
- name: string - testcase title.
- summary: string - testcase summary.
- preconditions: Precondition[] - ordered preconditions.
- steps: Step[] - ordered steps.
- Used in: suite rendering and Excel generation.

7. Suite
- id: string - suite id.
- name: string - suite label.
- order: number optional - suite ordering priority.
- children: Suite[] - nested suites.
- testCases: TestCase[] - cases directly under suite.
- Used in: recursive rendering and flattening.

8. Approval
- name: string - approver name.
- role: string - approver role.
- date: string - approval date.
- Used in: approvals section.

9. CahierRecetteDocument
- metadata, context, project, suites, approvals.
- Used in: [nest-backend/src/mock-data/cahier-recette.data.ts](nest-backend/src/mock-data/cahier-recette.data.ts) and model building.

### B) FSD models

Source: [nest-backend/src/document-generation/interfaces/fsd.interface.ts](nest-backend/src/document-generation/interfaces/fsd.interface.ts)

1. FsdMetadata
- title: string
- projectName: string
- clientName: string
- version: string
- date: string
- author: string
- Purpose: cover/document control identity.

2. FsdDefinition
- term: string
- definition: string
- Purpose: glossary.

3. FsdIntroduction
- purpose: string
- scope: string
- definitions: FsdDefinition[] optional
- Purpose: intro section.

4. FsdOverallDescription
- productPerspective: string
- userClasses: string
- assumptions: string
- Purpose: high-level product behavior context.

5. FsdRequirementPriority
- union type: Critical | High | Medium | Low
- Purpose: priority classification.

6. FsdFunctionalRequirement
- id: string
- title: string
- description: string
- priority: FsdRequirementPriority
- relatedUserStory: string optional
- Purpose: functional requirements list.

7. FsdNonFunctionalRequirements
- performance: string
- security: string
- usability: string
- Purpose: NFR section.

8. FsdUserStory
- id: string
- title: string
- description: string
- Purpose: per-feature story references.

9. FsdSystemFeature
- name: string
- description: string
- userStories: FsdUserStory[]
- Purpose: feature breakdown.

10. FsdExternalInterfaces
- userInterface: string
- apiInterfaces: string
- Purpose: interface section.

11. FsdApproval
- name: string
- role: string
- date: string
- Purpose: approvals sign-off.

12. FsdDocument
- metadata, introduction, overallDescription, functionalRequirements, nonFunctionalRequirements, systemFeatures, externalInterfaces optional, approvals.
- Used in: [nest-backend/src/mock-data/fsd.data.ts](nest-backend/src/mock-data/fsd.data.ts) and model building.

### C) Shared models

Source: [nest-backend/src/document-generation/interfaces/document-model.interface.ts](nest-backend/src/document-generation/interfaces/document-model.interface.ts)

1. SupportedDocumentType
- type union: cahier | fsd
- Used in: controller query normalization and generator dispatch.

2. DocumentTemplateSnapshot
- id: string
- name: string
- title: string
- footer: string
- showStatistics: boolean
- showExecutions: boolean
- showPreconditions: boolean
- showSteps: boolean
- showApprovals: boolean
- showContext: boolean
- failedOnly: boolean
- Purpose: freeze template config into generated version and template render.
- Built in: toTemplateSnapshot in generation service.

3. CahierDocumentModel
- metadata: Metadata
- context: Context
- project: ProjectInfo
- suites: Suite[]
- approvals: Approval[]
- template: DocumentTemplateSnapshot

4. FsdDocumentModel
- extends FsdDocument + template snapshot.

5. DocumentModel
- union of CahierDocumentModel and FsdDocumentModel.

Source: [nest-backend/src/document-generation/interfaces/document-generator.interface.ts](nest-backend/src/document-generation/interfaces/document-generator.interface.ts)

6. DocumentGenerator interface methods
- generateHtmlDocument
- generatePdfDocument
- generateWordDocument
- generateExcelDocument
- Purpose: service contract.

### D) DTOs

1. ProjectDocumentDto from [nest-backend/src/project-document/dto/project-document.dto.ts](nest-backend/src/project-document/dto/project-document.dto.ts)
- id: number
- projectName: string
- owner: string
- Used by: list/detail project endpoints.

2. DocumentVersionDto from [nest-backend/src/document-version/dto/document-version.dto.ts](nest-backend/src/document-version/dto/document-version.dto.ts)
- id: number
- projectId: number
- version: number
- createdAt: string
- author: string
- summary: string
- Used by: version list/restore responses and creation output.

3. VersionDiffDto from [nest-backend/src/document-version/dto/version-diff.dto.ts](nest-backend/src/document-version/dto/version-diff.dto.ts)
- version1: number
- version2: number
- changes: string[]
- Used by: compare endpoint.

### E) Mock data structures

1. MockUser from [nest-backend/src/mock-data/users.data.ts](nest-backend/src/mock-data/users.data.ts)
- id, username, password, role optional.
- Used by: AuthService and FakeAuthGuard.

2. ProjectDocumentRecord from [nest-backend/src/mock-data/project-documents.data.ts](nest-backend/src/mock-data/project-documents.data.ts)
- id, projectName, owner, formats: string[], status: draft|published.
- Used by: ProjectDocumentService and GenerationService validation/building.

3. TemplateConfigRecord from [nest-backend/src/mock-data/template-configs.data.ts](nest-backend/src/mock-data/template-configs.data.ts)
- id, name, title, footer, showStatistics, showExecutions, showPreconditions, showSteps, showApprovals, showContext, failedOnly, active.
- Used by: TemplateConfigService and model snapshot conversion.

4. ExecutionStatus and ProjectExecutionRecord from [nest-backend/src/mock-data/project-executions.data.ts](nest-backend/src/mock-data/project-executions.data.ts)
- id, projectId, name, status, durationMs, tester.
- Used by: StatisticsService and DocumentFilterService (currently not wired in flow).

5. DocumentVersionMetadata and DocumentVersionRecord from [nest-backend/src/mock-data/document-versions.data.ts](nest-backend/src/mock-data/document-versions.data.ts)
- metadata fields include documentType, createdAt, author, summary, generatedFormat optional, generatedContent optional, templateSnapshot optional.
- record fields include id, projectId, version, userId, fileName, metadata.
- Used by: DocumentVersionService as mutable in-memory version store.

6. CAHIER_RECETTE_DOCUMENT and FSD_DOCUMENT constants
- Typed by CahierRecetteDocument and FsdDocument.
- Used by: model construction in generation service.

---

**Part 4 - Document Generation Pipelines (Critical)**

General entrypoint for all generation routes:
- Controller: [nest-backend/src/project-document/project-document.controller.ts](nest-backend/src/project-document/project-document.controller.ts)
- Service: [nest-backend/src/project-document/project-document.service.ts](nest-backend/src/project-document/project-document.service.ts)
- Core orchestration: [nest-backend/src/document-generation/document-generation.service.ts](nest-backend/src/document-generation/document-generation.service.ts)

### 1) Cahier de Recette -> PDF

API Call:
- GET /api/project-documents/:id/document/pdf
- Optional query: template, mode
- Optional query type defaults to cahier if omitted

Flow:
1. Controller method getProjectDocumentPdf normalizes type with normalizeDocumentType.
2. Controller calls ProjectDocumentService.getProjectDocumentPdf.
3. Service validates project id existence via findProjectDocumentOrThrow.
4. Service delegates to DocumentGenerationService.generatePdfDocument.
5. generatePdfDocument validates inputs and calls buildDocumentModel with documentType=cahier.
6. buildDocumentModel uses:
- project metadata from [nest-backend/src/mock-data/project-documents.data.ts](nest-backend/src/mock-data/project-documents.data.ts)
- template config from TemplateConfigService (active or query-selected)
- content from [nest-backend/src/mock-data/cahier-recette.data.ts](nest-backend/src/mock-data/cahier-recette.data.ts)
7. HtmlGenerator.generate selects template path:
- normal: [nest-backend/templates/pdf/cahier-recette.hbs](nest-backend/templates/pdf/cahier-recette.hbs)
- debug mode: [nest-backend/templates/pdf/cahier-recette-debug.hbs](nest-backend/templates/pdf/cahier-recette-debug.hbs)
8. HtmlGenerator normalizes/sorts suites and testcases, sorts preconditions and steps, resolves logos, applies helpers.
9. PdfGenerator.generateFromHtml converts HTML to PDF using Puppeteer.
10. DocumentVersionService.createGeneratedVersion stores version metadata with base64 content and template snapshot.
11. Controller returns StreamableFile with application/pdf and attachment filename cahier-recette.pdf.

Where mock data is injected:
- Build phase inside buildCahierDocumentModel.

Where template flags are applied:
- HBS conditionals in cahier template:
- template.showApprovals
- template.showContext
- template.showPreconditions
- template.showSteps

Where sorting/formatting happens:
- HtmlGenerator.mapSuite, mapTestCase, normalizeCahierModel.
- formatDate helper in HtmlGenerator and bootstrap.

---

### 2) Cahier de Recette -> Word (HTML pipeline)

API Call:
- GET /api/project-documents/:id/document/word
- Query type omitted or type=cahier

Flow:
1. Controller getProjectDocumentWord.
2. ProjectDocumentService.getProjectDocumentWord.
3. DocumentGenerationService.generateWordDocument.
4. buildDocumentModel for cahier (same source as PDF).
5. WordGenerator.generate calls HtmlGenerator.generate with cahier type.
6. html-to-docx transforms HTML into DOCX buffer.
7. Version created via DocumentVersionService with format=word.
8. StreamableFile response with DOCX content type and filename cahier-recette.docx.

Template used:
- same cahier Handlebars template selected by HtmlGenerator (non-debug mode for Word pipeline).

Transformation steps:
- Model -> Handlebars HTML -> html-to-docx -> Buffer.

---

### 3) Cahier de Recette -> Word (Template pipeline easy-template-x)

API Call:
- GET /api/project-documents/:id/document/word-template
- Query type omitted or type=cahier

Flow:
1. Controller getProjectDocumentWordTemplate.
2. ProjectDocumentService.getProjectDocumentWordTemplate.
3. DocumentGenerationService.generateWordFromTemplate.
4. buildDocumentModel for cahier.
5. WordTemplateGenerator.generate loads DOCX template:
- [nest-backend/templates/word/fsd-template.docx](nest-backend/templates/word/fsd-template.docx)
6. prepareTemplateData maps model into template data object.
7. easy-template-x TemplateHandler.process injects data into DOCX template.
8. Version saved as word format with filename project-{id}-template.docx.
9. StreamableFile returned with filename cahier-recette-template.docx.

Important technical limitation:
- Template file is FSD-oriented and generator always uses fsd-template.docx even for cahier.
- For cahier-specific structures, mapped fields can be empty or partially mismatched.

---

### 4) Cahier de Recette -> Excel

API Call:
- GET /api/project-documents/:id/document/excel
- Query template optional
- No type query; service enforces cahier-only

Flow:
1. Controller getProjectDocumentExcel.
2. ProjectDocumentService.getProjectDocumentExcel.
3. DocumentGenerationService.generateExcelDocument.
4. buildDocumentModel forced to cahier and guarded by isCahierModel.
5. ExcelGenerator.generate:
- create workbook and Test Cases sheet
- define columns
- flatten suite tree
- add one row per test step (or blank step row if no steps)
- auto-wrap and dynamic width
6. Output written via workbook.xlsx.writeBuffer.
7. Version metadata created with format=excel.
8. StreamableFile returned with filename cahier-recette.xlsx.

Template used:
- none file-based; generation is programmatic.

Sorting/formatting:
- flatten hierarchy in ExcelGenerator.flattenSuites.
- cell formatting, wrapText, widths in ExcelGenerator.

---

### 5) FSD -> PDF

API Call:
- GET /api/project-documents/:id/document/pdf?type=fsd
- Optional template and mode

Flow:
1. Controller normalizes query type to fsd.
2. ProjectDocumentService delegates to generatePdfDocument with fsd type.
3. Generation service builds FSD model from:
- [nest-backend/src/mock-data/fsd.data.ts](nest-backend/src/mock-data/fsd.data.ts)
- project metadata (owner/projectName override)
- template snapshot.
4. HtmlGenerator picks FSD template:
- normal: [nest-backend/templates/pdf/fsd/fsd.hbs](nest-backend/templates/pdf/fsd/fsd.hbs)
- debug mode: [nest-backend/templates/pdf/fsd/fsd-debug.hbs](nest-backend/templates/pdf/fsd/fsd-debug.hbs)
5. PdfGenerator converts HTML to PDF.
6. Version metadata saved with documentType FSD.
7. StreamableFile with filename functional-specification-document.pdf.

Template flags:
- fsd templates primarily rely on content sections; footer uses template.footer.
- no showPreconditions/showSteps semantics in FSD templates.

---

### 6) FSD -> Word (HTML pipeline)

API Call:
- GET /api/project-documents/:id/document/word?type=fsd

Flow:
1. Controller -> ProjectDocumentService -> DocumentGenerationService.generateWordDocument with fsd.
2. buildFsdDocumentModel composes FSD content + template snapshot.
3. WordGenerator renders FSD HTML via HtmlGenerator using fsd template.
4. html-to-docx produces DOCX.
5. Version metadata saved.
6. StreamableFile returned with filename functional-specification-document.docx.

Template used:
- [nest-backend/templates/pdf/fsd/fsd.hbs](nest-backend/templates/pdf/fsd/fsd.hbs) via HTML renderer.

---

### 7) FSD -> Word (Template pipeline)

API Call:
- GET /api/project-documents/:id/document/word-template?type=fsd

Flow:
1. Controller -> service -> DocumentGenerationService.generateWordFromTemplate.
2. buildFsdDocumentModel builds fsd model.
3. WordTemplateGenerator loads [nest-backend/templates/word/fsd-template.docx](nest-backend/templates/word/fsd-template.docx).
4. prepareTemplateData maps metadata, introduction, functionalRequirements, systemFeatures, approvals.
5. easy-template-x injects into DOCX placeholders.
6. Version metadata persisted.
7. StreamableFile returned with filename functional-specification-document-template.docx.

Note on formatting/mapping:
- prepareTemplateData applies date normalization via formatDate.
- it also transforms arrays to text via toText for several fields.

---

Template flags and non-wired pieces:
1. Snapshot includes showStatistics/showExecutions/failedOnly.
2. Current Handlebars templates only actively use showApprovals/showContext/showPreconditions/showSteps and footer/title data.
3. DocumentFilterService and StatisticsService exist but are not invoked in current DocumentGenerationService pipeline.

---

**Part 5 - Template System**

Storage:
1. Main PDF/HTML templates:
- [nest-backend/templates/pdf/cahier-recette.hbs](nest-backend/templates/pdf/cahier-recette.hbs)
- [nest-backend/templates/pdf/fsd/fsd.hbs](nest-backend/templates/pdf/fsd/fsd.hbs)
2. Debug templates:
- [nest-backend/templates/pdf/cahier-recette-debug.hbs](nest-backend/templates/pdf/cahier-recette-debug.hbs)
- [nest-backend/templates/pdf/fsd/fsd-debug.hbs](nest-backend/templates/pdf/fsd/fsd-debug.hbs)
3. Legacy/experimental debug artifact:
- [nest-backend/templates/cahier-recette-debugg.hbs](nest-backend/templates/cahier-recette-debugg.hbs)
4. DOCX template:
- [nest-backend/templates/word/fsd-template.docx](nest-backend/templates/word/fsd-template.docx)
5. Placeholder docs:
- [nest-backend/templates/word/README.md](nest-backend/templates/word/README.md)
- [nest-backend/templates/excel/README.md](nest-backend/templates/excel/README.md)

Normal vs debug templates:
1. Normal templates render final business content.
2. Debug templates visibly expose placeholders/variables and highlight mappings.
3. Debug mode selection is driven by query mode=debug in PDF endpoint path flow via HtmlGenerator.getCompiledTemplate.

How Handlebars works here:
1. Template source loaded from filesystem and compiled once per name with cache map.
2. Helpers registered once:
- suiteHeading
- sectionNumber
- formatDate
3. Model is normalized before render for cahier:
- hierarchical numbering
- stable sorting
- ordered steps/preconditions
4. Render output string then used directly (HTML endpoint) or converted (PDF/Word HTML pipeline).

How easy-template-x works here:
1. Binary DOCX template loaded from disk.
2. TemplateHandler.process applies object data onto DOCX placeholders.
3. Mapping logic is centralized in prepareTemplateData.

How data is injected:
1. Handlebars injection:
- direct variable interpolation and conditionals in .hbs templates.
2. easy-template-x injection:
- structured object from prepareTemplateData.
3. Template selection:
- TemplateConfigService active template or query template id.
4. Snapshot persistence:
- model.template saved into document version metadata.

---

**Part 6 - API Endpoints**

All routes are under Nest app, guarded globally by fake auth except routes marked public.

### Group: PDF
1. GET /api/project-documents/:id/document/pdf
- Params: path id, query template optional, query mode optional, query type optional (cahier|fsd), header x-user-id required for protected calls.
- Returns: StreamableFile PDF attachment.
- Calls: ProjectDocumentService.getProjectDocumentPdf -> DocumentGenerationService.generatePdfDocument.

### Group: Word (HTML pipeline)
1. GET /api/project-documents/:id/document/word
- Params: path id, query template optional, query type optional, header x-user-id.
- Returns: StreamableFile DOCX.
- Calls: ProjectDocumentService.getProjectDocumentWord -> DocumentGenerationService.generateWordDocument.

### Group: Word Template
1. GET /api/project-documents/:id/document/word-template
- Params: path id, query template optional, query type optional, header x-user-id.
- Returns: StreamableFile DOCX.
- Calls: ProjectDocumentService.getProjectDocumentWordTemplate -> DocumentGenerationService.generateWordFromTemplate.

### Group: Excel
1. GET /api/project-documents/:id/document/excel
- Params: path id, query template optional, header x-user-id.
- Returns: StreamableFile XLSX.
- Calls: ProjectDocumentService.getProjectDocumentExcel -> DocumentGenerationService.generateExcelDocument.

### Other project-document endpoints
1. GET /api/project-documents
- Params: header x-user-id.
- Returns: ProjectDocumentDto[].
- Calls: ProjectDocumentService.getAllProjectDocuments.
2. GET /api/project-documents/:id
- Params: path id, header x-user-id.
- Returns: ProjectDocumentDto.
- Calls: ProjectDocumentService.getProjectDocumentById.
3. GET /api/project-documents/:id/document/html
- Params: path id, query template optional, header x-user-id.
- Returns: HTML string with text/html content type.
- Calls: ProjectDocumentService.getProjectDocumentHtml -> DocumentGenerationService.generateHtmlDocument.

### Template endpoints
1. GET /api/templates
- Params: header x-user-id.
- Returns: TemplateConfigRecord[].
- Calls: TemplateConfigService.getAllTemplates.
2. GET /api/templates/active
- Params: query template optional, header x-user-id.
- Returns: TemplateConfigRecord.
- Calls: TemplateConfigService.getActiveTemplate.
3. POST /api/templates/:id/activate
- Params: path id, header x-user-id.
- Returns: activated TemplateConfigRecord.
- Calls: TemplateConfigService.activateTemplate.

### Document version endpoints
1. GET /api/document-versions/download/:id
- Params: path id, header x-user-id.
- Returns: application/octet-stream Buffer (mock text content).
- Calls: DocumentVersionService.downloadVersion.
2. GET /api/document-versions/compare?version1=...&version2=...
- Params: query version1/version2, header x-user-id.
- Returns: VersionDiffDto.
- Calls: DocumentVersionService.compareVersions.
3. POST /api/document-versions/:id/restore
- Params: path id, header x-user-id.
- Returns: restored flag + restoredVersion + message.
- Calls: DocumentVersionService.restoreVersion.
4. GET /api/document-versions/:projectId
- Params: path projectId, header x-user-id.
- Returns: DocumentVersionDto[].
- Calls: DocumentVersionService.getVersions.

### Auth endpoints (public)
1. POST /api/auth/login
- Params: body username/password.
- Returns: sanitized user object.
- Calls: AuthService.login.
2. POST /api/auth/register
- Params: body username/password/role optional.
- Returns: message + sanitized user.
- Calls: AuthService.register.

---

**Part 7 - Dependencies and Libraries**

1. @nestjs/platform-express
- Why used: enables Express platform and NestExpressApplication features.
- Where: [nest-backend/src/main.ts](nest-backend/src/main.ts) to set view engine and views path.
- Pipeline role: bootstrap/runtime host for all endpoints.

2. hbs and handlebars
- Why used:
- hbs: integrate Handlebars view engine with Nest bootstrap.
- handlebars: compile and render templates programmatically.
- Where:
- hbs in [nest-backend/src/main.ts](nest-backend/src/main.ts)
- handlebars in [nest-backend/src/document-generation/generators/html.generator.ts](nest-backend/src/document-generation/generators/html.generator.ts)
- Pipeline role: model-to-HTML rendering stage.

3. puppeteer
- Why used: high-fidelity PDF generation from HTML with print styles.
- Where: [nest-backend/src/document-generation/generators/pdf.generator.ts](nest-backend/src/document-generation/generators/pdf.generator.ts)
- Pipeline role: HTML -> PDF conversion.

4. docx
- Why used: dependency present for DOCX document manipulation capability.
- Where used now: not directly imported in current Nest source.
- Pipeline role now: none active in code path.

5. exceljs
- Why used: create structured XLSX workbooks programmatically.
- Where: [nest-backend/src/document-generation/generators/excel.generator.ts](nest-backend/src/document-generation/generators/excel.generator.ts)
- Pipeline role: model-to-Excel generation.

6. easy-template-x
- Why used: inject structured data into DOCX templates.
- Where: [nest-backend/src/document-generation/generators/word-template.generator.ts](nest-backend/src/document-generation/generators/word-template.generator.ts)
- Pipeline role: template DOCX -> generated DOCX.

7. html-to-docx
- Why used: convert rendered HTML to DOCX without managing XML manually.
- Where: [nest-backend/src/document-generation/generators/word.generator.ts](nest-backend/src/document-generation/generators/word.generator.ts)
- Pipeline role: HTML -> Word conversion.

---

**Part 8 - Current Limitations / Mock Data**

Where mock data is used:
1. Auth users: [nest-backend/src/mock-data/users.data.ts](nest-backend/src/mock-data/users.data.ts)
2. Project catalog: [nest-backend/src/mock-data/project-documents.data.ts](nest-backend/src/mock-data/project-documents.data.ts)
3. Template configurations: [nest-backend/src/mock-data/template-configs.data.ts](nest-backend/src/mock-data/template-configs.data.ts)
4. Version records: [nest-backend/src/mock-data/document-versions.data.ts](nest-backend/src/mock-data/document-versions.data.ts)
5. Cahier content: [nest-backend/src/mock-data/cahier-recette.data.ts](nest-backend/src/mock-data/cahier-recette.data.ts)
6. FSD content: [nest-backend/src/mock-data/fsd.data.ts](nest-backend/src/mock-data/fsd.data.ts)

Why real data is not integrated yet:
1. Services explicitly indicate TODO replacement of mock data with external API/database.
2. Architecture docs and integration contract indicate target TestLab API consumption but current implementation remains in-memory.
3. Version storage and ownership are mock arrays, not persistent DB entities.
4. Authentication is fake header-based, not JWT/OAuth.

What would change with TestLab API integration:
1. Replace static arrays with adapters/repositories calling TestLab endpoints from [TESTLAB_API.md](TESTLAB_API.md).
2. Convert external UUID string IDs into internal document model mapping.
3. Build suites/testcases/steps dynamically from:
- project list
- specs hierarchy
- test suites
- testcase details
4. Remove hardcoded CAHIER_RECETTE_DOCUMENT and FSD_DOCUMENT as primary sources or treat as fallback.
5. Use persistent database for generated versions and binary storage.
6. Enable true diff/restore on snapshots instead of placeholder compare output.
7. Wire DocumentFilterService and StatisticsService into actual execution data flow.
8. Replace fake guard with token-based auth and authorization.

Current functional/technical limitations:
1. Excel export only supports cahier model.
2. HTML endpoint supports cahier only in current controller/service signature.
3. Word template generator always uses fsd-template.docx for both document types.
4. Word template generator logs templateData to console (debug artifact).
5. Legacy file [nest-backend/templates/cahier-recette-debugg.hbs](nest-backend/templates/cahier-recette-debugg.hbs) is malformed/duplicated and not part of active template selection.
6. Template flags showStatistics/showExecutions/failedOnly are not fully reflected in active Handlebars rendering pipeline.
7. [nest-backend/src/app.controller.spec.ts](nest-backend/src/app.controller.spec.ts) targets missing files, indicating stale scaffold test.

---

**Part 9 - Summary Flow Diagram (Text)**

Global flow:
User -> ProjectDocumentController -> ProjectDocumentService -> DocumentGenerationService -> Generator -> Template/Data Mapping -> DocumentVersionService snapshot -> HTTP StreamableFile or HTML response

PDF-specific:
User -> GET PDF endpoint -> normalize type -> build document model -> HtmlGenerator render (cahier/fsd + debug/normal) -> PdfGenerator Puppeteer -> version record creation -> PDF StreamableFile

Word (HTML) specific:
User -> GET Word endpoint -> normalize type -> build model -> HtmlGenerator render -> WordGenerator html-to-docx -> version record creation -> DOCX StreamableFile

Word (Template) specific:
User -> GET Word Template endpoint -> normalize type -> build model -> WordTemplateGenerator load DOCX template -> prepareTemplateData mapping -> easy-template-x process -> version record creation -> DOCX StreamableFile

Excel specific:
User -> GET Excel endpoint -> build cahier model -> ExcelGenerator flatten suites and write workbook -> version record creation -> XLSX StreamableFile

---

If you want, I can generate this as a dedicated architecture file in your repository (for example [nest-backend/ARCHITECTURE_NEST_COMPLETE.md](nest-backend/ARCHITECTURE_NEST_COMPLETE.md)) with a table-of-contents and cross-links so it is immediately reusable for onboarding and PFE reporting.
