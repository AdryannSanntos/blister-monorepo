# Agents Platform Design Spec

## Update 2026-05-22 (Approved Product Decisions)

This spec remains valid as baseline. Final V1 product decisions are locked in `docs/decisions/2026-05-22-agents-v1-contract.md` and take precedence when there is conflict.

V1 locked decisions added after approval loop:

- Custom-only company agent catalog in V1.
- Company chat always uses internal context agent.
- Delegation responses stay in company chat; execution detail is viewed in delegated agent history.
- Full-focus layout for company chat, workflow editor, and single-agent workspace.
- Single-agent workspace internal nav: Chat, Workflow, Executions, Settings.
- Edit message creates branch; regenerate and copy are available.
- Current conversation input blocks during active execution.
- Execution cap is 3 concurrent runs per company with FIFO queue and one automatic retry.
- Retrieval order is fixed: current chat -> same-agent memory -> structured retrieval -> pgvector retrieval -> rerank.
- Retrieval is permission-aware and excludes secrets/credentials.

**Date:** 2026-05-21  
**Scope:** Agents platform, AI provider catalog, runtime, global admin, runs, credits, product flows, and visual builder  
**Status:** Approved design baseline

---

## Objective

Build the Workana AI agents platform as a modular and governed execution layer where every AI-powered automation is represented by an agent, while keeping provider integrations, model catalog, credits, runs, platform administration, and user-facing product flows cleanly separated.

The system must start with OpenRouter for testing and early operation, but it must be designed from the beginning to support native OpenAI, Anthropic, Gemini, and future providers without rewriting agents, runs, history, credits, or the visual builder.

---

## Product Principles

### 1. Agents are the core product primitive

Every automation, generation, analysis, copywriting flow, image generation flow, post generation flow, and future external action must be backed by an agent.

The user may interact with a dedicated screen such as Copy, Image, Post, Email, or Analysis, but internally each flow executes a versioned agent.

### 2. Providers are not agents

AI providers and AI models are platform infrastructure. Agents reference capabilities, policies, and model preferences; they never contain provider-specific execution code.

### 3. Platform and company contexts are separate

The platform has global roles and global admin surfaces. Companies have owners, members, roles, permissions, agents, runs, credits, and outputs.

No platform role should be confused with a company role.

### 4. The initial MVP generates outputs and history

The architecture must support future external side effects such as publishing, email sending, and integration actions, but the first product scope focuses on generated outputs, run history, cost tracking, credits, and observability.

### 5. Every action is permissioned and auditable

All agent creation, editing, publishing, execution, review, platform admin actions, credential changes, support access, impersonation, and future external side effects require explicit authorization and audit logs.

---

## Terminology

### Platform roles

`platform_owner` is the highest global platform role. It manages global admins, providers, models, policies, templates, observability, costs, and support access.

`platform_admin` is a global operational role. It can operate the platform admin area according to policies set by the platform owner.

Platform roles are global and do not depend on organization membership.

### Company roles

`owner` is the owner of a company/workspace. It exists only inside an organization context.

Company owners govern company agents, company agent versions, company runs, company credits, and company-level configuration.

### Agent

An agent is a versioned operational AI workflow with input contracts, output contracts, blocks, policies, and execution history.

### AI provider

An AI provider is a vendor or gateway such as OpenRouter, OpenAI, Anthropic, Gemini, or a future provider.

### AI model

An AI model belongs to a provider and declares concrete capabilities, limits, costs, and execution metadata.

---

## Architecture Overview

The system is divided into seven domains.

### 1. Platform Access

This domain manages global access to `/workspaces/admin`.

It owns:

- `PlatformRole`
- global role assignment to users
- platform admin authorization checks
- support/impersonation access rules
- audit metadata for platform operations

It does not replace organization membership, organization roles, or company owners.

### 2. AI Catalog

This domain manages provider and model metadata.

It owns:

- `AIProvider`
- `AIModel`
- `AICredential`
- `AIProviderPolicy`
- model capabilities
- provider branding
- model pricing
- model availability
- provider and model import/sync operations

The catalog must support partially manual management with optional import/sync from providers when possible.

### 3. AI Runtime

This domain is the only layer allowed to execute AI calls.

It owns:

- provider adapter contracts
- OpenRouter adapter
- OpenAI adapter
- Anthropic adapter
- Gemini adapter
- model resolution
- credential resolution
- capability validation
- fallback selection
- usage collection
- provider error normalization

Agents and product flows must call the runtime, not providers directly.

### 4. Agents Core

This domain manages agent definitions and versions.

It owns:

- `AgentTemplate`
- `CompanyAgent`
- `AgentVersion`
- `AgentFlow`
- agent status transitions
- draft and published versions
- version activation
- builder-compatible flow definitions

System templates are governed by the platform. Company agents are governed by the company.

### 5. Runs, Usage, and Cost

This domain manages execution records and financial observability.

It owns:

- `AgentRun`
- `AgentRunStep`
- product credit ledger
- technical provider cost ledger
- run status lifecycle
- run replay metadata
- output persistence references
- global and company-level observability

The product credit ledger is user-facing. The technical cost ledger is operational and platform-facing.

### 6. Workspace Product Flows

This domain contains user-facing screens for practical workflows.

Initial dedicated flows:

- Analysis
- Copy
- Image
- Post
- Email

These screens optimize UX for common tasks. They still execute agents internally.

### 7. Platform Admin

This domain lives under `/workspaces/admin`.

It owns admin UI for:

- platform admins
- providers
- models
- policies
- templates
- global runs
- global costs
- support/impersonation operations

It is outside `/dashboard/*` and outside the company workspace shell.

---

## AI Provider And Model Catalog

### AIProvider

`AIProvider` stores provider-level identity, branding, defaults, and operational behavior.

Recommended fields:

- `id`
- `slug`
- `name`
- `description`
- `iconObjectKey`
- `iconUrl`
- `websiteUrl`
- `status`
- `supportsByok`
- `supportsSyncImport`
- `supportsFallback`
- `defaultCapabilities`
- `credentialSchema`
- `createdAt`
- `updatedAt`

Provider examples:

- `openrouter`
- `openai`
- `anthropic`
- `gemini`

### AIModel

`AIModel` stores model-level capabilities, costs, limits, and execution metadata. The model is the effective source of runtime truth.

Recommended fields:

- `id`
- `providerId`
- `slug`
- `displayName`
- `apiModelName`
- `modality`
- `status`
- `capabilities`
- `limits`
- `pricing`
- `acceptedFileTypes`
- `releaseLabel`
- `createdAt`
- `updatedAt`

Required capabilities metadata:

- `supportsTextGeneration`
- `supportsImageGeneration`
- `supportsEmbeddings`
- `supportsWebSearch`
- `supportsFileInput`
- `supportsStructuredOutput`
- `supportsToolCalling`
- `supportsStreaming`
- `supportsVision`
- `supportsAudioInput`
- `supportsAudioOutput`
- `supportsReasoning`

Required limit metadata:

- max context tokens
- max output tokens
- max file size
- supported image sizes
- timeout hint
- rate-limit hint

Required pricing metadata:

- input token cost
- output token cost
- embedding cost
- image generation cost
- call cost when applicable
- pricing currency
- pricing unit

### AICredential

`AICredential` stores encrypted provider credentials.

Credential scopes:

- `platform`
- `company`

Credential behavior:

- platform credentials can be default for the product
- company credentials can override platform credentials when policy allows BYOK
- runtime must record which credential scope was used for every provider call
- credentials must never be exposed to the frontend

### AIProviderPolicy

`AIProviderPolicy` controls provider/model availability.

It must support:

- global allow/deny
- company-specific allow/deny
- BYOK allow/deny
- model capability restrictions
- fallback priority
- monthly or daily spend limits
- run-time safety restrictions

---

## AI Runtime

The runtime is the execution boundary for all AI calls.

Runtime responsibilities:

- receive a logical execution request
- validate required capabilities
- resolve allowed model candidates
- choose provider and model
- choose credential source
- execute through the correct adapter
- normalize provider response
- normalize provider errors
- collect usage and cost metadata
- return output to the agent execution engine

Adapter responsibilities:

- implement provider-specific API calls
- map Workana AI request format to provider request format
- map provider response to Workana AI response format
- expose supported modalities
- expose provider-specific error categories

Initial adapter status:

- OpenRouter: operational first
- OpenAI: native adapter planned from foundation
- Anthropic: native adapter planned from foundation
- Gemini: native adapter planned from foundation

The runtime must not depend on React, Next.js, UI state, or builder internals.

---

## Agents Domain

### AgentTemplate

System-level template governed by platform admins.

It defines:

- template identity
- category
- default flow
- default input schema
- default output schema
- allowed blocks
- default execution profile
- default model policy
- default review requirement
- availability status

Templates are not directly edited by companies.

### CompanyAgent

Company-level agent instance.

It defines:

- company identity
- optional source template
- visible name and description
- status
- active version
- visibility
- permission requirements
- company-specific policy overrides

Company agents can be created from templates or built from controlled blocks.

### AgentVersion

Immutable version of a company agent.

Version states:

- `draft`
- `published`
- `archived`

Editing creates or updates a draft. Publishing promotes a draft to an immutable published version. Activation points the company agent to a published version.

### AgentFlow

Builder-compatible declarative flow.

The MVP supports:

- linear execution
- simple conditions
- controlled blocks

The MVP does not need freeform DAG parallelism.

Initial block types:

- Trigger/Input
- Brain Context
- Context Retrieval
- LLM Generate
- Transform
- Condition
- Image Generate
- Output
- Review Gate

### AgentRun

Concrete execution record.

It stores:

- organization id
- agent id
- agent version id
- initiating user id
- execution origin
- input snapshot
- output reference
- status
- timestamps
- error summary
- support/impersonation context when applicable
- total credits charged
- total technical cost

### AgentRunStep

Technical execution step.

It stores:

- run id
- node id
- step type
- provider id when applicable
- model id when applicable
- credential scope when applicable
- request metadata
- response metadata
- token usage
- technical cost
- status
- error summary
- timestamps

---

## Product Flows

Dedicated product flows must be practical and optimized for user outcomes.

Initial flows:

### Analysis

Uses Brain, Context, Assets, and Design System context to summarize, classify, extract, compare, and recommend next actions.

### Copy

Generates channel-specific copy variations with editable output cards and history persistence.

### Image

Generates images using model capabilities and optional prompt refinement.

### Post

Generates social posts with text, creative direction, image generation, and future publishing readiness.

### Email

Generates subject, preview text, body, and optional HTML/text variants.

All flows execute agents internally.

---

## Platform Admin In `/workspaces/admin`

The platform admin area is separate from dashboard company routes.

Required sections:

- Admins
- Providers
- Models
- Policies
- Templates
- Runs
- Costs

Access requires global platform role.

Company owners must not access platform admin by default.

---

## Support And Impersonation

`platform_owner` and `platform_admin` can access company data and operate company agents only through explicit support/impersonation mode.

Support mode must allow:

- viewing company agents
- editing company agent configuration
- publishing versions
- executing runs
- future external actions when enabled

Every support operation must be audited.

Audit entries must include:

- platform user id
- target organization id
- target user id when impersonating a specific user
- action
- resource type
- resource id
- before/after summary when modifying data
- timestamp

---

## Permissions

The product must migrate away from `skill.*` naming toward `agent.*` naming.

Migration strategy:

- Phase 1: UI and route language use Agents
- Phase 2: new permission keys use `agent.*`
- Phase 3: legacy `skill.*` permissions are removed after all callers migrate

Recommended agent permissions:

- `agent.read`
- `agent.create`
- `agent.update`
- `agent.delete`
- `agent.publish`
- `agent.execute`
- `agent.run.read`
- `agent.run.review`

Recommended platform permissions can be implemented through global roles rather than organization CASL permissions.

---

## Credits And Costs

The system uses two ledgers.

### Product Credit Ledger

User-facing ledger for companies.

It records:

- credits debited
- credits reserved
- credits refunded
- credits added
- reference run id
- visible reason

### Technical Cost Ledger

Platform-facing ledger for provider economics.

It records:

- provider id
- model id
- credential scope
- input tokens
- output tokens
- image units
- embedding units
- provider cost
- currency
- run id
- run step id

The company sees credits. The platform sees credits and real provider costs.

---

## Visual Builder

The builder can use a specialized graph/canvas library.

The visual appearance must be fully adapted to Workana AI design tokens and component patterns.

Builder MVP scope:

- create a company agent
- configure controlled blocks
- connect linear blocks
- configure simple conditions
- validate capabilities against model policies
- test block or whole flow in dry-run mode
- save draft
- publish version
- activate version

Builder must not expose internal ranking, hidden retrieval metadata, or provider secrets.

---

## Implementation Phases

1. Naming and domain foundation
2. Platform Access and Admin Shell
3. AI Catalog
4. AI Runtime
5. Agents Core
6. Credits, Ledger, and Observability
7. Dedicated Product Flows
8. Company Agent Catalog
9. Visual Builder
10. External Actions and Automations

Detailed implementation is split across two plan files:

- `docs/superpowers/plans/2026-05-21-agents-platform-foundation.md`
- `docs/superpowers/plans/2026-05-21-agents-product-builder.md`

---

## Review Requirements

Every implementation phase must be reviewed against:

- `company-os-backend`
- `company-os-frontend`
- `company-os-authz`
- `company-os-design`
- `company-os-review`

Blocking conditions:

- mutation endpoint without permission guard
- user id accepted from request body
- organization id accepted from request body
- provider credential exposed to frontend
- platform role mixed with organization role
- company data accessed without membership, platform role, or explicit support context
- direct provider call outside AI Runtime
- direct database access outside PrismaService in Nest application code
- UI action without PermissionGate or explicit ability check
