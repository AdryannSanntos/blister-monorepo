# Agents Backend Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o backend conversation-first de agentes com orquestracao visivel no chat, decisao de intencao antes de abrir run, runtime de workflow orientado a grafo, subagentes sincronos, suspensao/retomada da mesma run e output final UI tipado.

**Architecture:** O backend passa a ter duas camadas distintas. Primeiro, uma camada de orquestracao de chat decide se a mensagem segue como conversa, leitura contextual ou execucao real. Segundo, quando houver execucao, um runtime de workflow orientado a blocos/traversal controla cada etapa, persiste checkpoints e retoma a mesma run em clarificacao, formulario ou validacao humana.

**Tech Stack:** NestJS 11, Prisma, Trigger.dev, Zod, CASL, AI runtime interno, storage S3-compatible, RAG platform.

---

## Mandatory References Before Implementation

- `CLAUDE.md`
- `docs/README.md`
- `docs/agents-flow.md`
- `docs/skills/agents-skill.md`
- `docs/superpowers/specs/2026-05-23-agents-conversation-first-rag-design.md`
- `docs/superpowers/plans/2026-05-23-agents-schema-plan.md`
- `packages/authz/src/index.ts`

---

## File Structure

### Files to create

- `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- `apps/api/src/agents/agent-workflow-runtime.service.ts`
- `apps/api/src/agents/agent-block-executor.registry.ts`
- `apps/api/src/agents/blocks/input-block.executor.ts`
- `apps/api/src/agents/blocks/decision-block.executor.ts`
- `apps/api/src/agents/blocks/boolean-block.executor.ts`
- `apps/api/src/agents/blocks/if-else-block.executor.ts`
- `apps/api/src/agents/blocks/agent-call-block.executor.ts`
- `apps/api/src/agents/blocks/clarification-block.executor.ts`
- `apps/api/src/agents/blocks/form-block.executor.ts`
- `apps/api/src/agents/blocks/validation-block.executor.ts`
- `apps/api/src/agents/blocks/output-formatter-block.executor.ts`
- `apps/api/src/agents/blocks/finalizer-block.executor.ts`
- `apps/api/src/agents/agent-context.service.ts`
- `apps/api/src/agents/agent-run-resume.service.ts`
- `apps/api/src/agents/dto/agent-chat-orchestration.dto.ts`

### Files to modify

- `apps/api/src/agents/agents.module.ts`
- `apps/api/src/agents/agent-chat.service.ts`
- `apps/api/src/agents/agent-chat.controller.ts`
- `apps/api/src/agents/agent-runs.service.ts`
- `apps/api/src/agents/agent-runs.controller.ts`
- `apps/api/src/agents/agent-execution.service.ts`
- `apps/api/src/agents/agent-intent.service.ts`
- `apps/api/src/agents/company-chat.service.ts` only if needed for shared orchestration helpers
- `apps/api/src/agents/dto/agent-version.dto.ts`
- `apps/api/src/agents/dto/index.ts`

### Tests to create/update

- `apps/api/src/agents/agent-chat-orchestrator.service.spec.ts`
- `apps/api/src/agents/agent-workflow-runtime.service.spec.ts`
- `apps/api/src/agents/agent-run-resume.service.spec.ts`
- `apps/api/src/agents/agent-chat.service.spec.ts`
- `apps/api/src/agents/agent-runs.service.spec.ts`
- `apps/api/src/agents/agent-intent.service.spec.ts`
- block executor specs under `apps/api/src/agents/blocks/*.spec.ts`

---

## Backend Principles

- `userId` always from `req.currentUser.id`
- sensitive reads/mutations keep `@RequirePermission(...)`
- chat orchestration is visible behavior, not hidden system magic
- not every message creates `AgentRun`
- `AgentRun` means operational workflow execution only
- all runtime pauses resume the same run
- subagent calls are synchronous in phase 1
- depth default is `3`, but system-configurable
- final output contract is a typed UI envelope
- graph execution must support fan-in and fan-out through named ports

---

## Port and Connection Semantics

The backend runtime must not treat edges as generic links only.

It must understand named ports and multi-connection semantics.

### Minimum edge contract

- `sourceNodeId`
- `sourcePortKey`
- `targetNodeId`
- `targetPortKey`

### Minimum runtime behaviors

- one output port may feed many downstream targets
- one node may wait for many upstream inputs
- each multi-input node declares a merge strategy
- output branches must be resolved by port key, not by array order

### Approved merge strategies to implement or scaffold

- `all_required`
- `any_first`
- `append_list`
- `object_merge`
- `manual_mapping`

### Block-level analysis for port behavior

| Block | Multi-input? | Multi-output? | Runtime expectation |
|---|---|---|---|
| `input` | no | yes through fan-out | one payload can feed many blocks |
| `decision` | usually no | yes | route to one of several named outputs |
| `boolean` | usually no | yes | route to `true` or `false` |
| `if_else` | yes | yes | can receive a `condition` input and a separate `payload` input |
| `agent_call` | yes | usually no | combine request plus support inputs into child input |
| `clarification` | yes | usually no | question can be based on multiple upstream inputs |
| `form` | yes | usually no | form generation can combine several upstream values |
| `validation` | yes | yes | candidate, criteria, and reference can branch to `pass`, `fail`, `needs_review` |
| `output_formatter` | yes | usually no | combine multiple upstream artifacts into UI output |
| `finalizer` | yes | usually no | consolidate final deliverable plus terminal metadata |

### Variations the runtime must be safe for

1. `input` fans out into both `decision` and `form`.
2. `boolean.true` and `boolean.false` feed different downstream blocks.
3. `if_else` receives condition and payload from different upstream nodes.
4. `agent_call` receives primary request plus additional context payloads.
5. `validation` receives candidate output plus a reference output from another branch.
6. `output_formatter` merges outputs from parent branch and child agent branch.
7. `finalizer` receives formatted UI plus terminal audit metadata.

---

## Task 1: Create conversation-first orchestration layer

**Files:**
- Create: `apps/api/src/agents/agent-chat-orchestrator.service.ts`
- Create: `apps/api/src/agents/dto/agent-chat-orchestration.dto.ts`
- Modify: `apps/api/src/agents/agent-chat.service.ts`
- Test: `apps/api/src/agents/agent-chat-orchestrator.service.spec.ts`

- [ ] **Step 1: Write failing tests for orchestration modes**

```ts
it('keeps exploratory messages conversational without opening a run', async () => {
  const result = await service.orchestrateMessage({
    organizationId,
    agentId,
    userId,
    message: 'quais referencias voce usaria para responder isso?',
  });

  expect(result.mode).toBe('conversation');
  expect(result.createRun).toBe(false);
});

it('promotes final-deliverable messages into execution', async () => {
  const result = await service.orchestrateMessage({
    organizationId,
    agentId,
    userId,
    message: 'gere agora o briefing final em formato de entrega',
  });

  expect(result.mode).toBe('execution');
  expect(result.createRun).toBe(true);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm --filter @company-os/api test agent-chat-orchestrator -- --runInBand`  
Expected: FAIL because orchestrator service does not exist yet.

- [ ] **Step 3: Implement orchestration DTO and service**

The result contract should include:

- `mode`
- `createRun`
- `events`
- `resolvedContextHints`
- `executionReason`

- [ ] **Step 4: Integrate orchestrator into `AgentChatService.createUserMessageAndProcess`**

Behavior:

- store the user message
- run orchestrator
- if conversational, return assistant-visible orchestration parts without opening `AgentRun`
- if execution, create run and attach visible orchestration parts to chat metadata

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test agent-chat-orchestrator -- --runInBand && pnpm --filter @company-os/api test agent-chat -- --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/agent-chat-orchestrator.service.ts apps/api/src/agents/dto/agent-chat-orchestration.dto.ts apps/api/src/agents/agent-chat.service.ts apps/api/src/agents/agent-chat-orchestrator.service.spec.ts
git commit -m "feat(api): add conversation-first agent chat orchestration"
```

## Task 2: Expand workflow DTO contract to phase 1 block set

**Files:**
- Modify: `apps/api/src/agents/dto/agent-version.dto.ts`
- Test: `apps/api/src/agents/dto/agent-version.dto.spec.ts`

- [ ] **Step 1: Write failing DTO tests for approved phase 1 blocks**

```ts
it('accepts an agent_call block with target agent mapping', () => {
  expect(() => validateBlock({
    id: 'call-1',
    type: 'agent_call',
    config: { targetAgentId: 'agent_2', inputTemplate: '{{input}}' },
  })).not.toThrow();
});

it('accepts a form block with ai-generated option instructions', () => {
  expect(() => validateBlock({
    id: 'form-1',
    type: 'form',
    config: {
      title: 'Coletar contexto',
      generationInstructions: 'Gerar opcoes relevantes para o publico-alvo.',
      fields: [{ id: 'audience', label: 'Publico', type: 'single_select', required: true }],
    },
  })).not.toThrow();
});
```

- [ ] **Step 2: Replace legacy block union with the approved phase 1 set**

Support:

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

- [ ] **Step 3: Model config-rich schemas for each block**

Important details:

- `form` stores structure + generation instructions, not final options
- `validation` supports internal mode and human-review mode
- `agent_call` stores target agent and input mapping

- [ ] **Step 4: Run DTO tests**

Run: `pnpm --filter @company-os/api test agent-version.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/dto/agent-version.dto.ts apps/api/src/agents/dto/agent-version.dto.spec.ts
git commit -m "feat(api): expand workflow dto to phase 1 block set"
```

## Task 3: Introduce agent context resolution and snapshot creation

**Files:**
- Create: `apps/api/src/agents/agent-context.service.ts`
- Modify: `apps/api/src/agents/agent-runs.service.ts`
- Test: `apps/api/src/agents/agent-runs.service.spec.ts`

- [ ] **Step 1: Write failing test for run context snapshot creation**

```ts
it('creates a run with a frozen context snapshot', async () => {
  const run = await service.createQueuedRun(orgId, agentId, userId, input);
  const snapshot = await prisma.agentRunContextSnapshot.findUnique({ where: { runId: run.id } });
  expect(snapshot).not.toBeNull();
});
```

- [ ] **Step 2: Implement `AgentContextService.resolveForRun(...)`**

It must merge:

- company inherited context
- agent instructions
- agent-owned files
- company references linked to the agent

- [ ] **Step 3: Persist `AgentRunContextSnapshot` during run creation**

Run: update `createQueuedRun` to resolve and freeze context before execution promotion.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test agent-runs -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/agent-context.service.ts apps/api/src/agents/agent-runs.service.ts apps/api/src/agents/agent-runs.service.spec.ts
git commit -m "feat(api): resolve and snapshot agent context per run"
```

## Task 4: Build graph-aware runtime shell and executor registry

**Files:**
- Create: `apps/api/src/agents/agent-workflow-runtime.service.ts`
- Create: `apps/api/src/agents/agent-block-executor.registry.ts`
- Modify: `apps/api/src/agents/agent-execution.service.ts`
- Test: `apps/api/src/agents/agent-workflow-runtime.service.spec.ts`

- [ ] **Step 1: Write failing test for graph traversal**

```ts
it('follows next block from explicit edge traversal instead of raw array order', async () => {
  const result = await runtime.run({ runId, flowDefinition });
  expect(result.visitedBlockIds).toEqual(['input', 'decision-1', 'formatter-1', 'finalizer-1']);
});
```

- [ ] **Step 2: Implement runtime shell responsibilities**

The runtime should:

- load run + version + snapshot
- locate current block
- dispatch executor by block type
- persist step + checkpoint
- choose next block
- end or suspend cleanly

- [ ] **Step 3: Add port-aware traversal and merge semantics to the runtime shell**

The runtime must:

- resolve outgoing edges by `sourcePortKey`
- aggregate incoming values by `targetPortKey`
- enforce node merge strategy before executing a multi-input block
- support fan-out from one output to many downstream edges

- [ ] **Step 4: Move `AgentExecutionService` into orchestration role only**

- [ ] **Step 3: Move `AgentExecutionService` into orchestration role only**

Run: keep queue/trigger coordination there, but delegate actual flow execution to the runtime service.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test agent-workflow-runtime -- --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/agent-workflow-runtime.service.ts apps/api/src/agents/agent-block-executor.registry.ts apps/api/src/agents/agent-execution.service.ts apps/api/src/agents/agent-workflow-runtime.service.spec.ts
git commit -m "feat(api): add graph-aware workflow runtime shell"
```

## Task 4A: Add explicit tests for fan-in and fan-out behavior

**Files:**
- Modify: `apps/api/src/agents/agent-workflow-runtime.service.spec.ts`

- [ ] **Step 1: Write failing fan-out test**

```ts
it('allows one output port to feed more than one downstream block', async () => {
  const result = await runtime.run({ runId, flowDefinition: fanOutFixture });
  expect(result.visitedBlockIds).toContain('form-1');
  expect(result.visitedBlockIds).toContain('decision-1');
});
```

- [ ] **Step 2: Write failing fan-in test**

```ts
it('waits for all required named inputs before executing a multi-input node', async () => {
  const result = await runtime.run({ runId, flowDefinition: fanInFixture });
  expect(result.visitedBlockIds[result.visitedBlockIds.length - 1]).toBe('output-formatter-1');
});
```

- [ ] **Step 3: Add test for validation with candidate + reference inputs**

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test agent-workflow-runtime -- --runInBand`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/agent-workflow-runtime.service.spec.ts
git commit -m "test(api): cover workflow fan-in and fan-out semantics"
```

## Task 5: Implement phase 1 block executors

**Files:**
- Create: `apps/api/src/agents/blocks/*.ts`
- Test: `apps/api/src/agents/blocks/*.spec.ts`

- [ ] **Step 1: Implement and test `input` executor**

Expected behavior: normalize initial payload and seed workflow state.

- [ ] **Step 2: Implement and test `decision` and `boolean` executors**

Expected behavior: use AI/runtime policy to return explicit branch decision values and route via named output ports.

- [ ] **Step 3: Implement and test `if_else` executor**

Expected behavior: read named condition input, optionally merge a separate payload input, and route to `if` or `else`.

- [ ] **Step 4: Implement and test `clarification` executor**

Expected behavior: create `AgentRunSuspension(type=clarification)` and pause same run.

- [ ] **Step 5: Implement and test `form` executor**

Expected behavior:

- build form payload
- generate answer choices using company context + agent context + execution state
- persist resolved form payload on suspension
- support generation from more than one upstream input when connected that way

- [ ] **Step 6: Implement and test `validation` executor**

Expected behavior:

- internal pass/fail mode
- optional human-review suspension mode
- support candidate + criteria + reference multi-input patterns
- route using `pass`, `fail`, or `needs_review` named outputs

- [ ] **Step 7: Implement and test `output_formatter` and `finalizer` executors**

Expected behavior:

- produce final UI envelope
- persist it to run
- mark completion cleanly
- support multi-input aggregation for formatter/finalizer blocks

- [ ] **Step 8: Run block test suite**

Run: `pnpm --filter @company-os/api test src/agents/blocks -- --runInBand`  
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/agents/blocks apps/api/src/agents/agent-block-executor.registry.ts
git commit -m "feat(api): implement phase 1 workflow block executors"
```

## Task 6: Implement synchronous `agent_call` with lineage and depth limit

**Files:**
- Create: `apps/api/src/agents/blocks/agent-call-block.executor.ts`
- Modify: `apps/api/src/agents/agent-runs.service.ts`
- Modify: `apps/api/src/agents/agent-workflow-runtime.service.ts`
- Test: `apps/api/src/agents/blocks/agent-call-block.executor.spec.ts`

- [ ] **Step 1: Write failing test for child run lineage**

```ts
it('creates a child run with parent lineage and waits for final ui output', async () => {
  const result = await executor.execute(context);
  expect(result.childRun.parentRunId).toBe(context.run.id);
  expect(result.output.blocks.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Enforce system-configurable depth with default 3**

If the caller exceeds allowed depth, fail the block with explicit error and visible step metadata.

- [ ] **Step 3: Create child run and wait synchronously for completion**

Run: implement parent-child linkage and blocking wait through runtime/queue coordination.

- [ ] **Step 4: Return child final UI output to parent state**

Expected: parent workflow can validate/format based on child output.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test agent-call-block -- --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/blocks/agent-call-block.executor.ts apps/api/src/agents/agent-runs.service.ts apps/api/src/agents/agent-workflow-runtime.service.ts apps/api/src/agents/blocks/agent-call-block.executor.spec.ts
git commit -m "feat(api): add synchronous subagent execution"
```

## Task 7: Implement same-run resume APIs for clarification, form, and validation

**Files:**
- Create: `apps/api/src/agents/agent-run-resume.service.ts`
- Modify: `apps/api/src/agents/agent-runs.controller.ts`
- Modify: `apps/api/src/agents/dto/index.ts`
- Test: `apps/api/src/agents/agent-run-resume.service.spec.ts`

- [ ] **Step 1: Write failing tests for resuming the same run**

```ts
it('resumes the same run after a form response', async () => {
  const resumed = await service.answerSuspension(orgId, runId, suspensionId, userId, { answers: { audience: 'CEO' } });
  expect(resumed.id).toBe(runId);
});
```

- [ ] **Step 2: Add POST endpoint for suspension answers**

Suggested route:

`POST /organizations/:orgId/agent-runs/:runId/suspensions/:suspensionId/respond`

- [ ] **Step 3: Persist answer round and re-enqueue same run**

Run: mark suspension answered, append response record, re-trigger runtime from checkpoint.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test agent-run-resume -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/agent-run-resume.service.ts apps/api/src/agents/agent-runs.controller.ts apps/api/src/agents/dto/index.ts apps/api/src/agents/agent-run-resume.service.spec.ts
git commit -m "feat(api): add same-run suspension resume endpoints"
```

## Task 8: Expose agent context management APIs

**Files:**
- Modify: `apps/api/src/agents/agents.controller.ts`
- Create: service methods inside `apps/api/src/agents/agents.service.ts` or a dedicated `agent-context.service.ts`
- Test: `apps/api/src/agents/agents.service.spec.ts`

- [ ] **Step 1: Add failing tests for reading and updating agent context profile**

```ts
it('updates persistent agent context without creating a new version', async () => {
  const result = await service.updateAgentContext(orgId, agentId, userId, { instructions: 'Novo contexto' });
  expect(result.instructions).toBe('Novo contexto');
});
```

- [ ] **Step 2: Add context endpoints guarded with `agent.update` / `agent.read`**

Suggested endpoints:

- `GET /organizations/:orgId/agents/:agentId/context`
- `PATCH /organizations/:orgId/agents/:agentId/context`
- `POST /organizations/:orgId/agents/:agentId/context/files`
- `DELETE /organizations/:orgId/agents/:agentId/context/files/:fileId`
- `PUT /organizations/:orgId/agents/:agentId/context/references`

- [ ] **Step 3: Run service/controller tests**

Run: `pnpm --filter @company-os/api test agents.service -- --runInBand && pnpm --filter @company-os/api test src/agents -- --runInBand`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/agents/agents.controller.ts apps/api/src/agents/agents.service.ts apps/api/src/agents/agent-context.service.ts apps/api/src/agents/agents.service.spec.ts
git commit -m "feat(api): expose persistent agent context management"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/api test src/agents -- --runInBand`
- [ ] Run: `pnpm --filter @company-os/api lint`
- [ ] Run: `pnpm --filter @company-os/api typecheck`

Expected: chat orchestration, runtime, blocks, subagent flow, and suspension resume all pass tests and compile cleanly.
