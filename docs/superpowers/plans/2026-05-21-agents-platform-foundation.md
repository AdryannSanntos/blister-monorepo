# Agents Platform Foundation Implementation Plan

> **Update 2026-05-22:** For approved V1 behavior details, execute in combination with:
> - `docs/superpowers/plans/2026-05-22-agents-context-execution-core.md`
> - `docs/superpowers/plans/2026-05-22-agents-full-focus-chat-workflow.md`
> - `docs/superpowers/plans/2026-05-22-agents-docs-rules-alignment.md`
>
> If there is conflict, the 2026-05-22 plans and decision contract take precedence.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the platform foundation for Workana AI agents: global platform access, `/workspaces/admin`, AI provider/model catalog, provider runtime, agents core, runs, ledgers, support access, and observability.

**Architecture:** Implement backend-first domain boundaries, then add platform admin UI surfaces. Agents call AI Runtime only; AI Runtime resolves provider, model, credential, policy, capability, fallback, and usage tracking.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, Zod, CASL/authz package, Trigger.dev, Next.js 16, React 19, TanStack Query, DataTable, shadcn/ui, Tailwind v4 tokens.

---

## Scope

This plan covers platform and backend foundation.

Included:

- global platform roles
- platform admin shell under `/workspaces/admin`
- provider/model/catalog backend and UI
- credentials and policies
- AI Runtime adapter layer
- OpenRouter first adapter
- native adapter contracts for OpenAI, Anthropic, Gemini
- agents core schema and APIs
- runs and run steps
- product credit ledger
- technical cost ledger
- support/impersonation audit model
- global observability tables

Excluded from this plan:

- full visual builder canvas
- dedicated Copy/Image/Post/Email/Analysis UX
- external publishing/email side effects

Those are covered by `docs/superpowers/plans/2026-05-21-agents-product-builder.md`.

---

## File Structure

### Backend files to create

- `apps/api/src/platform/platform.module.ts` — global platform access module
- `apps/api/src/platform/platform.controller.ts` — platform role and support access endpoints
- `apps/api/src/platform/platform.service.ts` — global role assignment and support session business logic
- `apps/api/src/platform/platform.service.spec.ts` — platform role and support access tests
- `apps/api/src/platform/guards/platform-role.guard.ts` — guard for `/workspaces/admin` backend endpoints
- `apps/api/src/platform/decorators/require-platform-role.decorator.ts` — decorator for platform role checks
- `apps/api/src/platform/dto/index.ts` — DTO exports
- `apps/api/src/platform/dto/assign-platform-role.dto.ts` — assign global role schema
- `apps/api/src/platform/dto/start-support-session.dto.ts` — support session schema
- `apps/api/src/ai-catalog/ai-catalog.module.ts` — provider/model/catalog module
- `apps/api/src/ai-catalog/ai-catalog.controller.ts` — catalog API endpoints
- `apps/api/src/ai-catalog/ai-catalog.service.ts` — provider/model/credential/policy business logic
- `apps/api/src/ai-catalog/ai-catalog.service.spec.ts` — catalog tests
- `apps/api/src/ai-catalog/dto/index.ts` — DTO exports
- `apps/api/src/ai-catalog/dto/provider.dto.ts` — provider schemas
- `apps/api/src/ai-catalog/dto/model.dto.ts` — model schemas
- `apps/api/src/ai-catalog/dto/credential.dto.ts` — credential schemas
- `apps/api/src/ai-catalog/dto/policy.dto.ts` — policy schemas
- `apps/api/src/ai-runtime/ai-runtime.module.ts` — runtime module
- `apps/api/src/ai-runtime/ai-runtime.service.ts` — runtime orchestration service
- `apps/api/src/ai-runtime/ai-runtime.service.spec.ts` — runtime tests
- `apps/api/src/ai-runtime/adapters/ai-provider.adapter.ts` — adapter interface
- `apps/api/src/ai-runtime/adapters/openrouter.adapter.ts` — OpenRouter implementation
- `apps/api/src/ai-runtime/adapters/openai.adapter.ts` — OpenAI implementation shell
- `apps/api/src/ai-runtime/adapters/anthropic.adapter.ts` — Anthropic implementation shell
- `apps/api/src/ai-runtime/adapters/gemini.adapter.ts` — Gemini implementation shell
- `apps/api/src/agents/agents.module.ts` — agents module
- `apps/api/src/agents/agents.controller.ts` — company-scoped agents API
- `apps/api/src/agents/agent-runs.controller.ts` — company-scoped run API
- `apps/api/src/agents/agents.service.ts` — agent CRUD/version service
- `apps/api/src/agents/agent-runs.service.ts` — run creation/query service
- `apps/api/src/agents/agent-execution.service.ts` — enqueue and status orchestration
- `apps/api/src/agents/agents.service.spec.ts` — agent CRUD/version tests
- `apps/api/src/agents/agent-runs.service.spec.ts` — run tests
- `apps/api/src/agents/dto/index.ts` — DTO exports
- `apps/api/src/agents/dto/agent.dto.ts` — agent schemas
- `apps/api/src/agents/dto/agent-version.dto.ts` — version schemas
- `apps/api/src/agents/dto/agent-run.dto.ts` — run schemas
- `apps/api/src/credits/credits.module.ts` — credit ledger module
- `apps/api/src/credits/credits.controller.ts` — company and platform credit views
- `apps/api/src/credits/credits.service.ts` — credit business logic
- `apps/api/src/credits/credits.service.spec.ts` — credit tests
- `apps/api/src/audit/audit.module.ts` — audit module
- `apps/api/src/audit/audit.service.ts` — audit writing service
- `apps/api/src/audit/audit.service.spec.ts` — audit tests
- `apps/api/trigger/agent-run.task.ts` — Trigger.dev durable agent run task
- `apps/api/trigger/shared/agent-runtime-payloads.ts` — task payload schemas

### Backend files to modify

- `apps/api/prisma/schema.prisma` — add platform roles, AI catalog, agents, runs, ledgers, audit models
- `apps/api/src/app.module.ts` — import new modules
- `packages/authz/src/index.ts` — add `agent.*` and ledger permissions while keeping compatibility with existing `skill.*` during migration
- `apps/api/src/organization/guards/permission.guard.ts` — keep org guard unchanged for org routes; do not use it for platform routes
- `apps/api/trigger.config.ts` — ensure agent run task is exported and deployable

### Frontend files to create

- `apps/web/src/core/modules/platform-admin/pages/platform-admin-page.tsx` — admin area shell
- `apps/web/src/core/modules/platform-admin/pages/platform-admins-page.tsx` — global admins management
- `apps/web/src/core/modules/platform-admin/pages/providers-page.tsx` — provider catalog table
- `apps/web/src/core/modules/platform-admin/pages/models-page.tsx` — model catalog table
- `apps/web/src/core/modules/platform-admin/pages/policies-page.tsx` — policy table
- `apps/web/src/core/modules/platform-admin/pages/templates-page.tsx` — agent templates table
- `apps/web/src/core/modules/platform-admin/pages/runs-page.tsx` — global runs table
- `apps/web/src/core/modules/platform-admin/pages/costs-page.tsx` — global cost table
- `apps/web/src/core/modules/platform-admin/hooks/use-platform-admin.ts` — platform role queries/mutations
- `apps/web/src/core/modules/platform-admin/hooks/use-ai-catalog.ts` — provider/model/policy queries/mutations
- `apps/web/src/core/modules/platform-admin/hooks/use-platform-runs.ts` — global run observability queries
- `apps/web/src/core/modules/platform-admin/components/platform-admin-shell.tsx` — local admin nav inside `/workspaces/admin`
- `apps/web/src/core/modules/platform-admin/components/provider-dialog.tsx` — provider form dialog
- `apps/web/src/core/modules/platform-admin/components/model-dialog.tsx` — model form dialog
- `apps/web/src/core/modules/platform-admin/components/policy-dialog.tsx` — policy form dialog
- `apps/web/src/app/workspaces/admin/page.tsx` — admin landing route
- `apps/web/src/app/workspaces/admin/admins/page.tsx` — admins route
- `apps/web/src/app/workspaces/admin/providers/page.tsx` — providers route
- `apps/web/src/app/workspaces/admin/models/page.tsx` — models route
- `apps/web/src/app/workspaces/admin/policies/page.tsx` — policies route
- `apps/web/src/app/workspaces/admin/templates/page.tsx` — templates route
- `apps/web/src/app/workspaces/admin/runs/page.tsx` — runs route
- `apps/web/src/app/workspaces/admin/costs/page.tsx` — costs route

### Frontend files to modify

- `apps/web/src/core/modules/workspace/components/workspace-shell.tsx` — expose admin entry only for platform roles
- `apps/web/src/core/shared/utils/api-client.ts` — no structural change expected; reuse existing client
- `apps/web/src/core/modules/organization/pages/permissions-page.tsx` — migrate labels from skill language to agent language when `agent.*` permissions exist

---

## Task 1: Add Platform Roles And Audit Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/platform/*`
- Create: `apps/api/src/audit/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add Prisma models**

Add models for `PlatformRoleAssignment`, `SupportSession`, and `AuditLog`.

Use these statuses and role values:

```ts
type PlatformRole = 'platform_owner' | 'platform_admin';
type SupportSessionStatus = 'active' | 'ended' | 'expired';
```

Persist role values as strings to match existing schema style.

- [ ] **Step 2: Generate Prisma client**

Run: `pnpm --filter @company-os/api prisma generate`

Expected: Prisma client regenerates under `apps/api/src/generated/prisma`.

- [ ] **Step 3: Create platform DTOs**

Create Zod schemas for assigning platform roles and starting support sessions.

Rules:

- `userId` is accepted only for platform admin management endpoints
- support session target organization id is explicit
- support access must record reason text with min length 8

- [ ] **Step 4: Create platform service tests first**

Test cases:

- assigns `platform_admin` to a user
- rejects unsupported platform role
- starts support session with audited reason
- ends support session
- does not depend on organization membership

- [ ] **Step 5: Implement platform service**

Use `PrismaService` only.

Expose methods:

- `listPlatformAdmins()`
- `assignPlatformRole(actorUserId, input)`
- `removePlatformRole(actorUserId, assignmentId)`
- `startSupportSession(actorUserId, input)`
- `endSupportSession(actorUserId, sessionId)`
- `getUserPlatformRoles(userId)`

- [ ] **Step 6: Add platform role guard and decorator**

Create `@RequirePlatformRole('platform_owner')` and `@RequirePlatformRole('platform_admin')`.

Guard rules:

- `platform_owner` satisfies owner-only and admin-level access
- `platform_admin` satisfies admin-level access only
- unauthenticated users fail through existing global `AuthGuard`

- [ ] **Step 7: Register platform module**

Import `PlatformModule` and `AuditModule` in `AppModule`.

- [ ] **Step 8: Run tests**

Run: `pnpm --filter @company-os/api test platform`

Expected: platform tests pass.

- [ ] **Step 9: Review checkpoint**

Use `company-os-backend`, `company-os-authz`, and `company-os-review`.

Must verify:

- no platform route uses organization guard by mistake
- support session writes audit logs
- platform role is not modeled as company membership

---

## Task 2: Add Agent Permissions And Naming Migration Path

**Files:**
- Modify: `packages/authz/src/index.ts`
- Modify later consumers only after backend endpoints exist

- [ ] **Step 1: Add agent permissions**

Add these permission keys:

- `agent.read`
- `agent.create`
- `agent.update`
- `agent.delete`
- `agent.publish`
- `agent.execute`
- `agent.run.read`
- `agent.run.review`
- `credit.read`
- `credit.manage`

- [ ] **Step 2: Add CASL subjects**

Add subjects:

- `Agent`
- `AgentRun`
- `CreditLedger`

- [ ] **Step 3: Keep legacy compatibility**

Keep existing `skill.read`, `skill.execute`, `output.read`, and `output.review` temporarily.

Do not remove them in this plan.

- [ ] **Step 4: Assign default roles**

Default role behavior:

- `owner`: receives all new `agent.*`, `agent.run.*`, `credit.*`
- `admin`: receives read/execute/run read, but not publish/delete/manage credits unless explicitly decided later
- `member`: receives `agent.read`, `agent.execute`, and `agent.run.read` for own runs when service-level filtering allows it

- [ ] **Step 5: Run authz tests/build**

Run: `pnpm --filter @company-os/authz build`

Expected: package builds and exported types include new permissions.

- [ ] **Step 6: Review checkpoint**

Use `company-os-authz` and `company-os-review`.

Must verify:

- no permission hardcoded outside `packages/authz`
- legacy permissions remain until all callers migrate

---

## Task 3: Add AI Catalog Schema And Backend

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/ai-catalog/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add Prisma models**

Add models:

- `AIProvider`
- `AIModel`
- `AICredential`
- `AIProviderPolicy`

Use JSON fields for capability, pricing, and schema metadata because provider capabilities change often.

- [ ] **Step 2: Create DTO schemas**

Create DTOs for:

- create/update provider
- create/update model
- create/update credential
- create/update policy

Validation rules:

- provider slug uses lowercase kebab-case
- model slug uses lowercase kebab-case
- provider status is one of `draft`, `active`, `disabled`
- model status is one of `draft`, `active`, `deprecated`, `disabled`
- credential value is accepted only on create/update and never returned

- [ ] **Step 3: Write service tests first**

Test cases:

- create provider with icon metadata
- create model under provider with capabilities
- disable model without deleting it
- create platform credential
- create company credential
- return provider/model lists without credential secrets
- policy restricts models by company

- [ ] **Step 4: Implement ai-catalog service**

Service methods:

- `listProviders()`
- `createProvider(input)`
- `updateProvider(providerId, input)`
- `listModels(filters)`
- `createModel(input)`
- `updateModel(modelId, input)`
- `createCredential(actorUserId, input)`
- `updateCredential(actorUserId, credentialId, input)`
- `listPolicies(filters)`
- `upsertPolicy(actorUserId, input)`

- [ ] **Step 5: Implement controller**

Routes under platform admin API namespace:

- `GET /platform/ai/providers`
- `POST /platform/ai/providers`
- `PATCH /platform/ai/providers/:providerId`
- `GET /platform/ai/models`
- `POST /platform/ai/models`
- `PATCH /platform/ai/models/:modelId`
- `POST /platform/ai/credentials`
- `PATCH /platform/ai/credentials/:credentialId`
- `GET /platform/ai/policies`
- `PUT /platform/ai/policies`

Protect routes with platform role guard.

- [ ] **Step 6: Seed initial providers**

Create a seed path for:

- OpenRouter
- OpenAI
- Anthropic
- Gemini

OpenRouter should be `active`. Native providers can be `draft` or `active` depending on credentials.

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @company-os/api test ai-catalog`

Expected: catalog tests pass.

- [ ] **Step 8: Review checkpoint**

Use `company-os-backend`, `company-os-authz`, and `company-os-review`.

Must verify:

- no secrets returned by API
- provider/model capabilities are model-level effective metadata
- platform routes do not require organization context

---

## Task 4: Build AI Runtime Adapter Layer

**Files:**
- Create: `apps/api/src/ai-runtime/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Define adapter interface**

The adapter interface must support:

- text generation
- image generation
- embeddings
- structured output metadata
- provider error normalization
- usage return

Initial method names:

- `generateText(request)`
- `generateImage(request)`
- `createEmbedding(request)`
- `supports(capability)`

- [ ] **Step 2: Write runtime service tests first**

Test cases:

- resolves OpenRouter model for text request
- rejects model without required capability
- uses company credential when policy allows it
- falls back to platform credential when no company credential exists
- records usage metadata from adapter response
- normalizes provider error

- [ ] **Step 3: Implement OpenRouter adapter**

Implement operational OpenRouter adapter first.

Read API key from encrypted credential resolved by runtime, not directly from environment in business logic.

- [ ] **Step 4: Add native adapter shells**

Add OpenAI, Anthropic, and Gemini adapters behind the same interface.

They can return a typed `ProviderNotConfiguredError` until credentials and provider-specific clients are enabled.

- [ ] **Step 5: Implement runtime service**

Runtime flow:

1. load policy
2. load candidate models
3. validate capability
4. resolve credential
5. select adapter
6. execute call
7. return normalized output and usage

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @company-os/api test ai-runtime`

Expected: runtime tests pass.

- [ ] **Step 7: Review checkpoint**

Use `company-os-backend` and `company-os-review`.

Must verify:

- no direct provider calls outside runtime
- no provider secret crosses controller boundary
- adapter errors are normalized

---

## Task 5: Add Agents Core Schema And Backend

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/agents/*`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add Prisma models**

Add models:

- `AgentTemplate`
- `CompanyAgent`
- `AgentVersion`
- `AgentRun`
- `AgentRunStep`

Include indexes for organization, status, updated date, and run status.

- [ ] **Step 2: Create agent DTO schemas**

DTOs must validate:

- agent visible name
- description
- status transitions
- version flow JSON
- input schema JSON
- output schema JSON
- publish request
- execute request

- [ ] **Step 3: Write service tests first**

Test cases:

- create company agent from template
- create custom company agent
- save draft version
- publish draft version
- activate published version
- reject activation of draft version
- list agents scoped by organization
- reject cross-organization access

- [ ] **Step 4: Implement agents service**

Service methods:

- `listCompanyAgents(orgId)`
- `getCompanyAgent(orgId, agentId)`
- `createCompanyAgent(orgId, userId, input)`
- `saveDraftVersion(orgId, agentId, userId, input)`
- `publishVersion(orgId, agentId, versionId, userId)`
- `activateVersion(orgId, agentId, versionId, userId)`
- `archiveAgent(orgId, agentId, userId)`

- [ ] **Step 5: Implement agents controller**

Routes:

- `GET /organizations/:orgId/agents`
- `POST /organizations/:orgId/agents`
- `GET /organizations/:orgId/agents/:agentId`
- `PATCH /organizations/:orgId/agents/:agentId`
- `POST /organizations/:orgId/agents/:agentId/versions/draft`
- `POST /organizations/:orgId/agents/:agentId/versions/:versionId/publish`
- `POST /organizations/:orgId/agents/:agentId/versions/:versionId/activate`

Permissions:

- read: `agent.read`
- create: `agent.create`
- update draft: `agent.update`
- publish: `agent.publish`
- activate: `agent.publish`
- archive/delete: `agent.delete`

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @company-os/api test agents`

Expected: agent tests pass.

- [ ] **Step 7: Review checkpoint**

Use `company-os-backend`, `company-os-authz`, and `company-os-review`.

Must verify:

- all mutations have `@RequirePermission`
- `userId` comes from `req.currentUser.id`
- `orgId` comes from params
- versions are immutable once published

---

## Task 6: Add Agent Run Execution With Trigger.dev

**Files:**
- Create: `apps/api/trigger/agent-run.task.ts`
- Create: `apps/api/trigger/shared/agent-runtime-payloads.ts`
- Modify: `apps/api/src/agents/agent-runs.service.ts`
- Modify: `apps/api/src/agents/agent-execution.service.ts`

- [ ] **Step 1: Define task payload schema**

Payload includes:

- `organizationId`
- `agentRunId`
- `agentId`
- `agentVersionId`

Do not trust provider/model/user data from the task payload. Load execution details from database by ids.

- [ ] **Step 2: Write run service tests first**

Test cases:

- creates queued run
- enqueues Trigger.dev task
- filters runs by organization
- filters member-visible runs to own runs when required by service policy
- stores run error when execution fails

- [ ] **Step 3: Implement run creation**

`POST /organizations/:orgId/agents/:agentId/runs`

Permission: `agent.execute`

Creates `AgentRun` with status `queued` and enqueues `agent-run` Trigger task.

- [ ] **Step 4: Implement Trigger task**

Task flow:

1. load run and version
2. update run to `running`
3. execute version flow sequentially
4. call AI Runtime for AI blocks
5. create `AgentRunStep` per block
6. create technical cost ledger entries
7. create product credit debit entry
8. update run to `success` or `error`

- [ ] **Step 5: Add polling-friendly run endpoints**

Routes:

- `GET /organizations/:orgId/agents/runs`
- `GET /organizations/:orgId/agents/runs/:runId`

Permission: `agent.run.read`

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @company-os/api test agent-runs`

Expected: run tests pass.

- [ ] **Step 7: Review checkpoint**

Use `trigger-tasks`, `company-os-backend`, and `company-os-review`.

Must verify:

- Trigger task validates payload with Zod
- task is idempotent enough for retries
- `result.ok` is checked if trigger-and-wait is used
- no `Promise.all` with Trigger wait calls

---

## Task 7: Add Credits And Technical Cost Ledgers

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/credits/*`
- Modify: `apps/api/src/agents/agent-runs.service.ts`
- Modify: `apps/api/src/agents/agent-execution.service.ts`

- [ ] **Step 1: Add ledger models**

Models:

- `CreditLedgerEntry`
- `TechnicalCostLedgerEntry`

Credit entry types:

- `credit_added`
- `run_debit`
- `run_refund`
- `reservation`
- `reservation_release`

- [ ] **Step 2: Write credit tests first**

Test cases:

- adds credits to organization
- debits credits for run
- rejects debit when insufficient balance if strict mode is enabled
- records technical cost separately from credits
- global platform cost report includes provider/model breakdown

- [ ] **Step 3: Implement credit service**

Methods:

- `getOrganizationBalance(orgId)`
- `addCredits(actorUserId, orgId, input)`
- `debitRunCredits(runId, amount)`
- `recordTechnicalCost(input)`
- `getPlatformCostSummary(filters)`

- [ ] **Step 4: Add endpoints**

Company routes:

- `GET /organizations/:orgId/credits`
- `GET /organizations/:orgId/credits/ledger`

Platform routes:

- `GET /platform/costs`
- `GET /platform/costs/providers`
- `GET /platform/costs/models`

Permissions:

- company read: `credit.read`
- company manage: `credit.manage`
- platform costs: platform role guard

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test credits`

Expected: credit tests pass.

- [ ] **Step 6: Review checkpoint**

Use `company-os-backend`, `company-os-authz`, and `company-os-review`.

Must verify:

- product credits and technical costs are separate ledgers
- company UI cannot see provider secrets or internal margins

---

## Task 8: Build Platform Admin UI Shell And Tables

**Files:**
- Create: `apps/web/src/app/workspaces/admin/**/*.tsx`
- Create: `apps/web/src/core/modules/platform-admin/**/*`
- Modify: `apps/web/src/core/modules/workspace/components/workspace-shell.tsx`

- [ ] **Step 1: Create platform admin hooks**

Use React Query hooks only. No direct HTTP calls in page components.

Hooks:

- `usePlatformAdmins()`
- `useAssignPlatformRole()`
- `useAIProviders()`
- `useAIModels()`
- `useAIProviderPolicies()`
- `usePlatformRuns()`
- `usePlatformCosts()`

- [ ] **Step 2: Create `/workspaces/admin` shell**

Use workspace context, not dashboard shell.

Navigation sections:

- Admins
- Providers
- Models
- Policies
- Templates
- Runs
- Costs

- [ ] **Step 3: Add admin entry to workspace shell**

Only show when current user has `platform_owner` or `platform_admin`.

- [ ] **Step 4: Build DataTable pages**

Use `DataTable` for:

- admins
- providers
- models
- policies
- templates
- global runs
- costs

Each table needs useful sorting, filters, column visibility, and empty states.

- [ ] **Step 5: Add dialogs**

Dialogs:

- provider create/edit
- model create/edit
- policy create/edit
- assign admin role

Use RHF + Zod, `mode: 'onBlur'`, and project Form components.

- [ ] **Step 6: Run frontend checks**

Run: `pnpm --filter @company-os/web lint`

Expected: lint passes.

- [ ] **Step 7: Review checkpoint**

Use `company-os-frontend`, `company-os-design`, `company-os-authz`, and `company-os-review`.

Must verify:

- no raw colors
- tables use `DataTable`
- actions are gated by platform role checks
- forms use Zod/RHF
- no dashboard shell used for `/workspaces/admin`

---

## Task 9: Add Global Run And Cost Observability

**Files:**
- Modify: `apps/api/src/agents/agent-runs.controller.ts`
- Modify: `apps/api/src/credits/credits.controller.ts`
- Modify: `apps/web/src/core/modules/platform-admin/pages/runs-page.tsx`
- Modify: `apps/web/src/core/modules/platform-admin/pages/costs-page.tsx`

- [ ] **Step 1: Add API filters**

Filters:

- provider
- model
- organization
- agent template
- status
- date range
- cost range

- [ ] **Step 2: Add run detail endpoint**

Platform route:

- `GET /platform/agents/runs/:runId`

Returns run, steps, costs, and audit summary.

No provider secrets.

- [ ] **Step 3: Add run detail sheet**

Show:

- organization
- agent
- user
- status
- input summary
- output preview
- steps
- provider/model breakdown
- credit/cost breakdown
- support context if applicable

- [ ] **Step 4: Run checks**

Run:

- `pnpm --filter @company-os/api test agent-runs credits`
- `pnpm --filter @company-os/web lint`

Expected: backend tests and frontend lint pass.

- [ ] **Step 5: Review checkpoint**

Use `company-os-review`.

Must verify no hidden AI retrieval metadata or provider secrets leak to normal company users.

---

## Final Verification For Plan 1

- [ ] Run backend tests: `pnpm --filter @company-os/api test`
- [ ] Run authz build: `pnpm --filter @company-os/authz build`
- [ ] Run frontend lint: `pnpm --filter @company-os/web lint`
- [ ] Run type checks if package scripts exist: `pnpm --filter @company-os/api typecheck` and `pnpm --filter @company-os/web typecheck`
- [ ] Review all touched backend code with `company-os-backend`
- [ ] Review all touched frontend code with `company-os-frontend`
- [ ] Review permissions with `company-os-authz`
- [ ] Review UI with `company-os-design`
- [ ] Run final merge-blocking review with `company-os-review`
