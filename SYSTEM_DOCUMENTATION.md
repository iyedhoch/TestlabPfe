# TestLab System Documentation

## 0. Quick Start First (Run This Before Reading The Rest)

### 0.1 Start The Applications

```powershell
# Terminal 1 - Start backend
cd testlab-backend
npm run start:dev

# Terminal 2 - Start frontend
cd test-lab-frontend
npm run dev
```

### 0.2 Open Prisma Studio (See All Tables And Data)

```powershell
cd testlab-backend
npx prisma studio
```

This opens a browser UI where you can inspect every table and row from the configured database.

### 0.3 First-Time Setup After Cloning (Recommended Order)

```powershell
# 1) Install backend dependencies
cd testlab-backend
npm install

# 2) Install frontend dependencies
cd ..\test-lab-frontend
npm install

# 3) Return to backend
cd ..\testlab-backend

# 4) Create DB schema from migrations (preferred)
npm run migrate:dev

# 5) Seed database with sample data
npm run db:seed:dev

# 6) Start backend
npm run start:dev

# 7) (Optional) Open Prisma Studio
npx prisma studio
```

### 0.4 If You Need The Exact Current Prisma Shape Quickly

```powershell
cd testlab-backend
npm run sync:dev
```

Use this when you want Prisma to push the current schema directly to the database.

### 0.5 How To Verify You Have The Same Database Architecture

1. Open Prisma Studio and confirm these main table groups exist:
- projects + document_approvals
- test_suites, test_cases, preconditions, test_steps
- epics, features, user_stories, tags
- environments, env_items
- fsd_dashboard_screenshots, fsd_navigation_items, fsd_functional_modules, fsd_business_rules, fsd_acceptance_criteria

2. Optionally validate schema from CLI:

```powershell
cd testlab-backend
npx prisma validate
```

3. Optionally inspect tables in PostgreSQL directly (psql):

```sql
\dt
```

This document describes the current, code-verified state of the workspace with focus on the active runtime stack:
- Frontend: `test-lab-frontend`
- Backend: `testlab-backend`
- Database: PostgreSQL via Prisma
- Integrated document generation: `testlab-backend/src/documents`

It also explains where legacy code still exists (`docgen/`, `testlab-backend/src/document-generation`) and how to avoid mixing legacy paths with the active runtime path.

## 1. Executive Overview

### 1.1 Product Scope
TestLab is a QA/BA workspace that manages:
- Projects
- Specifications (`Epic -> Feature -> UserStory`)
- Test generation (`TestSuite -> TestCase -> Precondition/TestStep`)
- Environments and env items
- Dashboard analytics
- Document exports (Cahier and FSD)

### 1.2 Current Runtime Components
- Frontend application: `test-lab-frontend`
- Backend API: `testlab-backend`
- Database access layer: Prisma client (generated client in `testlab-backend/prisma/generated`)
- Document pipeline module: `testlab-backend/src/documents`

### 1.3 Legacy Code in Repository
- Legacy DocGen app remains under `docgen/` (UI + Nest backend).
- Legacy alternate document implementation exists under `testlab-backend/src/document-generation`.
- The active app module imports `DocumentsModule`, not the legacy `document-generation` module.

## 2. Architecture

### 2.1 Frontend Architecture
Tech stack:
- React 19 + Vite + TypeScript
- Chakra UI
- React Router
- React Query
- Redux Toolkit + redux-persist
- Axios

Composition:
- Entry: `src/index.tsx` -> `BrowserRouter`
- App shell: `src/App.tsx` wraps QueryClient, Redux store, PersistGate, Chakra provider
- Routes: `src/routes/AppRoutes.tsx`
- Auth gate: `src/routes/PrivateRoutes.tsx`
- Layout container: `src/layout/Container/Container.tsx` (Sidebar + Header + page outlet)

State:
- Persisted `projectReducer.selectedProject`
- Persisted `authReducer`
- Non-persisted `testGenerationReducer`

### 2.2 Backend Architecture
Tech stack:
- NestJS 11
- Prisma 7 with PostgreSQL adapter (`@prisma/adapter-pg`)
- class-validator / class-transformer
- Puppeteer for PDF generation
- html-to-docx + docxtemplater for Word generation
- ExcelJS for XLSX export
- Cloudinary integration for attachments

Backend bootstrap (`src/main.ts`):
- Loads environment via `LoadEnvironmentVariables()`
- Global prefix: `/api`
- CORS: `origin: *`, `credentials: false`
- Global validation pipe: whitelist + transform
- Static serving of templates via `/templates` from first existing root:
  - `src/documents/templates`
  - `dist/src/documents/templates`
  - `documents/templates`

Active modules imported in `src/app.module.ts`:
- `ProjectModule`
- `DatabaseModule`
- `EnvironmentModule`
- `TestGenerationModule`
- `SpecModule`
- `DashboardModule`
- `DocumentsModule`

### 2.3 High-Level Request Flow
1. UI action triggers React Query mutation/query.
2. Axios client calls backend endpoint (`VITE_BASE_URL` + `/api/...`).
3. Nest controller delegates to service.
4. Service reads/writes Prisma models.
5. For documents: data mapping -> template rendering -> format generator -> streamed download.

## 3. Domain Modules (Backend)

### 3.1 `project`
Responsibilities:
- CRUD projects
- Paginated listing
- Projects PDF export (`/projects/export`)
- Optional attachment upload through Cloudinary

Notes:
- Export is rendered with EJS template and converted with `html-pdf-node`.

### 3.2 `specification`
Responsibilities:
- CRUD `Epic`, `Feature`, `UserStory`, `Tag`
- Attachment upload for user stories
- ClickUp integration endpoints under same `/specs` prefix

Notes:
- Service performs explicit cleanup/cascade for some delete operations before Prisma delete.

### 3.3 `testGeneration`
Responsibilities:
- CRUD and reordering for suites/cases/steps
- Move operations for suites and cases
- Preconditions update

Notes:
- Returns `testSteps` alias for frontend compatibility in several responses.
- Contains guard logic preventing suite self/descendant moves.

### 3.4 `environment`
Responsibilities:
- CRUD environments
- Paginated endpoint with optional project filter
- CRUD environment items (`env_items`)

Notes:
- Update supports replacing env items in bulk when list is provided.

### 3.5 `dashboard`
Responsibilities:
- Aggregated dashboard metrics endpoint (`/dashboard/data`)

Metrics source:
- Project counts and month deltas
- Total/recent test cases
- User story coverage based on `StoryStatus.DONE`
- Latest project execution timestamp
- 6-month trend built from project creation month buckets + `testCaseCount`

### 3.6 `documents`
Responsibilities:
- Exports for Cahier and FSD in PDF/Word (+ Excel for Cahier)
- Language-aware FSD endpoints (`pdf-lang`, `word-lang`)
- Template snapshots endpoint
- In-memory generated versions endpoint

Core classes:
- `DocumentsController`
- `DocumentGenerationService`
- `DocumentDataService`
- `DocumentVersionService`
- Generators: HTML, PDF, Word, WordTemplate, Excel

## 4. Document Generation: End-to-End

### 4.1 Active Endpoints
Under `/api/documents`:
- `GET /projects/:projectId/cahier/pdf`
- `GET /projects/:projectId/cahier/pdf-template-debug`
- `GET /projects/:projectId/cahier/word`
- `GET /projects/:projectId/cahier/excel`
- `GET /projects/:projectId/fsd/pdf`
- `GET /projects/:projectId/fsd/word`
- `GET /projects/:projectId/fsd/pdf-lang`
- `GET /projects/:projectId/fsd/word-lang`
- `GET /templates`
- `GET /versions/:projectId`

### 4.2 Frontend Export Entry
Primary UI page:
- `test-lab-frontend/src/pages/DocumentGenerationPage/DocumentGenerationPage.tsx`

Export hook:
- `useExportDocumentMutation` in `src/services/documents/document.queries.ts`

Route builder behavior:
- For FSD + (`pdf` or `word`) + language set, URL becomes `.../:documentType/:format-lang` and appends `?language=...`.
- Otherwise URL uses `.../:documentType/:format`.
- Optional `mode` query parameter is appended when provided.

### 4.3 Data Mapping Layer
`DocumentDataService` maps relational data to view models.

Cahier source:
- `project` with nested `approvals`, `testSuites`, `testCases`, `preconditions`, `steps`
- Builds suite hierarchy from parent IDs
- Sorts by explicit `order` then name
- Emits stable fields used by HTML, Word, and Excel generators

FSD source:
- `project` with nested `epics -> features -> userStories`
- Derives functional requirements (`FR-001...`)
- Adds extended sections from relational FSD tables:
  - `fsd_dashboard_screenshots`
  - `fsd_navigation_items`
  - `fsd_functional_modules`
  - `fsd_business_rules`
  - `fsd_acceptance_criteria`
- Normalizes acceptance `status` to `pass | fail | open`

### 4.4 Generator Layer
HTML generator (`html.generator.ts`):
- Chooses template by doc type, mode, and optional language
- Registers Handlebars helpers once: `suiteHeading`, `sectionNumber`, `formatDate`, `eq`
- Resolves template from `src`, `dist/src`, or `documents` template roots

PDF generator (`pdf.generator.ts`):
- Launches Puppeteer headless
- Injects `<base href>` if absent so relative assets resolve
- Generates A4 with fixed margins

Word generator (`word.generator.ts`):
- Cahier path: DOCX template rendering via Docxtemplater (`test cahier de recette.docx`)
- Non-Cahier path: HTML -> DOCX via `html-to-docx`
- Language-aware Word uses HTML generator with language

Excel generator (`excel.generator.ts`):
- Generates worksheet from flattened suite/case/step structure
- Includes columns for suite path, code, summary, action, expected result

### 4.5 Version Tracking
`DocumentVersionService` currently stores generated versions in memory:
- `Map<projectId, GeneratedDocumentVersion[]>`
- Volatile across process restarts

## 5. FSD Language and Template Behavior

### 5.1 Runtime Behavior
FSD language support exists in two patterns:
- Dedicated endpoints: `/fsd/pdf-lang` and `/fsd/word-lang`
- `/fsd/pdf` now also accepts `language` query and routes through language-aware generation when present

Language selection in HTML generator for FSD:
- English: `fsd.hbs` (or debug variant)
- French: `fsd-fr.hbs` (or debug FR variant)

### 5.2 Important Template Rule
Handlebars helpers must be explicitly registered in generator code.
Avoid using unregistered helpers in templates, otherwise rendering fails at runtime.

## 6. API Catalog (Active Backend)

All routes below are under `/api` prefix.

### 6.1 Dashboard
- `GET /dashboard/data`

### 6.2 Projects
- `GET /projects`
- `GET /projects/paginated`
- `POST /projects`
- `PUT /projects/:id`
- `DELETE /projects/:id`
- `POST /projects/export`

### 6.3 Environments
- `GET /environments/paginated`
- `GET /environments/project/:projectId`
- `GET /environments/:id`
- `POST /environments`
- `PUT /environments/:id`
- `DELETE /environments/:id`
- `POST /environments/:environmentId/env-items`
- `PUT /environments/env-items/:id`
- `DELETE /environments/env-items/:id`

### 6.4 Specifications
- `GET /specs/:projectId`
- `POST /specs/create-epic`
- `PUT /specs/update-epic/:id`
- `DELETE /specs/delete-epic/:id`
- `POST /specs/create-feature`
- `PUT /specs/update-feature/:id`
- `DELETE /specs/delete-feature/:id`
- `POST /specs/create-story`
- `PUT /specs/update-story/:id`
- `DELETE /specs/delete-story/:id`
- `GET /specs/tags`
- `GET /specs/tags/:id`
- `POST /specs/tags`
- `PUT /specs/tags/:id`
- `DELETE /specs/tags/:id`

ClickUp:
- `POST /specs/clickup-import`
- `POST /specs/clickup-projects`
- `GET /specs/clickup-task/:taskId`

### 6.5 Test Generation
- `GET /test-generation/test-suites`
- `POST /test-generation/test-suites`
- `PUT /test-generation/test-suites/move`
- `PUT /test-generation/test-suites/:id`
- `DELETE /test-generation/test-suites/:id`
- `PUT /test-generation/reorder-suites/:id`
- `GET /test-generation/test-cases/:id`
- `POST /test-generation/test-cases`
- `PUT /test-generation/test-cases/move`
- `PUT /test-generation/test-cases/:id`
- `DELETE /test-generation/test-cases/:id`
- `POST /test-generation/test-steps`
- `PUT /test-generation/test-steps/:id`
- `DELETE /test-generation/test-steps/:id`
- `PUT /test-generation/reorder-steps/:id`
- `PUT /test-generation/preconditions/:id`

### 6.6 Documents
- `GET /documents/projects/:projectId/cahier/pdf`
- `GET /documents/projects/:projectId/cahier/pdf-template-debug`
- `GET /documents/projects/:projectId/cahier/word`
- `GET /documents/projects/:projectId/cahier/excel`
- `GET /documents/projects/:projectId/fsd/pdf`
- `GET /documents/projects/:projectId/fsd/word`
- `GET /documents/projects/:projectId/fsd/pdf-lang`
- `GET /documents/projects/:projectId/fsd/word-lang`
- `GET /documents/templates`
- `GET /documents/versions/:projectId`

## 7. Database Model and Relationships

### 7.1 Prisma Setup
- Prisma schema: `testlab-backend/prisma/schema.prisma`
- Client generator output: `testlab-backend/prisma/generated`
- Prisma service extends generated `PrismaClient`
- Adapter: `PrismaPg` with `DATABASE_URL`

### 7.2 Core Models
Project-centric aggregate:
- `Project`
- `DocumentApproval`
- `TestSuite`, `TestCase`, `Precondition`, `TestStep`
- `Epic`, `Feature`, `UserStory`, `Tag`
- `Environment`, `EnvItem`
- FSD relational section models:
  - `FsdDashboardScreenshot`
  - `FsdNavigationItem`
  - `FsdFunctionalModule`
  - `FsdBusinessRule`
  - `FsdAcceptanceCriteria`

### 7.3 Relationship Diagrams

Test management side:

```text
Project
  -> TestSuite (self hierarchy via parentId)
      -> TestCase
          -> Precondition
          -> TestStep
```

Specification side:

```text
Project
  -> Epic
      -> Feature
          -> UserStory
```

FSD extension side:

```text
Project
  -> FsdDashboardScreenshot
  -> FsdNavigationItem
  -> FsdFunctionalModule
  -> FsdBusinessRule
  -> FsdAcceptanceCriteria
```

### 7.4 Why It Matters for Exports
- Cahier output is projection of test-management subtree.
- FSD output is projection of specification subtree plus FSD extension tables.
- Generators are formatting layers; they do not own business truth.

## 8. Frontend to Backend Contract Map

### 8.1 API Client
Axios instance:
- `baseURL = import.meta.env.VITE_BASE_URL`
- `withCredentials = false`

### 8.2 Query/Mutation Pattern
Each domain has React Query hooks in `src/services/*/*.queries.ts`.
Examples:
- Dashboard -> `/api/dashboard/data`
- Projects -> `/api/projects...`
- Specs -> `/api/specs...`
- Test generation -> `/api/test-generation...`
- Environments -> `/api/environments...`
- Documents export -> dynamic URL builder based on payload

### 8.3 Project Selection Dependency
Several pages depend on persisted selected project from header dropdown:
- Test generation page
- Specifications page
- Environment page
- Document generation page

If no selected project, pages either guard actions or show empty/notice states.

## 9. Runbook (From Scratch)

### 9.1 Backend
From `testlab-backend`:
1. `npm install`
2. Configure env files expected by loader (`.env.local` or matching `NODE_ENV` pattern used in scripts)
3. Run schema migration/sync:
   - `npm run migrate:dev` or `npm run sync:dev`
4. Seed optional sample data:
   - `npm run db:seed:dev`
5. Start backend:
   - `npm run start:dev`

Default listen port in code:
- `APP_PORT` if set, otherwise `5000`

### 9.2 Frontend
From `test-lab-frontend`:
1. `npm install`
2. Set `VITE_BASE_URL` (example: `http://localhost:5000`)
3. `npm run dev`

### 9.3 Useful Dev Commands
Backend:
- `npm run build`
- `npm run lint`
- `npm run test`
- `npx prisma studio`

Frontend:
- `npm run lint`
- `npm run build`
- `npm run preview`

## 10. Validation and Troubleshooting

### 10.1 Validate Exports Quickly
1. Select a project in header dropdown.
2. Open document generation page.
3. Trigger Cahier PDF/Word/Excel and FSD PDF/Word.
4. Confirm browser download and expected filename.
5. Check `GET /api/documents/versions/:projectId` for in-memory version entries.

### 10.2 Common Failure Points
- Missing or incorrect `DATABASE_URL`.
- Missing `APP_PORT` assumption mismatch with frontend base URL.
- Puppeteer environment issues (`--no-sandbox` runtime restrictions in host/container).
- Missing template files in resolved template roots.
- Using unregistered Handlebars helpers in `.hbs` templates.
- Empty project relations leading to sparse generated docs.

### 10.3 FSD Language Debug Checklist
- Frontend payload includes `language` for FSD exports.
- URL uses `pdf-lang`/`word-lang` when expected.
- Backend receives `language` query.
- HTML generator resolves `fsd-fr.hbs` for `fr`.
- Template sections 9-13 fields are populated from FSD extension tables.

## 11. Known Gaps and Technical Debt

### 11.1 Coexisting Legacy Pipelines
- `docgen/` and `testlab-backend/src/document-generation` still exist, increasing confusion and maintenance overhead.

### 11.2 Volatile Document Versioning
- Version tracking is in-memory map only; no persistent version audit table.

### 11.3 Mixed PDF Engines
- Project export uses `html-pdf-node`; document exports use Puppeteer.
- This increases operational complexity and behavior differences.

### 11.4 CORS/Auth Hardening Pending
- CORS is open (`origin: *`) and credentials disabled.
- No strong auth/authorization boundary for export routes in current code path.

### 11.5 Error Handling Consistency
- Some controllers use direct `Response` patterns and manual status writes.
- Others use Nest-native return values and exceptions.
- Standardization would improve maintainability and observability.

## 12. Legacy vs Active: What to Use

Use for active development:
- `test-lab-frontend`
- `testlab-backend`
- `testlab-backend/src/documents`
- `testlab-backend/prisma/schema.prisma`

Treat as reference/legacy unless explicitly migrating:
- `docgen/*`
- `testlab-backend/src/document-generation/*`

## 13. Practical Mental Model

- `Project` is the root aggregate.
- Backend modules expose CRUD + domain workflows over Prisma.
- Documents module projects relational data into render models.
- Render models feed template/generator stack to produce binary downloads.
- Frontend orchestrates user flow and dispatches typed API calls; backend owns transformation and generation.

If this model is preserved, adding new export sections or formats becomes incremental and low risk.