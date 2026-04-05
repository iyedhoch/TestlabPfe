# TestLab + DocGen System Documentation

## 1. Global Architecture

### 1.1 What is TestLab?
TestLab is the active product in this repository. It is a QA and BA workspace used to manage:
- Projects
- Test suites, test cases, test steps, and preconditions
- Epics, features, and user stories
- Environments and environment variables
- Dashboard metrics
- Document exports such as Cahier de Recette and FSD

The live TestLab system is split into:
- `test-lab-frontend`: the React application used by users
- `testlab-backend`: the NestJS API used by the frontend
- PostgreSQL via Prisma as the live data source

### 1.2 What is DocGen (original project)?
DocGen is the older, separate document-generation application kept under `docgen/`.
It was built as a standalone back-office for browsing templates, viewing a document dashboard, and exporting documents.

DocGen has its own:
- React UI in `docgen/docgen-ui`
- NestJS backend in `docgen/nest-backend`
- Template configuration APIs
- Project document APIs
- Document version APIs

### 1.3 What problem DocGen solved originally
The original DocGen solved one narrow problem:
- Generate and download document artifacts outside of the TestLab operational app
- Provide a UI to browse templates and export project documents
- Keep document rendering logic separated from the main TestLab product

The original drawback was that it relied on a separate application boundary and mock or standalone document data instead of the real TestLab data model.

### 1.4 What problem the integration solves now
The integration moves document generation into the TestLab backend so documents are generated from the real TestLab database.

That means:
- No duplicated project/document source of truth
- No mock fallback for the live export path
- Exported documents reflect actual projects, suites, cases, epics, features, and stories stored in PostgreSQL
- The TestLab UI can trigger document generation directly in the same product

### 1.5 Before vs After

#### Before: separate systems
- DocGen backend and DocGen frontend were separate from TestLab
- Document data came from mock data or a separate document-specific data store
- The document UI called DocGen-specific endpoints
- The TestLab app did not own document generation end-to-end

#### After: integrated system
- Document generation is part of `testlab-backend`
- The TestLab frontend calls the TestLab backend directly for exports
- Live data is loaded from Prisma and PostgreSQL
- The same project model powers project management, test generation, specification management, dashboard metrics, and exports

#### Comparison table

| Aspect | Old DocGen | New Integrated System |
|---|---|---|
| Data source | Mock data and separate document records | Live Prisma/PostgreSQL TestLab data |
| Backend | Separate NestJS app under `docgen/nest-backend` | Integrated into `testlab-backend` |
| Frontend | Separate React app under `docgen/docgen-ui` | TestLab React app under `test-lab-frontend` |
| API calls | `/api/project-documents`, `/api/templates`, `/api/document-versions` | `/api/documents`, plus existing TestLab APIs |
| Storage | Mock data and in-memory/version APIs | PostgreSQL through Prisma, plus in-memory version snapshots for exports |

---

## 2. How TestLab and DocGen Are Linked Now

### 2.1 Is DocGen still a separate app?
As a codebase, yes: the legacy DocGen app still exists in `docgen/`.
As the live runtime path, no: document generation is no longer served from DocGen for the active TestLab product.

The current production-style path is:
- TestLab frontend
- TestLab backend
- Prisma/PostgreSQL
- Documents module inside the TestLab backend

DocGen is now best understood as legacy/reference code.

### 2.2 Where does document generation now live?
The active document export flow lives in:
- `testlab-backend/src/documents`

That module is registered in `testlab-backend/src/app.module.ts` and is therefore part of the running backend.

There is also a second folder:
- `testlab-backend/src/document-generation`

This folder contains a legacy/experimental document pipeline, but it is not imported by `AppModule`, so it is not the current runtime path.

### 2.3 How data flows from database to document
The live flow is:

Frontend project selection
-> API request to `testlab-backend`
-> `DocumentsController`
-> `DocumentGenerationService`
-> `DocumentDataService`
-> `PrismaService`
-> PostgreSQL
-> mapped document model
-> generator
-> binary buffer
-> `StreamableFile`
-> browser download

For Cahier de Recette:
- The source is `project -> testSuites -> testCases -> preconditions -> steps`

For FSD:
- The source is `project -> epics -> features -> userStories`

---

## 3. Full Data Flow

## 3.1 Cahier de Recette PDF

### Frontend entry point
The main live entry point is the TestLab page:
- `test-lab-frontend/src/pages/TestGenerationPage/TestGenerationPage.tsx`
- Export buttons are in `test-lab-frontend/src/pages/TestGenerationPage/components/TestGenerationActions.tsx`
- The selected project comes from `test-lab-frontend/src/layout/Header/Header.tsx`

### What the user does
1. Select a project from the header project dropdown.
2. Open the Test Generation page.
3. Click “Exporter le cahier de recette en PDF”.

### Request path
The React hook `useExportDocumentMutation` in `test-lab-frontend/src/services/documents/document.queries.ts` builds this request:
- `GET /api/documents/projects/:projectId/cahier/pdf`

Optional query parameters:
- `mode` for debug/template variants
- `language` is not used for Cahier PDF in the current controller, but `mode` is supported by the DTO

### Backend controller
- File: `testlab-backend/src/documents/documents.controller.ts`
- Method: `generateCahierPdf`

What it does:
1. Reads `projectId` from the route.
2. Reads `mode` from the query string.
3. Calls `documentGenerationService.generatePdf(projectId, 'cahier', query.mode)`.
4. Records the version in `DocumentVersionService`.
5. Returns a `StreamableFile` with `application/pdf`.

### Service layer
- File: `testlab-backend/src/documents/services/document-generation.service.ts`
- Method: `generatePdf`

What it does:
1. Resolves the model for `cahier`.
2. Calls `DocumentDataService.getCahierData(projectId)`.
3. Renders HTML with `HtmlGenerator.generate(...)`.
4. Converts HTML to PDF with `PdfGenerator.generateFromHtml(...)`.

### Data fetching layer
- File: `testlab-backend/src/documents/services/document-data.service.ts`
- Method: `getCahierData`

What it reads from Prisma:
- `project`
- `testSuites`
- `testCases`
- `preconditions`
- `steps`

What it transforms:
- Flat relational rows into a nested suite tree
- Test case IDs into readable codes such as `TC-<prefix>`
- Ordered preconditions and steps
- Project metadata into a document model

### Template used
- HTML templates: `testlab-backend/src/documents/templates/pdf/cahier-recette.hbs`
- Debug template: `testlab-backend/src/documents/templates/pdf/cahier-recette-debug.hbs`

### Generator used
- File: `testlab-backend/src/documents/generators/html.generator.ts`
- Then: `testlab-backend/src/documents/generators/pdf.generator.ts`

### Response
The controller wraps the PDF buffer in a `StreamableFile` and returns it with:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="cahier-recette.pdf"`

### ASCII flow

Frontend button
-> useExportDocumentMutation
-> GET /api/documents/projects/:projectId/cahier/pdf
-> DocumentsController.generateCahierPdf
-> DocumentGenerationService.generatePdf
-> DocumentDataService.getCahierData
-> Prisma project/testSuite/testCase/precondition/step query
-> HtmlGenerator
-> PdfGenerator (Puppeteer)
-> StreamableFile
-> Browser download

---

## 3.2 FSD PDF

### Frontend entry point
Same Test Generation page, export button:
- “Exporter le FSD en PDF (FR)”

### Request path
The frontend hook builds:
- `GET /api/documents/projects/:projectId/fsd/pdf-lang?language=fr`

The button currently passes:
- `documentType: 'fsd'`
- `format: 'pdf'`
- `language: 'fr'`

### Backend controller
- File: `testlab-backend/src/documents/documents.controller.ts`
- Method: `generateFsdPdfWithLanguage`

What it does:
1. Reads `projectId`.
2. Reads `mode` and `language` from the query.
3. Calls `documentGenerationService.generatePdfWithLanguage(projectId, 'fsd', query.mode, query.language || 'en')`.
4. Records a version entry.
5. Returns a PDF `StreamableFile`.

### Service layer
- File: `testlab-backend/src/documents/services/document-generation.service.ts`
- Method: `generatePdfWithLanguage`

What it does:
1. Resolves the FSD model via `DocumentDataService.getFsdData(projectId)`.
2. Chooses the language-aware Handlebars template.
3. Generates HTML.
4. Converts HTML to PDF.

### Data fetching layer
- File: `testlab-backend/src/documents/services/document-data.service.ts`
- Method: `getFsdData`

What it reads from Prisma:
- `project`
- `epics`
- `features`
- `userStories`

What it transforms:
- Epics into system features
- User stories into functional requirements
- Story priorities into FSD priorities
- Project metadata into document metadata

### Template used
- `testlab-backend/src/documents/templates/pdf/fsd/fsd.hbs`
- `testlab-backend/src/documents/templates/pdf/fsd/fsd-fr.hbs`
- Debug variants also exist:
  - `fsd-debug.hbs`
  - `fsd-debug-fr.hbs`

### Generator used
- `testlab-backend/src/documents/generators/html.generator.ts`
- `testlab-backend/src/documents/generators/pdf.generator.ts`

### Response
Returns `StreamableFile` with:
- `Content-Type: application/pdf`
- Filename such as `functional-specification-document-fr.pdf`

---

## 3.3 Word exports

### Cahier Word

#### Frontend
- Button: “Exporter le cahier de recette”
- Page: `test-lab-frontend/src/pages/TestGenerationPage/TestGenerationPage.tsx`

#### Request
- `GET /api/documents/projects/:projectId/cahier/word`

#### Backend
- Controller method: `generateCahierWord`
- Service method: `generateWord(projectId, 'cahier')`
- Data source: `DocumentDataService.getCahierData(projectId)`

#### Generator
- `testlab-backend/src/documents/generators/word.generator.ts`
- This generator reuses the HTML model and converts it to DOCX with `html-to-docx`.

#### Response
- `StreamableFile` with DOCX MIME type
- Filename: `cahier-recette.docx`

### FSD Word

#### Frontend
- Button: “Exporter le FSD en Word”

#### Request
- `GET /api/documents/projects/:projectId/fsd/word`

#### Backend
- Controller method: `generateFsdWord`
- Service method: `generateWord(projectId, 'fsd')`
- Data source: `DocumentDataService.getFsdData(projectId)`

#### Generator
- Same `word.generator.ts`
- Same HTML-to-DOCX path, but with FSD model data and FSD template selection.

#### Response
- `StreamableFile` with DOCX MIME type
- Filename: `functional-specification-document.docx`

### Note on word-template
The current active TestLab controller does not expose a separate word-template endpoint.
There is a legacy word-template generator in `testlab-backend/src/document-generation`, but it is not part of the live `DocumentsController` flow.

---

## 3.4 Excel export

### Frontend
The current TestLab Test Generation page does not expose an Excel export button.
The backend still supports Excel generation for Cahier de Recette.

### Request
- `GET /api/documents/projects/:projectId/cahier/excel`

### Backend
- Controller method: `generateCahierExcel`
- Service method: `generateExcel(projectId)`
- Data source: `DocumentDataService.getCahierData(projectId)`

### Generator
- File: `testlab-backend/src/documents/generators/excel.generator.ts`
- Uses `exceljs` to build an `.xlsx` workbook.

### Output shape
The workbook contains columns such as:
- Suite
- Test Case Code
- Test Case Name
- Summary
- Step #
- Action
- Expected Result

### Response
- `StreamableFile` with Excel MIME type
- Filename: `cahier-recette.xlsx`

---

## 4. Document Generation Pipeline

### 4.1 DocumentDataService
File: `testlab-backend/src/documents/services/document-data.service.ts`

What it does:
- Converts raw Prisma data into document-ready view models
- Normalizes ordering, tree structure, and default text
- Supplies reusable template snapshots

Why it exists:
- The database schema is relational and normalized
- Document templates need nested, presentation-friendly structures
- The mapping logic should not live inside controllers or generators

What it transforms:
- Projects into metadata and project info
- Test suites into nested suite trees
- Test cases into codes, summaries, preconditions, and steps
- Epics/features/stories into FSD sections and requirements

### 4.2 DocumentGenerationService
File: `testlab-backend/src/documents/services/document-generation.service.ts`

Role:
- Orchestrates the full export pipeline
- Chooses the correct model and generator by document type

Main methods:
- `getTemplates()`
- `generatePdf(...)`
- `generateWord(...)`
- `generateWordTemplate(...)`  
  Present in the service, but not exposed by the active controller.
- `generateExcel(...)`
- `generatePdfWithLanguage(...)`
- `generateWordWithLanguage(...)`

Routing logic:
- If `documentType === 'fsd'`, use `getFsdData`
- Otherwise use `getCahierData`
- PDF generation goes through HTML first
- Word generation goes through HTML-to-DOCX
- Excel generation is direct via ExcelJS

### 4.3 Generators

#### html.generator.ts
File: `testlab-backend/src/documents/generators/html.generator.ts`

Input:
- `CahierDocumentModel` or `FsdDocumentModel`
- Optional `mode`
- Optional `documentType`
- Optional `language`

Output:
- Rendered HTML string

Why needed:
- Both PDF and Word exports need a presentation layer
- The same data model can be reused across multiple formats
- Handlebars templates keep the layout logic separate from data mapping

Important detail:
- This generator registers Handlebars helpers once, including `suiteHeading`, `sectionNumber`, and `formatDate`
- The project memory note is important here: only helpers explicitly registered should be used in templates

#### pdf.generator.ts
File: `testlab-backend/src/documents/generators/pdf.generator.ts`

Input:
- HTML string

Output:
- PDF buffer

Why needed:
- Converts the HTML export into a printable PDF using Puppeteer
- Keeps HTML rendering separate from browser automation

#### word.generator.ts
File: `testlab-backend/src/documents/generators/word.generator.ts`

Input:
- Document model
- Document type
- Optional language-aware template selection through the HTML generator

Output:
- DOCX buffer

Why needed:
- Reuses the same HTML rendering logic for Word exports
- Avoids maintaining a completely separate DOCX template renderer for the standard path

#### word-template.generator.ts
File: `testlab-backend/src/documents/generators/word-template.generator.ts`

Input:
- Document model

Output:
- DOCX buffer created from a `.docx` template file

Why needed:
- Supports template-driven Word generation
- Useful when exact Word layout must be controlled from a Word document template

Current status:
- Present in the module
- Not exposed by the active `DocumentsController`

#### excel.generator.ts
File: `testlab-backend/src/documents/generators/excel.generator.ts`

Input:
- Cahier document model

Output:
- `.xlsx` buffer

Why needed:
- Excel exports have a tabular structure that is more naturally produced with ExcelJS than with HTML conversion

---

## 5. Folder Explanation

## 5.1 `testlab-backend/src/`

### `project/`
Status: Active

What it does:
- Project CRUD
- Project pagination
- Project export PDF

Why it exists:
- Projects are the top-level business entity used by the rest of the app

### `specification/`
Status: Active

What it does:
- Epic CRUD
- Feature CRUD
- User story CRUD
- Tag CRUD
- ClickUp import and task lookup

Why it exists:
- This is the feature tree that powers FSD generation and product specification management

### `testGeneration/`
Status: Active

What it does:
- Test suite CRUD
- Test case CRUD
- Test step CRUD
- Precondition updates
- Tree reordering and move operations

Why it exists:
- This is the test-case side of the data model that powers Cahier de Recette generation

### `environment/`
Status: Active

What it does:
- Environment CRUD
- Environment item CRUD
- Pagination and project filtering

Why it exists:
- Test environments are part of the QA workflow and belong to a project

### `dashboard/`
Status: Active

What it does:
- Dashboard metrics endpoint
- Counts active projects, test cases, coverage, and recent execution trend

Why it exists:
- Gives the frontend a single analytics endpoint for the home dashboard

### `documents/`
Status: Active

What it does:
- Current document export API
- Template snapshots
- Version tracking in memory
- PDF, Word, Excel, and language-aware document rendering

Why it exists:
- This is the live integrated document-generation module used by TestLab

### `document-generation/`
Status: Legacy / not wired into `AppModule`

What it does:
- Alternate document-generation implementation
- Contains a Prisma adapter, generators, and template service

Why it exists:
- Likely a migration or experimentation layer from the DocGen integration work

Important detail:
- It is not imported by `testlab-backend/src/app.module.ts`, so it is not the active runtime path

### `database/`
Status: Active

What it does:
- Prisma client bootstrapping
- Global database service

Why it exists:
- Centralizes PostgreSQL access and Prisma lifecycle handling

### `cloudinary/`
Status: Active

What it does:
- File upload integration for attachments

Why it exists:
- Used by specification-related file uploads and project attachments

### `config/`
Status: Active

What it does:
- Environment loading
- Swagger setup
- Shared enums and constants

Why it exists:
- Keeps deployment and runtime configuration outside business code

### `helpers/`
Status: Active

What it does:
- Miscellaneous utility functions

Why it exists:
- Shared helpers used by multiple parts of the backend

### `main.ts`
Status: Active

What it does:
- Bootstraps NestJS
- Loads environment variables
- Sets the global `/api` prefix
- Enables CORS
- Registers validation pipes

Why it exists:
- The entry point for the backend process

### `app.module.ts`
Status: Active

What it does:
- Composes the active runtime modules

Why it exists:
- Defines what is actually part of the running backend

### `docgen/` legacy reference area
Status: Separate legacy application

What it does:
- Original DocGen frontend/backend

Why it exists:
- Historical reference and migration source

---

## 6. What Changed from DocGen

### Removed
- Standalone document app as the primary runtime path
- Mock-only project/document source for the live TestLab flow
- Separate document export UI for the active product

### Replaced
- Mock project documents -> Prisma-backed TestLab project, suite, epic, feature, and story data
- Separate DocGen frontend -> export buttons inside TestLab frontend
- Separate document backend -> documents module inside TestLab backend

### Reused
- Template-driven rendering approach
- HTML-to-PDF conversion
- HTML-to-Word conversion
- Excel workbook generation
- Handlebars-based rendering patterns

### Added
- Live Prisma data mapping from the TestLab schema
- FSD generation from epics/features/user stories
- Cahier generation from suites/test cases/steps/preconditions
- Unified export UX inside the TestLab app
- `StreamableFile` response flow for direct downloads

### Important API change
Old DocGen API shape:
- `/api/project-documents/...`
- `/api/templates/...`
- `/api/document-versions/...`

New TestLab API shape:
- `/api/documents/...`
- plus project, specs, test-generation, dashboard, and environment endpoints already part of TestLab

---

## 7. All Available APIs

## 7.1 Current TestLab backend APIs

| Method | URL | Purpose | File |
|---|---|---|---|
| GET | `/api/dashboard/data` | Dashboard KPIs and execution trend | `testlab-backend/src/dashboard/dashboard.controller.ts` |
| GET | `/api/projects` | List all projects | `testlab-backend/src/project/project.controller.ts` |
| GET | `/api/projects/paginated` | Paginated project list | `testlab-backend/src/project/project.controller.ts` |
| POST | `/api/projects` | Create a project | `testlab-backend/src/project/project.controller.ts` |
| PUT | `/api/projects/:id` | Update a project | `testlab-backend/src/project/project.controller.ts` |
| DELETE | `/api/projects/:id` | Delete a project | `testlab-backend/src/project/project.controller.ts` |
| POST | `/api/projects/export` | Export selected projects to PDF | `testlab-backend/src/project/project.controller.ts` |
| GET | `/api/environments/paginated` | Paginated environments | `testlab-backend/src/environment/environment.controller.ts` |
| GET | `/api/environments/project/:projectId` | Environments by project | `testlab-backend/src/environment/environment.controller.ts` |
| GET | `/api/environments/:id` | Environment by id | `testlab-backend/src/environment/environment.controller.ts` |
| POST | `/api/environments` | Create environment | `testlab-backend/src/environment/environment.controller.ts` |
| PUT | `/api/environments/:id` | Update environment | `testlab-backend/src/environment/environment.controller.ts` |
| DELETE | `/api/environments/:id` | Delete environment | `testlab-backend/src/environment/environment.controller.ts` |
| POST | `/api/environments/:environmentId/env-items` | Create environment item | `testlab-backend/src/environment/environment.controller.ts` |
| PUT | `/api/environments/env-items/:id` | Update environment item | `testlab-backend/src/environment/environment.controller.ts` |
| DELETE | `/api/environments/env-items/:id` | Delete environment item | `testlab-backend/src/environment/environment.controller.ts` |
| GET | `/api/specs/:projectId` | Get epics for a project | `testlab-backend/src/specification/spec.controller.ts` |
| POST | `/api/specs/create-epic` | Create epic | `testlab-backend/src/specification/spec.controller.ts` |
| PUT | `/api/specs/update-epic/:id` | Update epic | `testlab-backend/src/specification/spec.controller.ts` |
| DELETE | `/api/specs/delete-epic/:id` | Delete epic | `testlab-backend/src/specification/spec.controller.ts` |
| POST | `/api/specs/create-feature` | Create feature | `testlab-backend/src/specification/spec.controller.ts` |
| PUT | `/api/specs/update-feature/:id` | Update feature | `testlab-backend/src/specification/spec.controller.ts` |
| DELETE | `/api/specs/delete-feature/:id` | Delete feature | `testlab-backend/src/specification/spec.controller.ts` |
| POST | `/api/specs/create-story` | Create user story | `testlab-backend/src/specification/spec.controller.ts` |
| PUT | `/api/specs/update-story/:id` | Update user story | `testlab-backend/src/specification/spec.controller.ts` |
| DELETE | `/api/specs/delete-story/:id` | Delete user story | `testlab-backend/src/specification/spec.controller.ts` |
| GET | `/api/specs/tags` | List tags | `testlab-backend/src/specification/spec.controller.ts` |
| GET | `/api/specs/tags/:id` | Get tag by id | `testlab-backend/src/specification/spec.controller.ts` |
| POST | `/api/specs/tags` | Create tag | `testlab-backend/src/specification/spec.controller.ts` |
| PUT | `/api/specs/tags/:id` | Update tag | `testlab-backend/src/specification/spec.controller.ts` |
| DELETE | `/api/specs/tags/:id` | Delete tag | `testlab-backend/src/specification/spec.controller.ts` |
| POST | `/api/specs/clickup-import` | Import ClickUp data | `testlab-backend/src/specification/clickup/clickup.controller.ts` |
| POST | `/api/specs/clickup-projects` | List ClickUp projects | `testlab-backend/src/specification/clickup/clickup.controller.ts` |
| GET | `/api/specs/clickup-task/:taskId` | Get ClickUp task details | `testlab-backend/src/specification/clickup/clickup.controller.ts` |
| GET | `/api/test-generation/test-suites` | List suites for a project | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| POST | `/api/test-generation/test-suites` | Create suite | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/test-suites/move` | Move suite in hierarchy | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/test-suites/:id` | Update suite | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| DELETE | `/api/test-generation/test-suites/:id` | Delete suite | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/reorder-suites/:id` | Reorder suites | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| GET | `/api/test-generation/test-cases/:id` | Get test case | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| POST | `/api/test-generation/test-cases` | Create test case | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/test-cases/move` | Move test case | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/test-cases/:id` | Update test case | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| DELETE | `/api/test-generation/test-cases/:id` | Delete test case | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| POST | `/api/test-generation/test-steps` | Create test step | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/test-steps/:id` | Update test step | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| DELETE | `/api/test-generation/test-steps/:id` | Delete test step | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/reorder-steps/:id` | Reorder test steps | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| PUT | `/api/test-generation/preconditions/:id` | Update precondition | `testlab-backend/src/testGeneration/test-generation.controller.ts` |
| GET | `/api/documents/projects/:projectId/cahier/pdf` | Export Cahier PDF | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/projects/:projectId/cahier/word` | Export Cahier Word | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/projects/:projectId/cahier/excel` | Export Cahier Excel | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/projects/:projectId/fsd/pdf` | Export FSD PDF | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/projects/:projectId/fsd/word` | Export FSD Word | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/projects/:projectId/fsd/pdf-lang` | Export language-aware FSD PDF | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/projects/:projectId/fsd/word-lang` | Export language-aware FSD Word | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/templates` | List document template snapshots | `testlab-backend/src/documents/documents.controller.ts` |
| GET | `/api/documents/versions/:projectId` | In-memory generated versions for a project | `testlab-backend/src/documents/documents.controller.ts` |

## 7.2 Legacy DocGen APIs

| Method | URL | Purpose | File |
|---|---|---|---|
| POST | `/api/auth/login` | Legacy login | `docgen/nest-backend/src/auth/auth.controller.ts` |
| POST | `/api/auth/register` | Legacy register | `docgen/nest-backend/src/auth/auth.controller.ts` |
| GET | `/api/project-documents` | List legacy project documents | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id` | Get legacy project document | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/html` | Render HTML | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/pdf` | Render PDF | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/pdf-secured` | Secured PDF | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/word` | Render Word | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/word-secured` | Secured Word | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/excel` | Render Excel | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/excel-secured` | Secured Excel | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/word-template` | Template-based Word | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/project-documents/:id/document/word-template-secured` | Secured template-based Word | `docgen/nest-backend/src/project-document/project-document.controller.ts` |
| GET | `/api/templates` | List templates | `docgen/nest-backend/src/template-config/template-config.controller.ts` |
| GET | `/api/templates/active` | Get active template | `docgen/nest-backend/src/template-config/template-config.controller.ts` |
| POST | `/api/templates/:id/activate` | Activate a template | `docgen/nest-backend/src/template-config/template-config.controller.ts` |
| GET | `/api/document-versions/download/:id` | Download a version | `docgen/nest-backend/src/document-version/document-version.controller.ts` |
| GET | `/api/document-versions/compare` | Compare versions | `docgen/nest-backend/src/document-version/document-version.controller.ts` |
| POST | `/api/document-versions/:id/restore` | Restore a version | `docgen/nest-backend/src/document-version/document-version.controller.ts` |
| GET | `/api/document-versions/:projectId` | List versions for a project | `docgen/nest-backend/src/document-version/document-version.controller.ts` |

---

## 8. Database Explanation

### 8.1 How to access the database
The active backend uses Prisma and PostgreSQL.

Key files:
- `testlab-backend/src/database/prisma.service.ts`
- `testlab-backend/src/database/database.module.ts`
- `testlab-backend/prisma/schema.prisma`

How access works:
- `PrismaService` reads `DATABASE_URL`
- It uses the PostgreSQL adapter from `@prisma/adapter-pg`
- `DatabaseModule` makes Prisma global across the app

### 8.2 How to run Prisma Studio
From `testlab-backend`:
- `npx prisma studio`

If needed, pass the schema explicitly:
- `npx prisma studio --schema prisma/schema.prisma`

### 8.3 How data is structured
The important models are:
- `Project`
- `TestSuite`
- `TestCase`
- `Precondition`
- `TestStep`
- `Epic`
- `Feature`
- `UserStory`
- `Tag`
- `Environment`
- `EnvItem`

### 8.4 Relationship map

#### Test management side
Project
-> TestSuite
-> TestCase
-> Precondition
-> TestStep

More precisely:
- One `Project` has many `TestSuite`
- One `TestSuite` can have child suites through `parentId`
- One `TestSuite` has many `TestCase`
- One `TestCase` has many `Precondition`
- One `TestCase` has many `TestStep`

ASCII view:

Project
  -> TestSuite
       -> TestSuite (children)
       -> TestCase
            -> Precondition
            -> TestStep

#### Specification side
Project
-> Epic
-> Feature
-> UserStory

More precisely:
- One `Project` has many `Epic`
- One `Epic` has many `Feature`
- One `Feature` has many `UserStory`

ASCII view:

Project
  -> Epic
       -> Feature
            -> UserStory

### 8.5 Why the schema matters for document generation
- Cahier PDF/Word/Excel generation reads the test-management side
- FSD generation reads the specification side
- The document layer is just a projection of the database structure into document-ready models

---

## 9. How to Run the Project from Scratch

### 9.1 Backend prerequisites
You need:
- Node.js
- npm
- PostgreSQL running locally or remotely
- A valid `DATABASE_URL`

### 9.2 Start the backend
From `testlab-backend`:

1. Install dependencies
   - `npm install`

2. Configure environment variables
   - `DATABASE_URL` must point to PostgreSQL
   - `APP_PORT` is optional; the backend defaults to `5000`

3. Run migrations
   - `npm run migrate:dev`

4. Seed data if needed
   - `npm run db:seed:dev`

5. Start the backend in watch mode
   - `npm run start:dev`

### 9.3 Run Prisma Studio
From `testlab-backend`:
- `npx prisma studio`

### 9.4 Start the frontend
From `test-lab-frontend`:

1. Install dependencies
   - `npm install`

2. Verify the backend URL
   - `test-lab-frontend/.env` contains `VITE_BASE_URL=http://localhost:5000`

3. Start the frontend
   - `npm run dev`

### 9.5 Open the app
- Open the Vite URL shown in the terminal, usually `http://localhost:5173`
- The frontend will call the backend at `http://localhost:5000/api`

### 9.6 Useful backend commands
From `testlab-backend`:
- `npm run build`
- `npm run start:prod`
- `npm run lint`
- `npm run test`

---

## 10. How to Test Document Generation

### 10.1 How to select a project
1. Open the TestLab app.
2. Use the project dropdown in the top header.
3. Pick a project from the list.

Relevant file:
- `test-lab-frontend/src/layout/Header/Header.tsx`

What happens internally:
- The selected project is stored in Redux via `setSelectedProject`
- The Test Generation page reads it through `selectedProjectSelector`

### 10.2 Where the export buttons are
Open:
- `Test Generation` page

Relevant file:
- `test-lab-frontend/src/pages/TestGenerationPage/TestGenerationPage.tsx`

Buttons come from:
- `test-lab-frontend/src/pages/TestGenerationPage/components/TestGenerationActions.tsx`

Buttons:
- Exporter le cahier de recette
- Exporter le cahier de recette en PDF
- Exporter le FSD en PDF (FR)
- Exporter le FSD en Word

### 10.3 What API is triggered
The frontend hook `useExportDocumentMutation` calls:
- `GET /api/documents/projects/:projectId/:documentType/:format`
- With special handling for FSD language-aware PDF/Word endpoints

### 10.4 What to expect
On success:
- A file download starts automatically
- The filename comes from the backend `Content-Disposition` header
- A success toast appears

On failure:
- A toast shows the error message
- If the project is missing, the frontend warns the user before sending the request

### 10.5 Common test cases
- Select a valid project and export Cahier PDF
- Select a valid project and export FSD Word
- Switch the selected project and confirm the export changes
- Try exporting with no project selected and confirm the guard message appears

---

## 11. Known Limitations and Tech Debt

### 11.1 Mock fallback data still used
- The legacy DocGen app still relies on mock-data driven endpoints
- The current TestLab document path is live and Prisma-backed, but the repository still contains mock-based DocGen code

### 11.2 Versioning is in memory
- `testlab-backend/src/documents/services/document-version.service.ts` stores generated versions in a `Map`
- Versions disappear when the backend restarts
- There is no persistent document version table in PostgreSQL for the active implementation

### 11.3 Duplicate modules
- `documents/` is the active module
- `document-generation/` is a duplicate/legacy implementation that is not wired into the root module
- This creates maintainability risk because two similar document stacks exist in the same repo

### 11.4 PDF performance issues
- PDF generation launches Puppeteer
- Puppeteer startup is heavy compared with pure server-side rendering
- Large projects will take longer to render and may consume more memory

### 11.5 Missing auth
- The current TestLab backend does not expose a real auth layer for document export
- `main.ts` allows wide-open CORS
- The frontend uses a project selection UX, but not a strong authorization boundary

### 11.6 Template support is partly static
- `DocumentDataService.getTemplates()` returns static snapshot objects
- Template persistence is not backed by the database in the active path

### 11.7 Word-template path is not exposed
- A template-based Word generator exists in the codebase
- The live active controller does not expose that endpoint

---

## 12. Current State Summary

### Is the system production ready?
No. It is functional for core export flows, but it is not production ready yet.

### What works well?
- Project-backed Cahier PDF generation
- Project-backed FSD PDF generation
- Word exports for Cahier and FSD
- Excel export for Cahier
- Live Prisma-backed data mapping
- Frontend download flow using streamed binary responses

### What is fragile?
- In-memory version tracking
- Duplicate legacy document code in the repo
- Missing auth and broad CORS
- Puppeteer-based PDF rendering overhead
- Static template snapshot behavior

---

## 13. Prioritized Next Steps

### 1. Fix frontend build
- Make sure the TestLab frontend compiles cleanly and the export flow stays stable
- Verify route imports, API client configuration, and any broken component references

### 2. Stabilize templates
- Decide which document templates are officially supported
- Remove ambiguity between active templates and legacy template logic
- Ensure template names, language variants, and debug variants are consistent

### 3. Seed real data
- Populate PostgreSQL with realistic TestLab projects, suites, epics, features, and stories
- Use the seeded data to validate both Cahier and FSD exports end-to-end

### 4. Clean legacy modules
- Remove or isolate `document-generation/` and other legacy DocGen code once the integrated path is fully validated
- Keep only one canonical document pipeline in the repo

### 5. Add auth later
- Protect document export endpoints
- Replace the current trust model with real authorization rules
- Make document access depend on project membership or user role

---

## 14. Final Mental Model

If you are new to this codebase, remember this one sentence:

TestLab is the live application, PostgreSQL is the source of truth, `testlab-backend/src/documents` turns database data into export-ready models, and the frontend simply asks for a file download.

DocGen still exists in the repository, but it is now legacy context rather than the primary runtime path.
