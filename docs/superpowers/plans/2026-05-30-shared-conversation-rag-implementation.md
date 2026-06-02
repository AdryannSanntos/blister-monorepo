# Shared Conversation and RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar `agent chat` para um runtime conversacional com SSE e eventos persistidos, removendo o legado de chat e entregando uma plataforma RAG compartilhada, configurável e reaproveitável para o restante do produto.

**Architecture:** O backend ganha um domínio conversacional separado de `AgentRun`, com event log persistido, projeções de replay e stream SSE. Em paralelo, o domínio RAG evolui para uma plataforma compartilhada por organization, com fontes indexáveis registradas, retrieval permission-aware e cache de pesquisa web. O frontend do chat passa a fundir histórico persistido com stream ao vivo, usando apenas `GenericTool` e `ToolGroup` para a narrativa operacional.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, Zod, Trigger.dev, Next.js 16, React 19, TanStack Query, `agent-elements`, Jest.

---

## Mandatory Reading and Skill Order

1. `CLAUDE.md`
2. `docs/skills/agents-skill.md`
3. `apps/web/AGENTS.md`
4. `docs/superpowers/specs/2026-05-30-shared-conversation-rag-design.md`

### Mandatory skills during execution

- `company-os-backend`
- `company-os-design`
- `agent-elements`
- `verification-before-completion`

---

## File Structure

### Files to create

- `apps/api/src/conversation/conversation.module.ts`
- `apps/api/src/conversation/conversation-stream.controller.ts`
- `apps/api/src/conversation/conversation-query.controller.ts`
- `apps/api/src/conversation/conversation.service.ts`
- `apps/api/src/conversation/conversation-event-store.service.ts`
- `apps/api/src/conversation/conversation-projection.service.ts`
- `apps/api/src/conversation/conversation-sse.service.ts`
- `apps/api/src/conversation/dto/conversation-event.dto.ts`
- `apps/api/src/conversation/dto/conversation-stream.dto.ts`
- `apps/api/src/conversation/conversation.service.spec.ts`
- `apps/api/src/conversation/conversation-projection.service.spec.ts`
- `apps/api/src/conversation/conversation-sse.service.spec.ts`
- `apps/api/src/rag/rag-source-registry.service.ts`
- `apps/api/src/rag/rag-ingestion.service.ts`
- `apps/api/src/rag/rag-indexing.service.ts`
- `apps/api/src/rag/rag-embedding.service.ts`
- `apps/api/src/rag/rag-policy.service.ts`
- `apps/api/src/rag/web-research-cache.service.ts`
- `apps/api/src/rag/providers/<provider>.gateway.ts`
- `apps/api/src/rag/rag-indexing.service.spec.ts`
- `apps/api/src/rag/rag-retrieval.service.spec.ts`
- `apps/api/src/rag/web-research-cache.service.spec.ts`
- `apps/web/src/core/modules/agents/hooks/use-agent-chat-stream.ts`
- `apps/web/src/core/modules/agents/lib/agent-chat-event-reducer.ts`
- `apps/web/src/core/modules/agents/lib/agent-chat-display-state.ts`
- `apps/web/src/core/modules/agents/components/chat/chat-stream-tool-groups.ts`
- `apps/web/src/core/modules/agents/components/chat/chat-stream-message.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-replay-adapter.ts`

### Files to modify

- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/agents/agents.module.ts`
- `apps/api/src/agents/agent-chat.controller.ts`
- `apps/api/src/agents/agent-chat.service.ts`
- `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- `apps/api/src/agents/agent-tool-runtime.service.ts`
- `apps/api/src/agents/tools/rag-search.tool.ts`
- `apps/api/src/agents/tools/file-search.tool.ts`
- `apps/api/src/agents/tools/web-research.tool.ts`
- `apps/api/src/rag/rag-context-assembly.service.ts`
- `apps/api/src/agents/agent-context.service.ts`
- `apps/api/src/agents/dto/agent-chat-tool.dto.ts`
- `apps/api/src/agents/dto/agent-chat-orchestration.dto.ts`
- `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- `apps/web/src/core/modules/agents/pages/agent-chat-page.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`
- `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts`
- `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`

---

### Task 1: Add the persistent conversation schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/conversation/dto/conversation-event.dto.ts`
- Test: `apps/api/src/conversation/conversation-projection.service.spec.ts`

- [ ] Add persistent models for:
  - raw conversation event log
  - message projection
  - tool call projection
- [ ] Scope all models by `organizationId`
- [ ] Link them to existing `agentChatThread` and `agentChatMessage`
- [ ] Add `sequence` and indexes needed for deterministic replay
- [ ] Add status fields for message and tool lifecycle
- [ ] Validate schema with `pnpm prisma validate`

### Task 2: Create the shared conversation module

**Files:**
- Create: `apps/api/src/conversation/conversation.module.ts`
- Create: `apps/api/src/conversation/conversation.service.ts`
- Create: `apps/api/src/conversation/conversation-event-store.service.ts`
- Create: `apps/api/src/conversation/conversation-projection.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/conversation/conversation.service.spec.ts`

- [ ] Create a module detached from `AgentRun`
- [ ] Centralize:
  - append event
  - apply/rebuild projection
  - fetch replay
  - expose message/tool projection state
- [ ] Keep the module consumer-agnostic so `company chat` can adopt it later
- [ ] Add focused tests for append/apply/query flows

### Task 3: Add the SSE transport layer for conversation

**Files:**
- Create: `apps/api/src/conversation/conversation-stream.controller.ts`
- Create: `apps/api/src/conversation/conversation-query.controller.ts`
- Create: `apps/api/src/conversation/conversation-sse.service.ts`
- Create: `apps/api/src/conversation/dto/conversation-stream.dto.ts`
- Test: `apps/api/src/conversation/conversation-sse.service.spec.ts`

- [ ] Define the canonical SSE payload contract
- [ ] Implement streaming response with `text/event-stream`
- [ ] Ensure ordered event IDs and `sequence`
- [ ] Make stream interruption safe because persistence is the source of truth
- [ ] Expose replay query endpoints for the frontend initial load
- [ ] Add ordering, success and failure tests

### Task 4: Refactor agent chat orchestration to emit conversation events

**Files:**
- Modify: `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- Modify: `apps/api/src/agents/dto/agent-chat-orchestration.dto.ts`
- Modify: `apps/api/src/agents/dto/agent-chat-tool.dto.ts`
- Test: `apps/api/src/agents/agent-chat-orchestrator.service.spec.ts`

- [ ] Change the orchestrator from “return one final object” to “emit semantic events plus final projection data”
- [ ] Preserve:
  - tool loop decisions
  - citations
  - context hints
- [ ] Emit at least:
  - message start
  - text delta/snapshot
  - tool started/progress/completed/failed
  - citations emitted
  - message completed/failed
- [ ] Keep workflow execution out of scope

### Task 5: Refactor `AgentChatService` to use the shared conversation pipeline

**Files:**
- Modify: `apps/api/src/agents/agent-chat.service.ts`
- Modify: `apps/api/src/agents/agent-chat.controller.ts`
- Test: `apps/api/src/agents/agent-chat.service.spec.ts`

- [ ] Replace the current synchronous message-processing path with:
  - persist user message
  - create assistant message container
  - delegate to conversation stream runtime
- [ ] Keep thread ownership and organization validation
- [ ] Preserve edit/branch, rename and delete behavior where still valid
- [ ] Return replay-friendly query shapes instead of legacy mixed response payloads

### Task 6: Expand RAG into a shared configurable platform

**Files:**
- Create: `apps/api/src/rag/rag-source-registry.service.ts`
- Create: `apps/api/src/rag/rag-ingestion.service.ts`
- Create: `apps/api/src/rag/rag-indexing.service.ts`
- Create: `apps/api/src/rag/rag-embedding.service.ts`
- Create: `apps/api/src/rag/rag-policy.service.ts`
- Modify: `apps/api/src/rag/rag-context-assembly.service.ts`
- Test: `apps/api/src/rag/rag-indexing.service.spec.ts`
- Test: `apps/api/src/rag/rag-retrieval.service.spec.ts`

- [ ] Promote existing RAG pieces into a source-driven platform
- [ ] Normalize canonical documents from:
  - Brain
  - Context Sources
  - Agent Context Files
  - Agent Context References
  - Assets
  - Web research cache
- [ ] Keep primary partition by `organization`
- [ ] Support agent-derived views via filters and configuration
- [ ] Add retrieval knobs:
  - sources
  - top-k
  - score threshold
  - chunk config
  - source weighting
- [ ] Preserve permission-aware filtering

### Task 7: Add the real web research provider and cache

**Files:**
- Create: `apps/api/src/rag/web-research-cache.service.ts`
- Create: `apps/api/src/rag/providers/<provider>.gateway.ts`
- Modify: `apps/api/src/agents/tools/web-research.tool.ts`
- Modify: `apps/api/src/agents/agent-tool-runtime.service.ts`
- Test: `apps/api/src/rag/web-research-cache.service.spec.ts`

- [ ] Replace the stub-only path with a real provider gateway
- [ ] Persist normalized external results
- [ ] Index cached results into the RAG platform
- [ ] Reuse cached research when relevant
- [ ] Keep the provider behind a pluggable adapter boundary

### Task 8: Build frontend replay + streaming state

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-agent-chat-stream.ts`
- Create: `apps/web/src/core/modules/agents/lib/agent-chat-event-reducer.ts`
- Create: `apps/web/src/core/modules/agents/lib/agent-chat-display-state.ts`
- Modify: `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`

- [ ] Add an SSE-aware client hook
- [ ] Merge persisted replay state with live stream state
- [ ] Support:
  - ordered sequence application
  - reconnect from last sequence
  - in-flight assistant message state
  - in-flight tool state
- [ ] Remove polling as the primary chat mechanism

### Task 9: Replace legacy chat rendering with `GenericTool` and `ToolGroup` only

**Files:**
- Create: `apps/web/src/core/modules/agents/components/chat/chat-stream-tool-groups.ts`
- Create: `apps/web/src/core/modules/agents/components/chat/chat-stream-message.tsx`
- Create: `apps/web/src/core/modules/agents/components/chat/chat-replay-adapter.ts`
- Modify: `apps/web/src/core/modules/agents/pages/agent-chat-page.tsx`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-bubble.tsx`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`

- [ ] Render operational history using only:
  - `ToolGroup`
  - `GenericTool`
- [ ] Keep assistant text stream visible in the same message flow
- [ ] Preserve current spacing and `AgentInactiveDialog`
- [ ] Remove chat rendering dependencies on `agentRun.steps`

### Task 10: Remove the legacy `agent chat` compatibility paths

**Files:**
- Modify: `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts`
- Modify: `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts`
- Modify: `apps/api/src/agents/agent-chat.service.ts`
- Modify: `apps/api/src/agents/agent-chat.controller.ts`

- [ ] Remove polling-first assumptions from the official chat path
- [ ] Remove old render fallbacks and adapters that exist only for mixed legacy/new modes
- [ ] Remove synchronous response contracts no longer consumed by the frontend
- [ ] Keep compatibility only where persisted historical data truly requires it

### Task 11: Verification

**Files:**
- Test: `apps/api/src/conversation/*.spec.ts`
- Test: `apps/api/src/agents/*.spec.ts`
- Test: `apps/api/src/rag/*.spec.ts`
- Test: frontend affected modules if coverage exists

- [ ] Run focused backend tests for:
  - conversation module
  - agent chat/orchestrator
  - rag platform
- [ ] Run relevant frontend tests if present
- [ ] Run typecheck/lint for affected apps
- [ ] Manually verify:
  - send message
  - stream text
  - stream tools
  - persist replay
  - reopen thread
  - see full operational history
  - reuse indexed web research

---

## Risks to manage during execution

- recoupling the new chat to `AgentRun`
- persisting too many low-value delta rows without snapshots
- ambiguous coexistence of old `toolParts` and new event-based tools
- web provider instability affecting UX
- retrieval drift when organization-wide and agent-scoped context are mixed without weighting

---

## Recommended execution order

1. conversation schema
2. shared conversation module
3. SSE transport
4. orchestrator and chat backend migration
5. RAG platform expansion
6. web research provider and cache
7. frontend stream state
8. frontend rendering migration
9. legacy removal
10. verification
