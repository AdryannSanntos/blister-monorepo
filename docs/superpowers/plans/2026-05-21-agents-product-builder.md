# Agents Product Flows And Builder Implementation Plan

> **Update 2026-05-22:** This plan is partially superseded by:
> - `docs/superpowers/plans/2026-05-22-agents-context-execution-core.md`
> - `docs/superpowers/plans/2026-05-22-agents-full-focus-chat-workflow.md`
>
> In V1, company catalog is custom-only and full-focus single-agent workspace is mandatory.
> System/default templates may exist as platform internals, but they are not visible catalog entries in V1.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build user-facing agent experiences: company agent catalog, single-agent workspace, workspace run history and costs, and a visual block-based agent builder. Dedicated Analysis, Copy, Image, Post, and Email flows in this historical plan are superseded for V1 unless instantiated as custom company agents.

**Architecture:** Product screens execute versioned agents through the Agents Core. The visual builder edits draft `AgentVersion` flow JSON and never calls providers directly. Workspace screens use company permissions and active organization context.

**Tech Stack:** Next.js 16, React 19, TanStack Query, DataTable, nuqs, React Flow or equivalent canvas library, shadcn/ui, Tailwind v4 tokens, NestJS agent APIs from the platform foundation plan.

---

## Scope

This plan depends on `docs/superpowers/plans/2026-05-21-agents-platform-foundation.md`.

Included:

- historical dedicated product flow examples only when instantiated as custom company agents
- company agent catalog
- workspace agent run history
- workspace credit and usage views
- visual builder using a specialized canvas library
- draft/publish/activate UX
- dry-run and sandbox testing UX
- future-ready external action blocks, disabled by policy initially

Excluded from initial delivery:

- automatic publishing to social networks
- real email sending from agents
- arbitrary custom JavaScript execution
- unrestricted graph/DAG workflows with free parallelism

---

## File Structure

### Frontend files to create

- `apps/web/src/core/modules/agents/hooks/use-agents.ts` — company agent queries/mutations
- `apps/web/src/core/modules/agents/hooks/use-agent-runs.ts` — run queries/mutations
- `apps/web/src/core/modules/agents/hooks/use-agent-builder.ts` — builder state helpers
- `apps/web/src/core/modules/agents/pages/agents-page.tsx` — company agent catalog
- `apps/web/src/core/modules/agents/pages/agent-detail-page.tsx` — overview, versions, history
- `apps/web/src/core/modules/agents/pages/agent-builder-page.tsx` — visual builder route
- `apps/web/src/core/modules/agents/pages/agent-history-page.tsx` — workspace runs history
- `apps/web/src/core/modules/agents/pages/agent-credits-page.tsx` — workspace credits and usage
- Analysis/Copy/Image/Post/Email dedicated pages — historical examples only; do not create fixed V1 routes unless they are custom company agent workspaces
- `apps/web/src/core/modules/agents/components/agents-table.tsx` — company agent DataTable
- `apps/web/src/core/modules/agents/components/agent-run-table.tsx` — run DataTable
- `apps/web/src/core/modules/agents/components/agent-run-detail-sheet.tsx` — run detail sheet
- `apps/web/src/core/modules/agents/components/agent-output-preview.tsx` — output renderer
- `apps/web/src/core/modules/agents/components/agent-flow-builder.tsx` — canvas composition
- `apps/web/src/core/modules/agents/components/builder-toolbar.tsx` — builder toolbar
- `apps/web/src/core/modules/agents/components/builder-node-panel.tsx` — selected node settings
- `apps/web/src/core/modules/agents/components/builder-test-panel.tsx` — dry-run testing panel
- `apps/web/src/core/modules/agents/components/nodes/input-node.tsx` — input block
- `apps/web/src/core/modules/agents/components/nodes/brain-context-node.tsx` — brain context block
- `apps/web/src/core/modules/agents/components/nodes/context-retrieval-node.tsx` — retrieval block
- `apps/web/src/core/modules/agents/components/nodes/llm-generate-node.tsx` — LLM block
- `apps/web/src/core/modules/agents/components/nodes/condition-node.tsx` — condition block
- `apps/web/src/core/modules/agents/components/nodes/image-generate-node.tsx` — image block
- `apps/web/src/core/modules/agents/components/nodes/transform-node.tsx` — transform block
- `apps/web/src/core/modules/agents/components/nodes/output-node.tsx` — output block
- `apps/web/src/core/modules/agents/components/nodes/review-gate-node.tsx` — review block
- `apps/web/src/core/modules/agents/schemas/agent-flow-schema.ts` — client-side Zod validation for builder flow
- `apps/web/src/app/dashboard/workspace/agents/page.tsx` — company agents route
- `apps/web/src/app/dashboard/workspace/agents/history/page.tsx` — run history route
- `apps/web/src/app/dashboard/workspace/agents/credits/page.tsx` — credits route
- Dedicated Analysis/Copy/Image/Post/Email app routes — superseded for V1; use the custom agent workspace route instead
- `apps/web/src/app/dashboard/workspace/agents/[agentId]/page.tsx` — agent detail route
- `apps/web/src/app/dashboard/workspace/agents/[agentId]/builder/page.tsx` — builder route

### Frontend files to modify

- `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx` — replace coming-soon agent links with real routes
- `apps/web/src/core/shared/components/ui/app-sidebar.tsx` — update default sidebar item metadata if used in showcases
- `apps/web/package.json` — add canvas dependency after stack decision is documented
- `docs/decisions/stack-decisions.md` — record canvas library decision

### Backend files to extend if missing from foundation

- `apps/api/src/agents/agents.controller.ts` — ensure dry-run endpoints exist without exposing system templates as V1 catalog defaults
- `apps/api/src/agents/agent-runs.controller.ts` — ensure polling/detail endpoints support product screens
- `apps/api/src/agents/dto/agent-run.dto.ts` — add dedicated flow input schemas if backend validates per workflow

---

## Task 1: Document And Install Canvas Library

**Files:**
- Modify: `docs/decisions/stack-decisions.md`
- Modify: `apps/web/package.json`
- Modify lockfile generated by package manager

- [ ] **Step 1: Record stack decision**

Add a decision entry for a specialized graph/canvas library.

Decision content:

- reason: visual agent builder needs handles, edges, pan/zoom, selection, minimap-ready extensibility, and graph state
- constraint: all visual primitives must be wrapped and styled with Workana AI tokens
- accepted risk: dependency adds bundle weight, mitigated by loading only on builder routes

- [ ] **Step 2: Install dependency**

Run: `pnpm --filter @company-os/web add @xyflow/react`

Expected: package and lockfile update.

- [ ] **Step 3: Verify install**

Run: `pnpm --filter @company-os/web lint`

Expected: lint still passes or only reports unrelated existing issues.

- [ ] **Step 4: Review checkpoint**

Use `company-os-frontend`, `company-os-design`, and `company-os-review`.

Must verify no new UI library replaces shadcn/ui; the canvas library is used only for graph behavior.

---

## Task 2: Add Agent Hooks And Types

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-agents.ts`
- Create: `apps/web/src/core/modules/agents/hooks/use-agent-runs.ts`
- Create: `apps/web/src/core/modules/agents/schemas/agent-flow-schema.ts`

- [ ] **Step 1: Define frontend agent types**

Types:

- `CompanyAgent`
- `AgentTemplate`
- `AgentVersion`
- `AgentRun`
- `AgentRunStep`
- `AgentFlowNode`
- `AgentFlowEdge`
- `AgentFlowDefinition`

- [ ] **Step 2: Add Zod flow schema**

Validate:

- at least one input node
- at least one output node
- supported node types only
- condition nodes have condition config
- LLM nodes have required capability or model preference
- image nodes require image generation capability

- [ ] **Step 3: Add React Query hooks**

Hooks:

- `useCompanyAgents(orgId)`
- `useCompanyAgent(orgId, agentId)`
- `useCreateCompanyAgent(orgId)`
- `useSaveAgentDraft(orgId, agentId)`
- `usePublishAgentVersion(orgId, agentId)`
- `useActivateAgentVersion(orgId, agentId)`
- `useRunAgent(orgId, agentId)`
- `useAgentRuns(orgId, filters)`
- `useAgentRun(orgId, runId)`

- [ ] **Step 4: Verify no direct HTTP in pages**

All API calls must live in hooks.

- [ ] **Step 5: Run lint**

Run: `pnpm --filter @company-os/web lint`

Expected: lint passes.

---

## Task 3: Build Company Agents Catalog

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/agents-page.tsx`
- Create: `apps/web/src/core/modules/agents/components/agents-table.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Add route page**

Route: `/dashboard/workspace/agents`

Use `PageLayout` with eyebrow `Workspace`.

- [ ] **Step 2: Build agents DataTable**

Columns:

- name
- visibility: custom catalog item
- status
- active version
- last run
- average credits/run
- updated at
- actions

Filters:

- visibility
- status
- category

Bulk actions:

- archive when `agent.delete` is available

Export columns:

- name
- visibility
- status
- last run
- average credits

- [ ] **Step 3: Add actions**

Actions:

- open detail
- run now
- edit draft
- duplicate
- view history

Gate actions with `PermissionGate` using `agent.*` permissions.

- [ ] **Step 4: Replace sidebar placeholder**

Change `Meus agentes` from coming soon to real route.

Use permission `agent.read` when available.

- [ ] **Step 5: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with `company-os-frontend`, `company-os-design`, and `company-os-review`.

---

## Task 4: Build Workspace Run History

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/agent-history-page.tsx`
- Create: `apps/web/src/core/modules/agents/components/agent-run-table.tsx`
- Create: `apps/web/src/core/modules/agents/components/agent-run-detail-sheet.tsx`
- Create: `apps/web/src/core/modules/agents/components/agent-output-preview.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/history/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Add route page**

Route: `/dashboard/workspace/agents/history`

Use `PageLayout` with eyebrow `Workspace`.

- [ ] **Step 2: Build DataTable**

Columns:

- agent
- user
- origin
- status
- credits
- technical status summary
- started at
- duration
- actions

Filters:

- agent
- status
- origin
- period

- [ ] **Step 3: Add run detail sheet**

Show:

- input summary
- output preview
- steps timeline
- provider/model used
- credits charged
- retry/replay action

Do not show hidden retrieval ranking, confidence, provider secrets, or raw internal metadata to normal company users.

- [ ] **Step 4: Add polling**

Runs in `queued` or `running` should poll every 3 seconds.

- [ ] **Step 5: Replace sidebar placeholder**

Change `Histórico` from coming soon to real route.

Use permission `agent.run.read`.

- [ ] **Step 6: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project frontend/design/review skills.

---

## Task 5: Build Workspace Credits And Usage View

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/agent-credits-page.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/credits/page.tsx`
- Modify: `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx`

- [ ] **Step 1: Add route page**

Route: `/dashboard/workspace/agents/credits`

Use `PageLayout` with eyebrow `Workspace`.

- [ ] **Step 2: Add summary cards**

Cards:

- current balance
- last 30 days usage
- average cost per run
- top agent by usage

- [ ] **Step 3: Add ledgers DataTable**

Columns:

- date
- type
- agent/run reference
- user
- credits
- reason

Filters:

- type
- period
- agent

- [ ] **Step 4: Replace sidebar credits placeholder**

Change `Créditos` from coming soon to real route when route is ready.

Use permission `credit.read`.

- [ ] **Step 5: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project frontend/design/review skills.

---

## Task 6: Build Dedicated Analysis Flow

> **Superseded for Agents V1:** Do not implement Tasks 6-10 as fixed sidebar items, fixed visible routes, or visible default/template agents. Reuse these form/output details only as examples when a company creates a custom agent.

**Files:**
- No fixed V1 files. Use these details only inside a custom agent workspace.

- [ ] **Step 1: Add input form**

Fields:

- objective
- source scope: Brain, Context, Assets, Design System
- material ids optional
- desired output format

Use RHF + Zod.

- [ ] **Step 2: Add output preview**

Render structured sections:

- summary
- findings
- recommended next actions
- reusable snippets

- [ ] **Step 3: Execute agent**

Use `useRunAgent` against the custom company agent instance.

- [ ] **Step 4: Add run status UI**

Show step tracker:

- reading context
- analyzing
- structuring output
- done

- [ ] **Step 5: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project frontend/design/review skills.

---

## Task 7: Build Dedicated Copy Flow

**Files:**
- No fixed V1 files. Use these details only inside a custom agent workspace.

- [ ] **Step 1: Add input form**

Fields:

- copy type
- product/service
- target audience
- tone
- platforms
- references
- variations count

- [ ] **Step 2: Add output cards**

Actions:

- copy
- edit inline
- save to history
- adapt
- create post
- regenerate variation

- [ ] **Step 3: Execute agent**

Use the custom company agent instance.

- [ ] **Step 4: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Task 8: Build Dedicated Image Flow

**Files:**
- No fixed V1 files. Use these details only inside a custom agent workspace.

- [ ] **Step 1: Add input form**

Fields:

- description
- style
- aspect ratio
- prompt assist toggle
- variations count
- optional visual reference

- [ ] **Step 2: Add output grid**

Generated files must be loaded from S3-compatible storage references in the run payload. Do not embed image binaries or ad hoc file URLs in `AgentRun.output`.

Actions:

- download
- preview
- regenerate
- vary
- use in post
- save to history

- [ ] **Step 3: Capability validation**

Only models with `supportsImageGeneration` should appear for image execution preferences.

- [ ] **Step 4: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Task 9: Build Dedicated Post Flow

**Files:**
- No fixed V1 files. Use these details only inside a custom agent workspace.

- [ ] **Step 1: Add input form**

Fields:

- topic
- platform
- objective
- format
- include creative
- tone
- hashtags behavior

- [ ] **Step 2: Add output preview**

Render:

- post text
- image prompt or image output
- hashtags
- carousel slides when selected

- [ ] **Step 3: Add future publishing affordance**

Show scheduling/publishing as disabled or policy-blocked when side effects are not enabled.

- [ ] **Step 4: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Task 10: Build Dedicated Email Flow

**Files:**
- No fixed V1 files. Use these details only inside a custom agent workspace.

- [ ] **Step 1: Add input form**

Fields:

- email type
- objective
- recipient segment
- tone
- CTA
- length
- include subject
- include preview text

- [ ] **Step 2: Add output preview**

Render:

- subject line options
- preview text
- body
- HTML/text mode toggle

- [ ] **Step 3: Add future send affordance**

Show sending as disabled or review-required until external email side effects are enabled.

- [ ] **Step 4: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Task 11: Build Agent Detail And Version UX

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/agent-detail-page.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/[agentId]/page.tsx`

- [ ] **Step 1: Add overview tab**

Show:

- status
- source template
- active version
- last run
- average credits
- allowed actions

- [ ] **Step 2: Add versions tab**

Table columns:

- version
- status
- published at
- published by
- active
- actions

- [ ] **Step 3: Add history tab**

Reuse `AgentRunTable` filtered by agent.

- [ ] **Step 4: Add actions**

Actions:

- open builder
- create draft
- publish draft
- activate version
- run now

Gate with `PermissionGate`.

- [ ] **Step 5: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Task 12: Build Visual Agent Builder Shell

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/agent-builder-page.tsx`
- Create: `apps/web/src/core/modules/agents/components/agent-flow-builder.tsx`
- Create: `apps/web/src/core/modules/agents/components/builder-toolbar.tsx`
- Create: `apps/web/src/core/modules/agents/components/builder-node-panel.tsx`
- Create: `apps/web/src/core/modules/agents/components/builder-test-panel.tsx`
- Create: `apps/web/src/app/dashboard/workspace/agents/[agentId]/builder/page.tsx`

- [ ] **Step 1: Add builder route layout**

Route: `/dashboard/workspace/agents/:agentId/builder`

Use the shared full-focus agent workspace layout, not the dashboard shell. The agent workspace internal nav must expose Chat, Workflow, Executions, and Settings.

- [ ] **Step 2: Add canvas**

Use the selected canvas library for graph behavior.

Wrap nodes and edges with project-styled components.

- [ ] **Step 3: Add toolbar**

Toolbar actions:

- save draft
- validate
- test
- publish
- activate
- exit

- [ ] **Step 4: Add node panel**

Selected node config appears in a right-side panel.

Use RHF + Zod where forms are complex.

- [ ] **Step 5: Add test panel**

Dry-run input, run status, step timeline, and output preview.

- [ ] **Step 6: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with `company-os-design` to ensure the builder does not look like default React Flow UI.

---

## Task 13: Add Builder Nodes

**Files:**
- Create: `apps/web/src/core/modules/agents/components/nodes/*.tsx`
- Modify: `apps/web/src/core/modules/agents/components/agent-flow-builder.tsx`

- [ ] **Step 1: Add Input node**

Configures input schema and sample input.

- [ ] **Step 2: Add Brain Context node**

Configures whether Brain context is injected.

- [ ] **Step 3: Add Context Retrieval node**

Configures source scope and retrieval intent.

- [ ] **Step 4: Add LLM Generate node**

Configures prompt, required capability, model preference, temperature, and output format.

- [ ] **Step 5: Add Condition node**

Configures simple branch conditions.

- [ ] **Step 6: Add Image Generate node**

Configures image prompt, size, style, and required image capability.

- [ ] **Step 7: Add Transform node**

Supports controlled transformations only. Do not add arbitrary JavaScript execution in MVP.

- [ ] **Step 8: Add Output node**

Configures output type and render hints.

- [ ] **Step 9: Add Review Gate node**

Configures human approval requirement for future side effects.

- [ ] **Step 10: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project frontend/design/review skills.

---

## Task 14: Add Builder Validation And Publishing UX

**Files:**
- Modify: `apps/web/src/core/modules/agents/schemas/agent-flow-schema.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-builder-page.tsx`
- Modify: `apps/web/src/core/modules/agents/components/builder-toolbar.tsx`

- [ ] **Step 1: Validate flow locally before save**

Rules:

- input exists
- output exists
- unsupported block types rejected
- image node requires image-capable model policy
- condition node has valid branches
- no disconnected required node

- [ ] **Step 2: Save draft**

Call `useSaveAgentDraft`.

Show toast on success and invalidate agent query.

- [ ] **Step 3: Publish draft**

Call `usePublishAgentVersion`.

Require confirmation dialog.

- [ ] **Step 4: Activate version**

Call `useActivateAgentVersion`.

Require confirmation dialog showing that active runs use this version going forward.

- [ ] **Step 5: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Task 15: Prepare Future External Actions

**Files:**
- Modify: builder node registry files
- Modify: agent flow schema
- Modify: product flow pages where future actions appear

- [ ] **Step 1: Add disabled future block metadata**

Future blocks:

- Publish Channel
- Send Email
- Call Integration
- Webhook

They appear as disabled or policy-blocked options, not executable actions.

- [ ] **Step 2: Add policy messaging**

Explain that external actions require platform policy and review gate.

- [ ] **Step 3: Add audit requirement to docs inside UI copy**

Whenever future side effect UI appears, make clear it will be audited when enabled.

- [ ] **Step 4: Run lint and review**

Run: `pnpm --filter @company-os/web lint`

Review with project skills.

---

## Final Verification For Plan 2

- [ ] Run frontend lint: `pnpm --filter @company-os/web lint`
- [ ] Run frontend typecheck if script exists: `pnpm --filter @company-os/web typecheck`
- [ ] Run backend agent tests relevant to run execution: `pnpm --filter @company-os/api test agents agent-runs`
- [ ] Review all UI with `company-os-design`
- [ ] Review all frontend architecture with `company-os-frontend`
- [ ] Review all permissions and gated actions with `company-os-authz`
- [ ] Run final merge-blocking review with `company-os-review`
