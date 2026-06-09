# Agents Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remodelar o schema de agentes para suportar contexto persistido do agente, snapshots por run, subagentes com linhagem explicita, pausa/retomada da mesma run e output final tipado para UI.

**Architecture:** O plano preserva as entidades-base ja existentes (`CompanyAgent`, `AgentVersion`, `AgentRun`, `AgentRunStep`, chat) e adiciona camadas novas em volta delas. O contexto proprio do agente vive no nivel do agente, enquanto cada run congela um snapshot reproduzivel do contexto efetivo utilizado e registra suspensoes/respostas para retomada do mesmo fluxo.

**Tech Stack:** Prisma, PostgreSQL, NestJS 11, Zod, CASL (`packages/authz`), storage S3-compatible.

---

## Mandatory References Before Implementation

- `CLAUDE.md`
- `docs/README.md`
- `docs/agents-flow.md`
- `docs/decisions/stack-decisions.md`
- `docs/skills/agents-skill.md`
- `docs/superpowers/specs/2026-05-23-agents-conversation-first-rag-design.md`
- `packages/authz/src/index.ts`

---

## Scope

This plan covers only persistence and schema contracts.

It does **not** implement the runtime or the UI.

### Existing entities to preserve

- `CompanyAgent`
- `AgentVersion`
- `AgentRun`
- `AgentRunStep`
- `AgentChatThread`
- `AgentChatMessage`
- `CreditLedgerEntry`
- `TechnicalCostLedgerEntry`

### New persistence capabilities required

- agent-level context profile
- agent-owned files
- agent references to company sources
- run-time context snapshots
- run suspension/resume state
- suspension answers per round
- explicit subagent lineage
- richer run-step metadata for graph execution and UI rendering
- typed final UI output storage
- port-aware workflow graph contract with named input/output connections

---

## File Structure

### Files to modify

- `apps/api/prisma/schema.prisma`
- `apps/api/src/generated/prisma/**` (generated only, never manual edits)
- `apps/api/src/agents/dto/agent.dto.ts`
- `apps/api/src/agents/dto/agent-run.dto.ts`
- `apps/api/src/agents/dto/agent-version.dto.ts`
- `packages/types/src/**` if shared contracts are introduced there during execution

### Files to create

- `apps/api/prisma/migrations/<timestamp>_agents_context_runtime_schema/migration.sql`
- `apps/api/src/agents/dto/agent-context.dto.ts`
- `apps/api/src/agents/dto/agent-run-suspension.dto.ts`
- `apps/api/src/agents/dto/ui-output.dto.ts`

### Tests to add/update

- `apps/api/src/agents/dto/agent-version.dto.spec.ts`
- `apps/api/src/agents/dto/agent-run.dto.spec.ts`
- `apps/api/src/agents/dto/agent-context.dto.spec.ts`
- `apps/api/src/agents/dto/ui-output.dto.spec.ts`

---

## Target Data Model

### Agent-level context

- `AgentContextProfile`
  - 1:1 with `CompanyAgent`
  - persistent instructions
  - context notes
  - operational metadata

- `AgentContextFile`
  - file uploaded specifically for the agent
  - object key, public URL if needed, filename, mime, size, status

- `AgentContextReference`
  - stable reference from agent to company knowledge sources
  - supports typed targets such as:
    - `context_source`
    - `asset`
    - `design_system_profile`
    - future `integration_reference`

### Run-time context snapshot

- `AgentRunContextSnapshot`
  - 1:1 with `AgentRun`
  - stores the resolved effective context for reproducibility

- `AgentRunContextSnapshotItem`
  - detailed provenance for each included item
  - includes source type, source id, label, metadata, and stored text/summary when appropriate

### Run suspension and resume

- `AgentRunSuspension`
  - linked to run and step
  - types:
    - `clarification`
    - `form`
    - `validation`
  - status:
    - `pending`
    - `answered`
    - `cancelled`
  - stores resolved prompt/form payload shown to the user

- `AgentRunSuspensionResponse`
  - linked to suspension
  - stores each user answer round
  - must support form answers and free text

### Subagent lineage

Add to `AgentRun`:

- `rootRunId`
- `parentRunId`
- `parentStepId`
- `depth`

### Runtime checkpointing

Add to `AgentRun`:

- `currentBlockId`
- `currentBlockType`
- `waitingReason`
- `resumeStatus`

### Richer run steps

Add to `AgentRunStep`:

- `sequence`
- `branchKey`
- `inputType`
- `outputType`
- `statePayload`
- `uiOutputPayload`

### Port-aware workflow graph contract

The persistence model must explicitly support nodes that receive more than one input or emit more than one output.

This does **not** require a new Prisma table if the graph remains stored inside `AgentVersion.flowDefinition`, but the contract must be formalized in DTOs and runtime-oriented metadata.

Required graph-level fields:

- `nodes`
- `edges`
- optional workflow-level metadata

Required edge fields:

- `id`
- `sourceNodeId`
- `sourcePortKey`
- `targetNodeId`
- `targetPortKey`

Required node port concepts:

- input port keys
- output port keys
- merge strategy for multi-input nodes
- optional port typing metadata

Required minimum merge strategies:

- `all_required`
- `any_first`
- `append_list`
- `object_merge`
- `manual_mapping`

This contract must be detailed enough for blocks such as:

- `boolean`: outputs `true` and `false`
- `validation`: outputs `pass`, `fail`, and `needs_review`
- `output_formatter`: can combine many upstream inputs
- `agent_call`: can receive request plus supporting inputs

---

## Task 1: Add agent context entities

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/agents/dto/agent-context.dto.ts`
- Test: `apps/api/src/agents/dto/agent-context.dto.spec.ts`

- [ ] **Step 1: Write failing DTO test for agent context payload**

```ts
it('accepts an agent context payload with instructions, files and references', () => {
  const parsed = upsertAgentContextSchema.parse({
    instructions: 'Sempre responder com foco operacional.',
    notes: 'Usado pelo agente de briefing.',
    references: [
      { sourceType: 'context_source', sourceId: 'ctx_1' },
      { sourceType: 'asset', sourceId: 'asset_1' },
    ],
  });

  expect(parsed.references).toHaveLength(2);
});
```

- [ ] **Step 2: Run DTO test to confirm failure before schema creation**

Run: `pnpm --filter @company-os/api test agent-context.dto -- --runInBand`  
Expected: FAIL because schema/spec file does not exist yet.

- [ ] **Step 3: Add Prisma models for `AgentContextProfile`, `AgentContextFile`, and `AgentContextReference`**

```prisma
model AgentContextProfile {
  id             String   @id @default(cuid())
  agentId        String   @unique
  instructions   String?  @db.Text
  notes          String?  @db.Text
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  agent          CompanyAgent @relation(fields: [agentId], references: [id], onDelete: Cascade)
  files          AgentContextFile[]
  references     AgentContextReference[]
}
```

- [ ] **Step 4: Add file/reference child models with indexes by agent profile**

Run: update `schema.prisma` with indexed relations for profile children and source typing.

- [ ] **Step 5: Create `agent-context.dto.ts` with Zod schemas**

```ts
export const agentContextReferenceSchema = z.object({
  sourceType: z.enum(['context_source', 'asset', 'design_system_profile']),
  sourceId: z.string().min(1),
});
```

- [ ] **Step 6: Run Prisma format and DTO tests**

Run: `pnpm --filter @company-os/api prisma format && pnpm --filter @company-os/api test agent-context.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/agent-context.dto.ts apps/api/src/agents/dto/agent-context.dto.spec.ts
git commit -m "feat(api): add agent context profile schema"
```

## Task 2: Add run context snapshot entities

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/agents/dto/agent-run.dto.ts`
- Test: `apps/api/src/agents/dto/agent-run.dto.spec.ts`

- [ ] **Step 1: Write failing DTO test for run context snapshot contract**

```ts
it('accepts a run context snapshot with layered sources', () => {
  const parsed = agentRunContextSnapshotSchema.parse({
    runId: 'run_1',
    layers: {
      company: { summary: 'empresa' },
      agent: { summary: 'agente' },
    },
    items: [{ sourceType: 'agent_file', sourceId: 'file_1', label: 'Brand PDF' }],
  });

  expect(parsed.items[0]?.sourceType).toBe('agent_file');
});
```

- [ ] **Step 2: Add `AgentRunContextSnapshot` and `AgentRunContextSnapshotItem` to Prisma**

Include fields for `layers`, `resolvedSummary`, `metadata`, and per-item provenance.

- [ ] **Step 3: Extend `AgentRun` relation graph to include snapshot**

Run: update `AgentRun` with `contextSnapshot AgentRunContextSnapshot?` relation.

- [ ] **Step 4: Add DTO schema for snapshot payloads**

```ts
export const agentRunContextSnapshotItemSchema = z.object({
  sourceType: z.string().min(1),
  sourceId: z.string().min(1),
  label: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test agent-run.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/agent-run.dto.ts apps/api/src/agents/dto/agent-run.dto.spec.ts
git commit -m "feat(api): add run context snapshot schema"
```

## Task 3: Add suspension and response entities for same-run resume

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/agents/dto/agent-run-suspension.dto.ts`
- Test: `apps/api/src/agents/dto/agent-run-suspension.dto.spec.ts`

- [ ] **Step 1: Write failing test for suspension payload types**

```ts
it('accepts form suspension payload with generated options', () => {
  const parsed = createRunSuspensionResponseSchema.parse({
    suspensionId: 'susp_1',
    answers: {
      audience: 'Gestores',
      channel: 'Email',
    },
  });

  expect(parsed.answers.audience).toBe('Gestores');
});
```

- [ ] **Step 2: Add `AgentRunSuspension` and `AgentRunSuspensionResponse` models**

Store suspension `type`, `status`, `resolvedPayload`, `roundNumber`, and `answeredAt` metadata.

- [ ] **Step 3: Add checkpoint fields to `AgentRun`**

Add:

- `currentBlockId`
- `currentBlockType`
- `waitingReason`
- `resumeStatus`

- [ ] **Step 4: Create DTO schemas for clarification/form/validation responses**

Run: add dedicated Zod schemas for pending suspension answers.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @company-os/api test agent-run-suspension.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/agent-run-suspension.dto.ts apps/api/src/agents/dto/agent-run-suspension.dto.spec.ts
git commit -m "feat(api): add run suspension and resume schema"
```

## Task 4: Add subagent lineage and depth controls

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/agents/dto/agent-run.dto.ts`
- Test: `apps/api/src/agents/dto/agent-run.dto.spec.ts`

- [ ] **Step 1: Add failing test for parent-child lineage fields**

```ts
it('accepts parent-child lineage metadata for subagent runs', () => {
  const parsed = agentRunLineageSchema.parse({
    rootRunId: 'run_root',
    parentRunId: 'run_parent',
    parentStepId: 'step_call',
    depth: 2,
  });

  expect(parsed.depth).toBe(2);
});
```

- [ ] **Step 2: Add self-relations to `AgentRun` for root/parent lineage**

Run: update `schema.prisma` with `rootRun`, `parentRun`, and `childRuns` relations.

- [ ] **Step 3: Add DTO typing for lineage fields**

Run: update DTO with `depth` as non-negative integer and nullable parent identifiers.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test agent-run.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/agent-run.dto.ts apps/api/src/agents/dto/agent-run.dto.spec.ts
git commit -m "feat(api): add agent run lineage fields"
```

## Task 5: Enrich `AgentRunStep` for graph execution and UI output

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/agents/dto/ui-output.dto.ts`
- Modify: `apps/api/src/agents/dto/agent-version.dto.ts`
- Test: `apps/api/src/agents/dto/ui-output.dto.spec.ts`

- [ ] **Step 1: Write failing test for UI output envelope**

```ts
it('accepts a final UI output with markdown and CTA blocks', () => {
  const parsed = uiOutputEnvelopeSchema.parse({
    blocks: [
      { type: 'markdown', value: '# Resultado' },
      { type: 'cta', label: 'Baixar', action: { type: 'download', target: '/file' } },
    ],
  });

  expect(parsed.blocks).toHaveLength(2);
});
```

- [ ] **Step 2: Add rich fields to `AgentRunStep`**

Run: add `sequence`, `branchKey`, `inputType`, `outputType`, `statePayload`, `uiOutputPayload`.

- [ ] **Step 3: Add shared DTO for UI envelope**

```ts
export const uiOutputBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({ type: z.literal('markdown'), value: z.string() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()) }),
  z.object({ type: z.literal('card'), title: z.string(), body: z.string().optional() }),
  z.object({ type: z.literal('image'), url: z.string().min(1) }),
  z.object({ type: z.literal('cta'), label: z.string(), action: z.record(z.string(), z.unknown()) }),
]);
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @company-os/api test ui-output.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/agents/dto/ui-output.dto.ts apps/api/src/agents/dto/ui-output.dto.spec.ts apps/api/src/agents/dto/agent-version.dto.ts
git commit -m "feat(api): add ui output contract and rich run steps"
```

## Task 5A: Add port-aware workflow JSON contract

**Files:**
- Modify: `apps/api/src/agents/dto/agent-version.dto.ts`
- Test: `apps/api/src/agents/dto/agent-version.dto.spec.ts`

- [ ] **Step 1: Write failing tests for edges with named source and target ports**

```ts
it('accepts edges with explicit source and target ports', () => {
  const parsed = agentFlowDefinitionSchema.parse({
    nodes: [
      { id: 'boolean-1', type: 'boolean', config: {} },
      { id: 'formatter-1', type: 'output_formatter', config: {} },
    ],
    edges: [
      {
        id: 'edge-1',
        sourceNodeId: 'boolean-1',
        sourcePortKey: 'true',
        targetNodeId: 'formatter-1',
        targetPortKey: 'section_a',
      },
    ],
  });

  expect(parsed.edges[0]?.sourcePortKey).toBe('true');
});
```

- [ ] **Step 2: Add `edges` and edge schema to `agentFlowDefinitionSchema`**

```ts
const agentFlowEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortKey: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetPortKey: z.string().min(1),
});
```

- [ ] **Step 3: Add block config support for merge strategies and input mappings where applicable**

Minimum blocks that must allow this in config:

- `if_else`
- `agent_call`
- `form`
- `validation`
- `output_formatter`
- `finalizer`

- [ ] **Step 4: Run DTO tests**

Run: `pnpm --filter @company-os/api test agent-version.dto -- --runInBand`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/dto/agent-version.dto.ts apps/api/src/agents/dto/agent-version.dto.spec.ts
git commit -m "feat(api): add port-aware workflow graph contract"
```

## Task 6: Add and run migration safely

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_agents_context_runtime_schema/migration.sql`

- [ ] **Step 1: Generate migration locally**

Run: `pnpm --filter @company-os/api prisma migrate dev --name agents_context_runtime_schema`  
Expected: Prisma creates a new migration directory and updates local database.

- [ ] **Step 2: Inspect generated SQL for destructive changes**

Expected: additive migration only, no dropped live tables without explicit intent.

- [ ] **Step 3: Generate Prisma client**

Run: `pnpm --filter @company-os/api prisma generate`  
Expected: client generated under `apps/api/src/generated/prisma`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/migrations apps/api/prisma/schema.prisma
git commit -m "chore(api): migrate agents context runtime schema"
```

---

## Final Verification

- [ ] Run: `pnpm --filter @company-os/api prisma format`
- [ ] Run: `pnpm --filter @company-os/api prisma generate`
- [ ] Run: `pnpm --filter @company-os/api test src/agents/dto -- --runInBand`
- [ ] Run: `pnpm --filter @company-os/api lint`

Expected: schema formatted, client generated, DTO tests passing, no type or lint regression.
