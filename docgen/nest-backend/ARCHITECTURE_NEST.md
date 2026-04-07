# NestJS Backend Architecture Summary

## 1. Backend Purpose

This backend exposes APIs to manage project documents, generate document outputs, and handle document version lifecycle operations.

## 2. Modules

### project-document
- Manages project document entities and document-related access endpoints.
- Provides project document retrieval and delegates generation workflows through service-level orchestration.

### document-generation
- Contains document generation responsibilities only.
- Organizes format-specific generators for HTML, PDF, Word, and Excel.
- Currently returns mock content for all formats.

### document-version
- Manages document version operations.
- Supports listing versions, downloading a version file, comparing versions, and restoring versions.
- Uses mock in-memory version data.

## 3. Architecture Style

The backend follows a feature-based modular architecture:
- Each feature is isolated in its own module.
- Controllers remain thin and delegate business logic to services.
- Services own orchestration and validation.
- Shared cross-cutting concerns are prepared under src/common.

## 4. Module Interaction

- project-document service orchestrates project-related operations.
- project-document service calls document-generation service when document output is requested.
- document-version module is independent and encapsulates version lifecycle workflows.
- app.module composes these modules without mixing their internal responsibilities.

## 5. Current State

- APIs are operational with mock responses.
- Data is currently in-memory.
- No database integration yet.
- Feature-based modular architecture is implemented and composed in app.module.
- Modules currently in place:
	- auth (global fake guard, @Public decorator, x-user-id request identity)
	- project-document
	- document-generation (pipeline with filtering and statistics components)
	- document-version (including ownership checks)
	- template-config (active template selection and activation)
- DTO-based response mapping is used across major endpoints.
- Mock data is centralized under src/mock-data and shared by feature services.
- Document generation follows a pipeline:
	- load project data
	- resolve active or selected template
	- apply filtering rules
	- compute statistics
	- build document model
	- execute format generator
	- persist version metadata
- HTML generation is implemented as a config-aware renderer.
- PDF/Word/Excel generation is currently mocked and marked for real-library replacement.
- Document generation uses mock generators without external file libraries.

## 6. Future Steps

1. Integrate persistent database storage for project documents and versions.
2. Replace mock generators with real document generation libraries for PDF, Word, and Excel.
3. Add authentication and authorization for protected operations.
4. Introduce global exception filters and shared custom exceptions in src/common.
5. Add validation pipes and API contracts for stricter request/response governance.

## Migration Gap Analysis (Spring Boot -> NestJS)

### 1. Fully Migrated Features

- Core endpoint families are available in NestJS for:
	- documents and generation routes
	- version routes (list, download, compare, restore)
	- template routes (list, active, activate)
	- auth routes (login, register)
- Basic generation pipeline structure is implemented end-to-end in service orchestration.
- Active template logic is implemented via template-config service and active template selection.
- Ownership checks are implemented for document-version operations.
- Feature-based modular architecture is in place and aligned with migration targets.

### 2. Partially Migrated Features

- Template system exists but is simplified compared to Spring (fewer fields and rules).
- Document generation is partially complete:
	- HTML generation is implemented
	- PDF/Word/Excel remain mocked
- Versioning exists but compare/restore are simplified versus Spring snapshot-driven behavior.
- Security exists through a global fake guard but does not yet implement JWT flow.
- Data model exists but uses simplified mock structures rather than full domain entities.

### 3. Missing Features (Critical)

- Database and persistence layer for production-grade storage.
- JWT authentication system with token issuance/validation.
- Real PDF/Word/Excel generation implementations.
- Snapshot-based restore logic equivalent to Spring regeneration behavior.
- Snapshot diff algorithm equivalent to Spring field-level comparison.
- Full domain model with Project/TestPlan/TestCase/TestExecution relationships.
- Advanced template configuration fields and rules from Spring.

### 4. Differences in Data Models

- Spring uses rich relational entities with explicit domain relationships.
- Nest currently uses simplified flat, mock-backed structures.
- Template configuration in Nest misses several Spring fields (for example executionStatusFilter, companyName, showTestCases, and related visibility/configuration options).
- Version model differs:
	- Spring versioning stores binary content and generatedBy relation in persistent entities
	- Nest currently stores simplified metadata/content representations in memory

### 5. Architectural Differences

#### Good:

- Modular NestJS architecture is clear and feature-oriented.
- Pipeline responsibilities are cleanly separated (filtering, statistics, generators).
- Auth layer is easy to replace because guard-based abstraction is already centralized.

#### Limitations:

- In-memory data model is not production-ready.
- Document generation for PDF/Word/Excel is still mocked.
- Versioning logic is simplified and not yet equivalent to Spring snapshot workflows.

## Data Model Refactor for Cahier de Recette

### Why executions were removed from generation model

- The previous document model was centered on flat execution lists and aggregate statistics.
- A Cahier de Recette document is organized by qualification hierarchy, not by execution rows.
- Keeping executions in the core generation model created a mismatch between API document shape and expected business document structure.

### Why suites/testCases/steps were added

- Real recette artifacts are structured as suites containing test cases, each with ordered preconditions and ordered steps.
- This structure enables deterministic rendering of validation scenarios and expected outcomes.
- Approvals and context are now first-class sections to represent sign-off workflow and testing scope.

### Alignment with real TestLab backend structure

- The model now follows a domain chain aligned with TestLab expectations: Project -> Suites -> TestCases -> Steps.
- Metadata and context mirror document-level information used by real qualification deliverables.
- The refactor remains mock-based and endpoint-compatible while bringing internal models closer to production data contracts.
