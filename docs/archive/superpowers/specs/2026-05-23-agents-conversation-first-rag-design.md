# Agents Conversation-First and Project-Wide RAG Design

**Date:** 2026-05-23  
**Status:** Approved by user in planning conversation  
**Scope:** Agents workflow model, chat orchestration, subagents, run lifecycle, agent context, and reusable RAG platform

---

## Why This Spec Exists

The current agents implementation in Workana AI already has important foundations:

- versioned `CompanyAgent` and `AgentVersion`
- queued `AgentRun` and `AgentRunStep`
- agent chat threads and messages
- a basic workflow builder
- partial retrieval services (`structured`, `rag`, `rerank`)

However, the current system diverges from `docs/agents-flow.md` in core behavior:

- every user message tends to promote directly into execution
- workflow execution is still linear instead of graph-aware
- agent-private context is not modeled as a first-class persistent layer
- clarification/form/validation do not pause and resume the same run
- subagent lineage is not explicit
- final output is not yet a stable UI contract
- current RAG is only partial and not reusable across the product

This spec replaces those assumptions with the approved target model below.

---

## Source of Truth

This spec is the approved design target for the next agents iteration.

When historical plans conflict with this document:

1. `CLAUDE.md`
2. current product decisions explicitly approved by the user in this planning thread
3. `docs/agents-flow.md`
4. this design spec
5. older plans/specs in `docs/superpowers/`

The existing `docs/decisions/2026-05-22-agents-v1-contract.md` remains useful as historical baseline, but this spec is the new target where it diverges.

---

## Product Rules

### 1. Chat is conversation-first

Agent chat is not workflow-first.

Not every message should create an `AgentRun`.

Each incoming message must first pass through a visible orchestration layer that decides whether the system should:

- answer conversationally
- inspect references/context and show that in the chat
- or escalate into workflow execution

### 2. Orchestration must be visible

Anything the AI does before or during execution must appear in the chat as UI, not as hidden backend behavior.

Examples:

- it read a reference
- it loaded context
- it classified intent
- it decided to execute
- it called a subagent
- it asked for clarification
- it generated a form
- it validated an intermediate result

### 3. Agent context is layered

Every agent always inherits the global company context automatically.

Every agent also has its own persistent private layer at the agent level, containing:

- agent instructions
- agent-owned files
- references to company-owned sources/assets/context

This agent-specific layer is not per version and not per run.

### 4. Run context must be reproducible

Even though the agent context can change at any time, each run must store a full snapshot of the effective context used when that run started.

That snapshot must be sufficient for:

- auditability
- replay/debugging
- downstream indexing for RAG

### 5. The same run must resume

Clarification, form collection, and optional validation review must pause and resume the same `AgentRun`, not spawn a replacement run.

### 6. Subagents stay inside the parent chat

When an agent calls another agent, the user stays in the parent chat.

The child execution is visible inline in the parent conversation.

If the child needs clarification, that question appears inline in the parent chat and resumes the child run from there.

### 7. Final output must be UI-typed

The backend must no longer rely on loose final text.

The final output of an agent and of any subagent must be a structured UI payload that the frontend can render deterministically.

### 8. RAG is a platform, not an agent-only helper

Retrieval, chunking, embedding, indexing, reranking, permission filtering, and context assembly must move into a reusable platform domain that can serve the whole project.

Agents are a major consumer of that platform, but not the only one.

---

## Agent Context Model

## Global company context

The global company context is inherited automatically by every agent.

This includes, at minimum, the approved/shared operational knowledge of the organization, such as:

- Brain / onboarding context
- approved context sources
- approved context artifacts
- context-role assets
- design system knowledge
- organization-level operational summaries

## Agent-specific context

Each `CompanyAgent` owns a persistent context profile with:

- instructions and operational guidance
- agent-owned files
- references to organization-level sources

This is shared by every version of that agent.

Changing it should affect future runs immediately, without forcing publish/activate.

## Run-time snapshot

When a run starts, the system resolves:

- inherited company context
- agent-owned context
- agent file set
- company references attached to the agent

and stores a run snapshot before continuing execution.

---

## Conversation and Execution Model

## Step 1: intent orchestration

Every user message first enters a chat orchestration layer.

The orchestration layer decides one of three modes:

1. conversational response only
2. context/retrieval activity shown in chat without opening a run
3. workflow execution because the request represents a final action or final deliverable

Approved default rule:

- exploratory questions, information gathering, interpretation, and context browsing remain conversational
- workflow execution starts only when the system identifies a final action/final deliverable request

## Step 2: optional visible context activity

If the orchestration layer uses references, context, runs, or other knowledge sources, those activities should appear in the chat as AI UI components.

## Step 3: workflow execution

If the message requires execution, the system creates an `AgentRun` and starts the workflow runtime.

---

## Workflow Model

## Phase 1 workflow scope

Phase 1 keeps **one workflow per agent version**.

The model should still be designed so that multiple workflows per agent can be introduced later without a domain rewrite.

## Phase 1 block set

Approved phase 1 blocks:

- `input`
- `decision`
- `boolean`
- `if_else`
- `agent_call`
- `clarification`
- `form`
- `validation`
- `output_formatter`
- `finalizer`

The previous `context` and `file-read` blocks do not exist as explicit phase 1 blocks.

Their behavior becomes implicit runtime behavior.

## Connections, Ports, and Data Flow

The workflow model must support more than one incoming or outgoing connection per block.

This is not a future nice-to-have. The graph contract must be designed now for:

- fan-out: one output feeding multiple downstream blocks
- fan-in: one block waiting for multiple upstream inputs
- named outputs: a block exposing more than one semantic path
- named inputs: a block receiving different categories of data on different ports

### Edge contract

The workflow JSON must evolve from a node-only structure into a node-plus-edge graph.

Each edge should identify at minimum:

- `sourceNodeId`
- `sourcePortKey`
- `targetNodeId`
- `targetPortKey`

This is required so the runtime and builder can distinguish:

- `boolean.true` vs `boolean.false`
- `validation.pass` vs `validation.fail` vs `validation.needs_review`
- `formatter.sectionA` vs `formatter.sectionB` when needed later
- multiple payload channels entering the same block

### Merge strategies for multi-input blocks

Nodes that receive multiple inputs must declare how they wait and merge those values.

Phase 1 supported merge strategies should be designed as explicit runtime metadata, such as:

- `all_required`: waits for all connected required inputs
- `any_first`: continues with the first arriving valid input
- `append_list`: concatenates multiple upstream values into an array/list input
- `object_merge`: merges named inputs into a keyed object payload
- `manual_mapping`: uses block config to map upstream ports into a structured input object

### Node port analysis for phase 1 blocks

The runtime and builder should assume the following minimum port model.

| Block | Inputs | Outputs | Why multi-port matters |
|---|---|---|---|
| `input` | none | `payload` | One input node can fan out to many downstream blocks. |
| `decision` | `subject` | `route_a`, `route_b`, `route_n` | Decision may route to more than two paths. |
| `boolean` | `subject` | `true`, `false` | Explicit two-output branch. |
| `if_else` | `condition`, optional `payload` | `if`, `else` | Supports separate condition and data payload. |
| `agent_call` | `request`, optional supporting inputs | `result` | Parent may compose child input from more than one upstream source. |
| `clarification` | `question_basis`, optional context inputs | `answer` | The question may depend on multiple upstream values. |
| `form` | `form_basis`, optional supporting inputs | `answers` | Form generation may combine context from several upstream blocks. |
| `validation` | `candidate`, optional `criteria`, optional `reference` | `pass`, `fail`, `needs_review` | Validation often needs comparison inputs and can branch to more than one path. |
| `output_formatter` | one or many named content inputs | `ui_output` | Final output often combines multiple upstream artifacts. |
| `finalizer` | one or many inputs | `final` | Finalizer may consolidate multiple formatted outputs or metadata channels. |

### Approved usage variations to support in planning

The implementation must be safe for several realistic variations, not only the simplest path.

Examples:

1. A single `input` feeding both `form` and `decision`, where the decision can skip the form.
2. A `boolean` block splitting the flow into `true` and `false` outputs.
3. An `if_else` block receiving a condition output and a separate payload input.
4. An `agent_call` block receiving a primary request plus one or more support inputs.
5. A `validation` block comparing a candidate output against a reference input.
6. An `output_formatter` block combining text from a parent branch and UI output returned by a subagent.
7. A `finalizer` block receiving both the formatted deliverable and final audit metadata.

The runtime may execute phase 1 subagents synchronously, but the graph contract must already be able to express these fan-in and fan-out topologies.

## Visual rule for blocks

All workflow blocks share the same visual base component in the builder.

What changes per block:

- icon
- label
- category
- handles/ports when needed
- configuration schema
- runtime behavior

What does not change:

- the base visual language of the node

---

## Clarification, Form, and Validation

## Clarification block

`clarification` is a point question.

It pauses the current run and awaits one explicit response from the user before resuming the same run.

## Form block

`form` is a structured multi-question collection block.

The builder stores:

- question structure
- field types
- required flags
- generation instructions

The builder does **not** store the final answer choices for the run.

At runtime, the AI must generate the predefined answer choices based on:

- company context
- agent context
- current execution context

This means each run must persist the resolved form shown to the user, including the exact generated choices.

The form may support:

- predefined options generated by AI
- `other`
- fully free response when no predefined options are appropriate

## Validation block

`validation` is a checkpoint for intermediate output quality/completeness.

Phase 1 approved behavior is hybrid:

- default mode: validate internally and continue automatically
- optional mode: pause the same run and ask the user to confirm, adjust, or complement the result

---

## Subagent Model

## Execution semantics

Phase 1 `agent_call` is synchronous.

The parent waits for the child to finish before continuing.

## Context passed to child

The child receives only:

- inherited company context
- its own agent context
- the explicit input sent by the parent

It does not inherit:

- parent private context
- parent in-progress state
- parent chat history by default

## Visibility

All child activity appears inline in the parent chat.

## Depth control

Subagent chains are allowed.

Depth is system-configurable, with approved default `3`.

## Return contract

The child always returns its own final UI-typed output.

The parent may use that result in later blocks, validation, or final formatting.

---

## UI Output Contract

Final outputs must be renderable through a stable UI contract.

Initial supported block types should include at least:

- `text`
- `markdown`
- `list`
- `card`
- `image`
- `cta`

The output formatter block is the workflow-level place where internal state becomes final UI output.

The frontend must render this payload directly instead of reconstructing meaning from run steps.

---

## Reusable RAG Platform

## Role of the platform

RAG becomes a reusable backend platform for retrieval and context assembly across the product.

It should not live only as ad hoc helper logic inside `apps/api/src/agents/context/**`.

## Core responsibilities

- source ingestion
- normalization
- canonical documents
- chunking
- embedding generation
- vector indexing
- reranking / hybrid retrieval
- permission-aware filtering
- context assembly for different surfaces

## Phase 1 indexed scope

The first phase indexes shared organizational and operational knowledge, including:

- brain/onboarding data
- approved context sources
- context artifacts
- assets/context assets
- design system profile and assets
- agents and workflow summaries
- runs and reusable outputs
- integration metadata
- credit and operational summaries when useful as retrieval evidence

## Agent-running context indexing

The platform must also be prepared to index agent-running context, not just static company context.

This includes at least:

- agent context profile
- agent-owned files
- agent context references
- run context snapshots
- relevant run steps and execution summaries
- reusable run outputs and artifacts

## User-private memory

The architecture must be designed for future user-private memory retrieval, but phase 1 should not activate or mix that memory into the shared organizational retrieval path.

---

## Main Gaps Against Current Code

## Database

Current code lacks:

- agent-level persistent context domain
- run context snapshot domain
- run suspension/response domain
- explicit subagent lineage fields
- durable UI output contract persistence
- explicit embedding/chunk/vector models for project-wide RAG

## Backend

Current code lacks:

- conversation-first orchestration before runs
- graph-aware workflow execution
- phase 1 block executor set
- same-run resume semantics for clarification/form/validation
- synchronous `agent_call` with parent/child lineage
- RAG actually injected into prompts/execution
- reusable retrieval platform boundary

## Frontend

Current code lacks:

- chat orchestration UI parts before runs
- full block catalog/configuration for phase 1
- inline clarification/form/validation resume flow
- explicit subagent inline experience in the parent chat
- final UI output renderer as first-class contract

---

## Implementation Domains

This spec is intentionally decomposed into four execution plans:

1. schema plan
2. backend plan
3. frontend plan
4. RAG platform plan

Recommended execution order:

1. schema
2. RAG platform
3. backend
4. frontend

---

## Success Criteria

The design is considered delivered only when:

- not every chat message creates a run
- orchestration activities appear in the chat as UI
- agent context is persistent at the agent level
- every run stores a reproducible context snapshot
- clarification/form/validation can pause and resume the same run
- subagents run inside the parent chat flow with lineage
- final outputs use a stable UI contract
- retrieval becomes reusable across the whole project
- the RAG platform is ready to index both shared company context and agent-running context
