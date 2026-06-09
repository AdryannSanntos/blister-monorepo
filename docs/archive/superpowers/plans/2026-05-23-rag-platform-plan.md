# Project-Wide RAG Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma plataforma de RAG reutilizavel para o projeto inteiro, cobrindo ingestao, normalizacao, chunking, embeddings, busca hibrida, rerank, filtragem por permissao e montagem de contexto para agentes e outras superficies de IA.

**Architecture:** O plano move retrieval para um dominio proprio (`apps/api/src/rag/**`) e trata Brain, context sources, assets, design system, agentes, runs e contexto operacional de execucao como fontes indexaveis. O resultado e uma camada unica para produzir context packs permission-aware para company chat, agent chat, runtime de workflow e futuras features de IA.

**Tech Stack:** PostgreSQL + pgvector, Prisma, NestJS 11, Trigger.dev, AI runtime interno para embeddings, storage S3-compatible, CASL.

---

## Mandatory References Before Implementation

- `CLAUDE.md`
- `docs/README.md`
- `docs/decisions/stack-decisions.md`
- `docs/agents-flow.md`
- `docs/superpowers/specs/2026-05-23-agents-conversation-first-rag-design.md`
- `docs/superpowers/plans/2026-05-23-agents-schema-plan.md`
- `packages/authz/src/index.ts`

---

## Phase 1 Retrieval Scope

### Shared organization scope to index now

- onboarding / brain
- approved context sources
- context artifacts
- context-role assets
- design system profile and design assets
- company agents and workflow summaries
- agent context profile and agent-owned files
- agent context references
- run context snapshots
- relevant run summaries and reusable outputs
- selected integration metadata
- useful operational summaries from credits/runs when appropriate

### Future scope prepared but not activated now

- user-private memory
- per-user private chat memory
- private uploads outside shared organizational scope

### Additional requirement approved by user

The RAG platform must be prepared to index **agent-running context**, not only static company data.

This means the platform must support indexing:

- the agent's own persistent context
- the resolved context snapshot of a running/executed run
- relevant steps/events of the run
- reusable outputs/artifacts produced by that run

---

## Recommended Domain Boundaries

### 1. Source ingestion

Extracts and normalizes source content from:

- company context sources
- assets
- design system
- agent context files
- run snapshots
- outputs/artifacts

### 2. Canonical documents

Stores durable, versioned document records independent of how retrieval later chunks them.

### 3. Chunking and embeddings

Owns chunk generation, overlap strategy, embedding versioning, reindexing, and backfills.

### 4. Retrieval

Owns query embedding, hybrid search, filters, rerank, and dedupe.

### 5. Context assembly

Builds consumer-specific context packs for:

- company chat
- agent chat orchestration
- workflow runtime
- review surfaces
- future AI modules

---

## File Structure

### Files to create

- `apps/api/src/rag/rag.module.ts`
- `apps/api/src/rag/rag.controller.ts`
- `apps/api/src/rag/rag-indexing.service.ts`
- `apps/api/src/rag/rag-retrieval.service.ts`
- `apps/api/src/rag/rag-policy.service.ts`
- `apps/api/src/rag/rag-context-assembly.service.ts`
- `apps/api/src/rag/rag-chunking.service.ts`
- `apps/api/src/rag/rag-embedding.service.ts`
- `apps/api/src/rag/rag-document.service.ts`
- `apps/api/src/rag/dto/rag-index.dto.ts`
- `apps/api/src/rag/dto/rag-query.dto.ts`
- `apps/api/src/rag/dto/rag-context-pack.dto.ts`
- `apps/api/trigger/rag-index-document.task.ts`
- `apps/api/trigger/rag-reindex-scope.task.ts`
- `packages/types/src/rag/index.ts`

### Files to modify

- `apps/api/prisma/schema.prisma`
- `apps/api/src/ai-runtime/ai-runtime.service.ts`
- `apps/api/src/agents/context/structured-context.service.ts`
- `apps/api/src/agents/context/rag-context.service.ts`
- `apps/api/src/agents/context/context-reranker.service.ts`
- `apps/api/src/agents/context/context-policy.service.ts`
- `apps/api/src/agents/company-chat.service.ts`
- `apps/api/src/agents/agent-workflow-runtime.service.ts` after backend runtime exists
- source modules that should emit reindex jobs (context, design-system, agents, runs)

### Tests to create/update

- `apps/api/src/rag/rag-chunking.service.spec.ts`
- `apps/api/src/rag/rag-policy.service.spec.ts`
- `apps/api/src/rag/rag-retrieval.service.spec.ts`
- `apps/api/src/rag/rag-context-assembly.service.spec.ts`
- `apps/api/src/rag/rag-indexing.service.spec.ts`

---

## Schema Targets

Add durable vector-oriented models such as:

- `RagDocument`
- `RagDocumentVersion`
- `RagChunk`
- `RagChunkEmbedding`
- `RagIndexJob`

Recommended metadata dimensions:

- `scopeType`
  - `organization_shared`
  - `agent_context`
  - `agent_run_snapshot`
  - future `user_private`
- `sourceType`
  - `brain`
  - `context_source`
  - `asset`
  - `design_system`
  - `agent_context_profile`
  - `agent_context_file`
  - `agent_run_snapshot`
  - `agent_run_output`
- `organizationId`
- `agentId` when relevant
- `runId` when relevant
- `visibilityPolicy`
- `contentHash`
- `embeddingModel`
- `embeddingVersion`

---

## Task 1: Add vector schema and canonical document models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Test: `apps/api/src/rag/rag-indexing.service.spec.ts`

- [ ] **Step 1: Write failing test for canonical rag document contract**

```ts
it('stores a canonical document with scope and source metadata', async () => {
  const doc = await service.createDocument({
    sourceType: 'agent_run_snapshot',
    scopeType: 'organization_shared',
    organizationId: 'org_1',
    sourceId: 'snapshot_1',
    title: 'Run snapshot',
    content: 'Conteudo relevante',
  });

  expect(doc.sourceType).toBe('agent_run_snapshot');
});
```

- [ ] **Step 2: Add Prisma models for documents, versions, chunks, embeddings, and index jobs**

Expected: `pgvector`-compatible embedding storage and additive migration only.

- [ ] **Step 3: Run migration and generate Prisma client**

Run: `pnpm --filter @company-os/api prisma migrate dev --name rag_platform_foundation && pnpm --filter @company-os/api prisma generate`

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add rag platform schema foundation"
```

## Task 2: Build chunking and embedding services

**Files:**
- Create: `apps/api/src/rag/rag-chunking.service.ts`
- Create: `apps/api/src/rag/rag-embedding.service.ts`
- Modify: `apps/api/src/ai-runtime/ai-runtime.service.ts`
- Test: `apps/api/src/rag/rag-chunking.service.spec.ts`

- [ ] **Step 1: Write failing tests for chunk generation with metadata**

```ts
it('creates chunk records with offsets and metadata', async () => {
  const chunks = service.chunkDocument({ title: 'Doc', content: longContent });
  expect(chunks[0]?.metadata).toBeDefined();
});
```

- [ ] **Step 2: Implement chunking service with explicit strategy config**

Do not use a magic default without config. Expose chunk size and overlap through service config.

- [ ] **Step 3: Implement embedding service over the existing AI runtime embedding capability**

Expected: one wrapper responsible for embedding model resolution and version tagging.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test rag-chunking -- --runInBand`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/rag/rag-chunking.service.ts apps/api/src/rag/rag-embedding.service.ts apps/api/src/ai-runtime/ai-runtime.service.ts apps/api/src/rag/rag-chunking.service.spec.ts
git commit -m "feat(api): add rag chunking and embedding services"
```

## Task 3: Build indexing pipeline and trigger tasks

**Files:**
- Create: `apps/api/src/rag/rag-indexing.service.ts`
- Create: `apps/api/trigger/rag-index-document.task.ts`
- Create: `apps/api/trigger/rag-reindex-scope.task.ts`
- Test: `apps/api/src/rag/rag-indexing.service.spec.ts`

- [ ] **Step 1: Write failing test for indexing a document into chunks and embeddings**

```ts
it('indexes a canonical document into rag chunks and embeddings', async () => {
  const result = await service.indexDocument(documentId);
  expect(result.chunkCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Implement indexing pipeline**

Flow:

- load canonical document
- normalize content
- chunk
- embed
- upsert chunks and embedding rows
- mark index job result

- [ ] **Step 3: Add Trigger.dev tasks for async indexing and reindex/backfill**

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test rag-indexing -- --runInBand`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/rag/rag-indexing.service.ts apps/api/trigger/rag-index-document.task.ts apps/api/trigger/rag-reindex-scope.task.ts apps/api/src/rag/rag-indexing.service.spec.ts
git commit -m "feat(api): add rag indexing pipeline and async tasks"
```

## Task 4: Build permission-aware retrieval and policy filtering

**Files:**
- Create: `apps/api/src/rag/rag-policy.service.ts`
- Create: `apps/api/src/rag/rag-retrieval.service.ts`
- Test: `apps/api/src/rag/rag-policy.service.spec.ts`
- Test: `apps/api/src/rag/rag-retrieval.service.spec.ts`

- [ ] **Step 1: Write failing policy test for scope restrictions**

```ts
it('excludes chunks outside the allowed organization scope', async () => {
  const results = await service.retrieve(query);
  expect(results.every((item) => item.organizationId === 'org_1')).toBe(true);
});
```

- [ ] **Step 2: Implement retrieval with real query embedding and vector search**

Must not return empty unless there are genuinely no matches.

- [ ] **Step 3: Add hybrid retrieval and rerank hooks**

Initial implementation may combine vector score + keyword score + source weighting.

- [ ] **Step 4: Replace hardcoded permission arrays with actual policy evaluation**

Critical fix: retrieval callers must not inject fake permissions.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test rag-policy -- --runInBand && pnpm --filter @company-os/api test rag-retrieval -- --runInBand`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/rag/rag-policy.service.ts apps/api/src/rag/rag-retrieval.service.ts apps/api/src/rag/rag-policy.service.spec.ts apps/api/src/rag/rag-retrieval.service.spec.ts
git commit -m "feat(api): add permission-aware rag retrieval"
```

## Task 5: Build context assembly for consumers

**Files:**
- Create: `apps/api/src/rag/rag-context-assembly.service.ts`
- Create: `apps/api/src/rag/dto/rag-context-pack.dto.ts`
- Test: `apps/api/src/rag/rag-context-assembly.service.spec.ts`

- [ ] **Step 1: Write failing test for agent-execution context pack assembly**

```ts
it('assembles a context pack for agent execution with structured and retrieved evidence', async () => {
  const pack = await service.buildAgentExecutionPack(input);
  expect(pack.sources.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Implement separate pack builders**

Required pack builders:

- company chat
- agent chat orchestration
- agent workflow execution
- future review/output flows

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @company-os/api test rag-context-assembly -- --runInBand`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/rag/rag-context-assembly.service.ts apps/api/src/rag/dto/rag-context-pack.dto.ts apps/api/src/rag/rag-context-assembly.service.spec.ts
git commit -m "feat(api): add rag context pack assembly"
```

## Task 6: Connect source domains to RAG indexing

**Files:**
- Modify: `apps/api/src/context/context.service.ts`
- Modify: `apps/api/src/design-system/design-system.service.ts`
- Modify: `apps/api/src/agents/agents.service.ts`
- Modify: run/output creation points after backend runtime exists

- [ ] **Step 1: Emit indexing jobs when approved context sources change**

- [ ] **Step 2: Emit indexing jobs when design system artifacts change**

- [ ] **Step 3: Emit indexing jobs when agent context profile/files/references change**

- [ ] **Step 4: Emit indexing jobs when run snapshots or reusable outputs are produced**

- [ ] **Step 5: Run targeted tests**

Run: `pnpm --filter @company-os/api test rag-indexing -- --runInBand`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/context/context.service.ts apps/api/src/design-system/design-system.service.ts apps/api/src/agents/agents.service.ts
git commit -m "feat(api): wire source domains into rag indexing jobs"
```

## Task 7: Replace partial agents retrieval services with the shared RAG platform

**Files:**
- Modify: `apps/api/src/agents/context/structured-context.service.ts`
- Modify: `apps/api/src/agents/context/rag-context.service.ts`
- Modify: `apps/api/src/agents/context/context-reranker.service.ts`
- Modify: `apps/api/src/agents/company-chat.service.ts`
- Modify: `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- Modify: `apps/api/src/agents/agent-workflow-runtime.service.ts`

- [ ] **Step 1: Stop calling old rag search without query embeddings**

Critical fix: current company chat path returns empty vector results because it never passes `queryEmbedding`.

- [ ] **Step 2: Route company chat, agent orchestration, and workflow runtime through shared RAG services**

- [ ] **Step 3: Preserve visible context source data for chat UI**

- [ ] **Step 4: Run integration tests**

Run: `pnpm --filter @company-os/api test src/agents -- --runInBand && pnpm --filter @company-os/api test src/rag -- --runInBand`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/context apps/api/src/agents/company-chat.service.ts apps/api/src/agents/agent-chat-orchestrator.service.ts apps/api/src/agents/agent-workflow-runtime.service.ts
git commit -m "refactor(api): route agents retrieval through shared rag platform"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/api prisma generate`
- [ ] Run: `pnpm --filter @company-os/api test src/rag -- --runInBand`
- [ ] Run: `pnpm --filter @company-os/api test src/agents -- --runInBand`
- [ ] Run: `pnpm --filter @company-os/api lint`

Expected: project-wide retrieval foundation works, is permission-aware, and is ready to index both shared company context and agent-running context.
