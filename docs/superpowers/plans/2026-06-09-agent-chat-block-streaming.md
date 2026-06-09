# Agent Chat Block-Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the brittle `run + steps` reconstruction of the agent chat with a typed block-streaming SSE protocol where every agent step is a distinct typed event bound to a message.

**Architecture:** An assistant message is an ordered list of typed blocks. The kernel emits `message_start / block_start / block_delta / block_end / message_end` events via a `BlockEmitter` that both publishes SSE and persists `AgentRunBlock` rows. The frontend reduces these events into `UIMessage[]` for `agent-elements`, reading a single source (blocks) live and from history.

**Tech Stack:** NestJS 11 + Prisma + RxJS (api), Next.js 16 + React 19 + TanStack Query + `agent-elements` (web), Zod shared contracts (`@company-os/types`), Jest (api), Vitest + Playwright (web), pnpm + turbo monorepo.

**Spec:** `docs/superpowers/specs/2026-06-09-agent-chat-block-streaming-design.md`

**Conventions:**
- All code identifiers in English; user-facing labels in pt-BR (no AI jargon).
- Zod at every boundary. Commit after each task.
- Test commands: api `pnpm --dir apps/api test`, web `pnpm --dir apps/web test`, types `pnpm --filter @company-os/types build`.

---

## File Structure

**Shared (`packages/types/src/`)**
- Modify `agents.ts` — block event types, block enums, `AgentRunBlockDto`, per-event Zod data schemas.

**Backend (`apps/api/src/agents/`)**
- Modify `../../prisma/schema.prisma` — `AgentRunBlock` model + relation.
- Create `runtime/agent-run-block.service.ts` — block persistence.
- Create `runtime/kernel/block-emitter.ts` — `BlockEmitter` + `MessageHandle` + `StreamingBlock`.
- Modify `runtime/kernel/types.ts` — add `blocks` to `ExecutionDependencies` / step context.
- Modify `runtime/kernel/agent-execution.kernel.ts` — open message, drive blocks, emit `error` on failure.
- Modify `post/steps/*.step.ts` — map each step to blocks.
- Modify `runtime/agent-run.service.ts` — include blocks in run DTO query.
- Modify `agents.module.ts` — provide `AgentRunBlockService`.

**Frontend (`apps/web/src/core/modules/agents/`)**
- Create `utils/agent-block-reducer.ts` — reduce events → block state.
- Create `utils/build-messages-from-blocks.ts` — block state → `UIMessage[]`.
- Modify `hooks/use-agent-run-stream.ts` — listen to block events, drive reducer.
- Modify `hooks/use-agent-run.ts` — type `blocks` on run query.
- Modify `hooks/use-agent-chat-controller.ts` — build messages from blocks.
- Create `components/working-tool.tsx` — `working` status renderer.
- Modify `components/blister-tool-renderers.tsx` — register `working` renderer.
- Deprecate (keep file, stop using) `utils/apply-agent-run-event.ts`, `utils/build-agent-messages.ts`.

**E2E**
- Create `apps/web/tests/e2e/agent-chat-blocks.spec.ts`.

---

## Phase 1 — Shared contracts

### Task 1: Block event + block DTO schemas in `@company-os/types`

**Files:**
- Modify: `packages/types/src/agents.ts:218-234` (event type schema + event schema) and append new schemas.

- [ ] **Step 1: Add the failing test**

Create `packages/types/src/agents.blocks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  agentRunEventTypeSchema,
  blockTypeSchema,
  agentRunBlockDtoSchema,
  blockStartEventDataSchema,
  blockDeltaEventDataSchema,
} from './agents';

describe('block contracts', () => {
  it('accepts new lifecycle + block events', () => {
    for (const t of ['message_start', 'block_start', 'block_delta', 'block_end', 'message_end']) {
      expect(agentRunEventTypeSchema.safeParse(t).success).toBe(true);
    }
  });
  it('enumerates all block types', () => {
    for (const t of ['thinking', 'searching_context', 'planning', 'working', 'text', 'form_question', 'output', 'error']) {
      expect(blockTypeSchema.safeParse(t).success).toBe(true);
    }
  });
  it('validates block_start data', () => {
    expect(blockStartEventDataSchema.safeParse({ messageId: 'm1', blockId: 'b1', blockType: 'thinking', index: 0 }).success).toBe(true);
    expect(blockStartEventDataSchema.safeParse({ messageId: 'm1', blockId: 'b1', blockType: 'nope', index: 0 }).success).toBe(false);
  });
  it('validates block_delta data', () => {
    expect(blockDeltaEventDataSchema.safeParse({ messageId: 'm1', blockId: 'b1', delta: 'oi' }).success).toBe(true);
  });
  it('validates an AgentRunBlockDto', () => {
    expect(agentRunBlockDtoSchema.safeParse({
      id: 'x', messageId: 'm1', role: 'assistant', blockType: 'text',
      index: 0, label: null, text: 'hi', payload: {}, stepKey: null,
      status: 'complete', createdAt: new Date().toISOString(),
    }).success).toBe(true);
  });
});
```

> Note: `packages/types` has no test runner configured. Either add vitest to that package OR place this test in `apps/web` which already runs vitest. Simplest: create the file at `apps/web/src/__tests__/agents-block-contracts.test.ts` importing from `@company-os/types`. Use that path if the package has no test script.

- [ ] **Step 2: Run it, expect failure** (`pnpm --dir apps/web test agents-block-contracts` → fails: exports missing)

- [ ] **Step 3: Implement schemas.** In `packages/types/src/agents.ts` replace the `agentRunEventTypeSchema` enum to add the new events and append block schemas:

```ts
export const agentRunEventTypeSchema = z.enum([
  'run_started',
  'run_paused',
  'run_completed',
  'run_failed',
  // legacy (no longer consumed by the chat UI; kept for compatibility)
  'step_started',
  'step_completed',
  'step_failed',
  'output_chunk',
  // block protocol
  'message_start',
  'block_start',
  'block_delta',
  'block_end',
  'message_end',
]);

export const blockTypeSchema = z.enum([
  'thinking',
  'searching_context',
  'planning',
  'working',
  'text',
  'form_question',
  'output',
  'error',
]);

export const agentRunBlockRoleSchema = z.enum(['user', 'assistant']);
export const agentRunBlockStatusSchema = z.enum(['streaming', 'complete', 'error']);

export const messageStartEventDataSchema = z.object({
  messageId: z.string(),
  role: agentRunBlockRoleSchema,
});
export const blockStartEventDataSchema = z.object({
  messageId: z.string(),
  blockId: z.string(),
  blockType: blockTypeSchema,
  index: z.number().int().nonnegative(),
  label: z.string().optional(),
  stepKey: z.string().optional(),
});
export const blockDeltaEventDataSchema = z.object({
  messageId: z.string(),
  blockId: z.string(),
  delta: z.string(),
});
export const blockEndEventDataSchema = z.object({
  messageId: z.string(),
  blockId: z.string(),
  status: agentRunBlockStatusSchema,
  payload: z.record(z.string(), z.unknown()).optional(),
});
export const messageEndEventDataSchema = z.object({ messageId: z.string() });

export const agentRunBlockDtoSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  role: agentRunBlockRoleSchema,
  blockType: blockTypeSchema,
  index: z.number().int(),
  label: z.string().nullable(),
  text: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  stepKey: z.string().nullable(),
  status: agentRunBlockStatusSchema,
  createdAt: z.string(),
});

export type BlockType = z.infer<typeof blockTypeSchema>;
export type AgentRunBlockRole = z.infer<typeof agentRunBlockRoleSchema>;
export type AgentRunBlockStatus = z.infer<typeof agentRunBlockStatusSchema>;
export type AgentRunBlockDto = z.infer<typeof agentRunBlockDtoSchema>;
export type MessageStartEventData = z.infer<typeof messageStartEventDataSchema>;
export type BlockStartEventData = z.infer<typeof blockStartEventDataSchema>;
export type BlockDeltaEventData = z.infer<typeof blockDeltaEventDataSchema>;
export type BlockEndEventData = z.infer<typeof blockEndEventDataSchema>;
```

- [ ] **Step 4: Run test (PASS) + build types** (`pnpm --filter @company-os/types build`)
- [ ] **Step 5: Commit** — `feat(types): block-streaming SSE event and block contracts`

---

## Phase 2 — Persistence

### Task 2: `AgentRunBlock` Prisma model + migration

**Files:** Modify `apps/api/prisma/schema.prisma` (after `AgentRunStep`, ~line 435; add relation to `AgentRun` at ~line 400).

- [ ] **Step 1: Add the model** (exact block from spec):

```prisma
model AgentRunBlock {
  id         String   @id @default(cuid())
  agentRunId String
  messageId  String
  role       String
  blockType  String
  index      Int
  label      String?
  text       String?  @db.Text
  payload    Json     @default("{}")
  stepKey    String?
  status     String   @default("streaming")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  agentRun   AgentRun @relation(fields: [agentRunId], references: [id], onDelete: Cascade)

  @@unique([agentRunId, messageId, index])
  @@index([agentRunId])
}
```

- [ ] **Step 2: Add relation** to `model AgentRun` (near `steps AgentRunStep[]`): `blocks AgentRunBlock[]`
- [ ] **Step 3: Create migration** — Run: `pnpm --dir apps/api exec prisma migrate dev --name agent_run_blocks` (requires `pnpm db:up`). Expected: new dir under `prisma/migrations/`.
- [ ] **Step 4: Generate client** — `pnpm --dir apps/api prisma:generate`
- [ ] **Step 5: Commit** — `feat(db): AgentRunBlock model for chat block timeline`

### Task 3: `AgentRunBlockService`

**Files:** Create `apps/api/src/agents/runtime/agent-run-block.service.ts`; Test `apps/api/src/agents/runtime/agent-run-block.service.spec.ts`.

- [ ] **Step 1: Write failing test** (mock PrismaService):

```ts
import { Test } from '@nestjs/testing';
import { AgentRunBlockService } from './agent-run-block.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AgentRunBlockService', () => {
  const upsert = jest.fn();
  const findMany = jest.fn().mockResolvedValue([]);
  const prisma = { agentRunBlock: { upsert, findMany } } as unknown as PrismaService;
  let svc: AgentRunBlockService;
  beforeEach(async () => {
    upsert.mockClear();
    const mod = await Test.createTestingModule({
      providers: [AgentRunBlockService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AgentRunBlockService);
  });
  it('upserts a block on save', async () => {
    await svc.save({ agentRunId: 'r1', messageId: 'm1', blockId: 'b1', role: 'assistant', blockType: 'text', index: 0, status: 'streaming' });
    expect(upsert).toHaveBeenCalledTimes(1);
  });
  it('appendText concatenates onto existing text', async () => {
    await svc.appendText('r1', 'm1', 'b1', 'lo');
    expect(upsert).toHaveBeenCalled();
  });
  it('listByRun maps rows to DTOs', async () => {
    findMany.mockResolvedValueOnce([{ id: 'b1', messageId: 'm1', role: 'assistant', blockType: 'text', index: 0, label: null, text: 'hi', payload: {}, stepKey: null, status: 'complete', createdAt: new Date() }]);
    const dtos = await svc.listByRun('r1');
    expect(dtos[0].createdAt).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 2: Run, expect fail.** (`pnpm --dir apps/api test agent-run-block`)
- [ ] **Step 3: Implement.** Keyed by `(agentRunId, messageId, index)`; store a small in-memory index map `blockId → index` per run for upserts. Methods: `save(input)`, `appendText(runId, messageId, blockId, delta)`, `finalize(runId, messageId, blockId, status, payload)`, `listByRun(runId): AgentRunBlockDto[]`. Use `prisma.agentRunBlock.upsert` on the unique `(agentRunId, messageId, index)`. `appendText` reads current text then writes concatenation (acceptable; deltas are batched upstream). Map Prisma rows to `AgentRunBlockDto` (Date → ISO string, `payload` cast to record).
- [ ] **Step 4: Run (PASS).**
- [ ] **Step 5: Provide** in `agents.module.ts` providers + exports. **Commit** — `feat(api): AgentRunBlockService persistence`.

---

## Phase 3 — BlockEmitter + kernel wiring

### Task 4: `BlockEmitter`

**Files:** Create `apps/api/src/agents/runtime/kernel/block-emitter.ts`; Test `block-emitter.spec.ts`.

Depends on: `EventPublisher` (`run-event.publisher.ts`) and `AgentRunBlockService`. The emitter is constructed per-run with `{ runId, agentId, companyId, publisher, blocks }`.

- [ ] **Step 1: Failing test** — verify event sequence + persistence calls:

```ts
import { BlockEmitter } from './block-emitter';

const makeDeps = () => {
  const events: any[] = [];
  const publisher = { publish: jest.fn(async (e) => { events.push(e); }) };
  const blocks = { save: jest.fn(), appendText: jest.fn(), finalize: jest.fn() };
  return { events, publisher, blocks };
};

describe('BlockEmitter', () => {
  it('streams a thinking block: start, deltas, end', async () => {
    const { events, publisher, blocks } = makeDeps();
    const em = new BlockEmitter({ runId: 'r1', agentId: 'post', companyId: 'c1', publisher: publisher as any, blocks: blocks as any });
    const msg = em.openMessage('assistant');
    const t = msg.thinking();
    t.delta('pen'); t.delta('sando');
    await t.end();
    await msg.end();
    const types = events.map((e) => e.type);
    expect(types).toEqual(['message_start', 'block_start', 'block_delta', 'block_delta', 'block_end', 'message_end']);
    expect(blocks.save).toHaveBeenCalled();
    expect(blocks.finalize).toHaveBeenCalled();
  });
  it('emits a discrete searching block with payload', async () => {
    const { events, publisher } = makeDeps();
    const em = new BlockEmitter({ runId: 'r1', agentId: 'post', companyId: 'c1', publisher: publisher as any, blocks: { save: jest.fn(), appendText: jest.fn(), finalize: jest.fn() } as any });
    const msg = em.openMessage('assistant');
    await msg.searching({ resultsCount: 3 });
    const start = events.find((e) => e.type === 'block_start');
    expect(start.data.blockType).toBe('searching_context');
  });
});
```

- [ ] **Step 2: Run, expect fail.**
- [ ] **Step 3: Implement `BlockEmitter`.** Deterministic ids: `messageId = ${runId}:m${n}`, `blockId = ${messageId}:b${k}`, `index` increments per message. Each method:
  - publishes `RunEventPayload` with `type` and `data` per the Zod schemas (reuse the envelope shape used by `EventPublisher.publish`: `{ runId, agentId, companyId, type, data, timestamp }`);
  - calls `blocks.save/appendText/finalize`.
  - `openMessage(role)` → emits `message_start`, returns `MessageHandle`.
  - `MessageHandle`: `thinking()`, `text()` → return `StreamingBlock` (`delta()` buffers + emits `block_delta` + `blocks.appendText`; `end(payload?)` emits `block_end` + `blocks.finalize('complete')`). `searching(payload)`, `planning(payload)`, `formQuestion(formSchema)`, `output(payload)`, `error(message, opts?)` → discrete: emit `block_start` then `block_end` with payload, persist save+finalize. `working(label)` → returns `{ done() }`. `end()` → `message_end`.
  - `delta()` batching: accumulate and flush every ~24 chars (mirror existing `trigger-providers.ts` batching) to limit event volume; flush remainder on `end()`.
- [ ] **Step 4: Run (PASS). Commit** — `feat(api): BlockEmitter over EventPublisher + block persistence`.

### Task 5: Wire `BlockEmitter` into the kernel

**Files:** Modify `apps/api/src/agents/runtime/kernel/types.ts` (add `blocks?: AgentRunBlockService`-shaped port to `ExecutionDependencies`, and a `blocks: MessageHandle` on the step context passed to custom executors); Modify `runtime/kernel/agent-execution.kernel.ts`; Modify `runtime/workflow-engine.service.ts` (construct emitter in `startInlineExecution`); Modify `in-process-event.publisher.ts` only if signature changes (it should not).

- [ ] **Step 1:** In `agent-execution.kernel.ts:164` replace `createRunStartedEvent` flow: keep `run_started`, then `const message = emitter.openMessage('assistant')`. Persist the **user block** for `run.inputPayload.userInput` before opening the assistant message (call `blocks.save({ role: 'user', blockType: 'text', text: userInput, ... })` on a separate user message id).
- [ ] **Step 2:** Pass `message` (the `MessageHandle`) into the step context so custom executors emit blocks. Remove `createStepStarted/Completed/output_chunk` publishes from the chat path (leave `AgentRunStep` Prisma writes intact).
- [ ] **Step 3:** On step `PAUSED` → the step already emitted `form_question`; emit `run_paused` (kept). On step `FAILED` → `await message.error(friendlyMessage)` then `message.end()` then `run_failed`. On run complete → `message.end()` then `run_completed`.
- [ ] **Step 4:** Build: `pnpm --dir apps/api typecheck`. Existing e2e: `pnpm --dir apps/api test:e2e` (inline-stub) still green.
- [ ] **Step 5: Commit** — `feat(api): drive block emitter from execution kernel`.

### Task 6: Map post-agent steps to blocks

**Files:** Modify `apps/api/src/agents/post/steps/retrieve-context` (or wherever `retrieve_context` lives — `agent-execution.kernel.ts` handles `preparation`; add a hook), `post/steps/collect-brief.step.ts`, `post/steps/plan-design.step.ts`, `post/steps/generate-post.step.ts`.

- [ ] **Step 1:** `retrieve_context`: after RAG retrieval, `await message.searching({ resultsCount, label: 'Consultando o Cérebro da Marca' })`.
- [ ] **Step 2:** `collect_brief`: when a field is pending, `await message.formQuestion(pauseFormSchema)` before returning `{ type: 'PAUSED' }`.
- [ ] **Step 3:** `plan_design`: `const t = message.thinking()`; pass `t.delta` as the LLM `onChunk`; `await t.end()`; then `await message.planning({ summary, plan })`.
- [ ] **Step 4:** `generate_post`: `const txt = message.text()`; stream `txt.delta`; `await txt.end()`; then `await message.output(parsedPost)`.
- [ ] **Step 5:** `validate_output`: `const w = message.working('Revisando o resultado'); ...; await w.done()`.
- [ ] **Step 6:** Run inline-live smoke if available, else inline-stub e2e. **Commit** — `feat(api): post agent emits semantic blocks`.

### Task 7: Include blocks in run query

**Files:** Modify `apps/api/src/agents/runtime/agent-run.service.ts` (the method backing `GET /runs/:runId`) and the controller response type.

- [ ] **Step 1:** Add failing service test: `getRunWithSteps` (or equivalent) returns `{ run, steps, blocks }` with `blocks` ordered by `(messageId, index)`.
- [ ] **Step 2:** Run (fail). **Step 3:** Implement: call `AgentRunBlockService.listByRun(runId)`, attach as `blocks`. **Step 4:** Run (pass).
- [ ] **Step 5: Commit** — `feat(api): expose blocks in run detail response`.

---

## Phase 4 — Frontend

### Task 8: Block reducer

**Files:** Create `apps/web/src/core/modules/agents/utils/agent-block-reducer.ts`; Test `agent-block-reducer.test.ts` (vitest).

State shape:
```ts
export type BlockState = { blockId: string; blockType: BlockType; index: number; label?: string; text: string; payload: Record<string, unknown>; status: AgentRunBlockStatus; stepKey?: string };
export type MessageState = { messageId: string; role: AgentRunBlockRole; blocks: BlockState[] };
export type ChatBlockState = { messages: MessageState[]; runStatus: AgentRunStatus };
```

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from 'vitest';
import { reduceBlockEvent, initialChatBlockState, hydrateFromBlocks } from './agent-block-reducer';

const ev = (type: string, data: any) => ({ type, runId: 'r1', timestamp: '', data });

it('builds a message with a streamed thinking block', () => {
  let s = initialChatBlockState('RUNNING');
  s = reduceBlockEvent(s, ev('message_start', { messageId: 'm1', role: 'assistant' }) as any);
  s = reduceBlockEvent(s, ev('block_start', { messageId: 'm1', blockId: 'b1', blockType: 'thinking', index: 0 }) as any);
  s = reduceBlockEvent(s, ev('block_delta', { messageId: 'm1', blockId: 'b1', delta: 'pen' }) as any);
  s = reduceBlockEvent(s, ev('block_delta', { messageId: 'm1', blockId: 'b1', delta: 'sando' }) as any);
  s = reduceBlockEvent(s, ev('block_end', { messageId: 'm1', blockId: 'b1', status: 'complete' }) as any);
  expect(s.messages[0].blocks[0].text).toBe('pensando');
  expect(s.messages[0].blocks[0].status).toBe('complete');
});

it('hydrates from persisted blocks ordered by message+index', () => {
  const s = hydrateFromBlocks([
    { id: 'b1', messageId: 'm1', role: 'assistant', blockType: 'text', index: 0, label: null, text: 'oi', payload: {}, stepKey: null, status: 'complete', createdAt: '' },
  ] as any, 'COMPLETED');
  expect(s.messages[0].blocks[0].text).toBe('oi');
});
```

- [ ] **Step 2: Run (fail). Step 3: Implement** `reduceBlockEvent` (handles `message_start/block_start/block_delta/block_end/message_end` + `run_*` updating `runStatus`), `initialChatBlockState`, `hydrateFromBlocks`. Dedupe by `(messageId, blockId)`; `block_delta` appends to `text`. Pure functions, immutable updates.
- [ ] **Step 4: Run (PASS). Commit** — `feat(web): block reducer for SSE chat events`.

### Task 9: build-messages-from-blocks

**Files:** Create `apps/web/src/core/modules/agents/utils/build-messages-from-blocks.ts`; Test `build-messages-from-blocks.test.ts`.

Maps `MessageState[]` → `UIMessage[]` via `blockType → part`:
- `thinking` → `{ type: 'tool-Thinking', toolCallId: blockId, state, input: { thought: text } }`
- `searching_context` → `{ type: 'tool-Search', ... results from payload }`
- `planning` → `{ type: 'tool-PlanWrite', ... summary/plan from payload }`
- `working` → `{ type: 'tool-Thinking', input: { thought: label } }` (or working renderer key)
- `text` → `{ type: 'text', text }`
- `form_question` → `{ type: 'tool-Question', state: 'input-available', input: { questions, onSubmitAnswer } }`
- `output` → `MCP_POST`/`MCP_OUTPUT`/`MCP_REVIEW` from payload + review callbacks
- `error` → `{ type: 'error', message, title }`

`state` = `streaming` → `input-streaming`, `complete` → `output-available`, `error` → `output-available`.

- [ ] **Step 1: Failing test** asserting a 2-block assistant message (thinking complete + text) yields one `UIMessage` with two parts in order, and a `form_question` block yields a `tool-Question` part with `input-available`.
- [ ] **Step 2: Run (fail). Step 3: Implement** the pure mapper. Accept the same callback bag the controller passes today (review/question handlers) and attach to `form_question`/`output` parts. **Step 4: Run (PASS).**
- [ ] **Step 5: Commit** — `feat(web): map block state to agent-elements messages`.

### Task 10: Stream hook + controller wiring

**Files:** Modify `hooks/use-agent-run-stream.ts`, `hooks/use-agent-run.ts`, `hooks/use-agent-chat-controller.ts`, `components/working-tool.tsx` (create), `components/blister-tool-renderers.tsx`.

- [ ] **Step 1:** `use-agent-run.ts`: extend `AgentRunWithSteps` type with `blocks: AgentRunBlockDto[]`; query maps the new run response.
- [ ] **Step 2:** `use-agent-run-stream.ts`: register listeners for `message_start/block_start/block_delta/block_end/message_end` (plus kept `run_*`); on each event call `reduceBlockEvent` over a `["agent-run-blocks", runId]` cache entry (or store block state alongside the run). Keep `run_completed/run_failed` closing logic.
- [ ] **Step 3:** `use-agent-chat-controller.ts`: replace `buildThreadMessages` usage with: for each run, `hydrateFromBlocks(run.blocks)` merged with live reduced state, then `buildMessagesFromBlocks(...)`. Keep session/history threading.
- [ ] **Step 4:** Create `working-tool.tsx` (SpiralLoader + label) and register `working` in renderers if a dedicated key is used; otherwise reuse ThinkingTool.
- [ ] **Step 5:** `pnpm --dir apps/web typecheck` + `pnpm --dir apps/web test`. **Commit** — `feat(web): consume block-streaming SSE in chat controller`.

### Task 11: Remove legacy consumption

**Files:** `utils/apply-agent-run-event.ts`, `utils/build-agent-messages.ts` — leave a one-line deprecation comment and ensure no imports remain (grep). Add a minimal fallback in `buildMessagesFromBlocks` for runs whose `blocks` is empty (old runs): render `inputPayload.userInput` as a user text part + `outputPayload` via the output mapper.

- [ ] **Step 1:** `grep -rn "applyAgentRunEvent\|build-agent-messages\|buildThreadMessages" apps/web/src` → only the deprecated files / tests.
- [ ] **Step 2:** Implement empty-blocks fallback; unit test it.
- [ ] **Step 3:** typecheck + test. **Commit** — `refactor(web): retire step-reconstruction chat builder`.

---

## Phase 5 — E2E

### Task 12: Playwright coverage

**Files:** Create `apps/web/tests/e2e/agent-chat-blocks.spec.ts` (follow existing e2e patterns/auth fixtures in `apps/web/tests`).

- [ ] **Step 1:** Test: open post agent surface, send "Post sobre lançamento do bolo de cenoura", assert a `tool-Question` (form) appears and answering it advances; assert a thinking block streams; assert an `output` post preview renders.
- [ ] **Step 2:** Test: force/observe a failure path renders an `error` block with a retry affordance.
- [ ] **Step 3:** Run `pnpm --dir apps/web test:e2e` (needs api on inline-live). **Commit** — `test(web): e2e for block-streaming agent chat`.

---

## Final verification

- [ ] `pnpm --filter @company-os/types build`
- [ ] `pnpm --dir apps/api typecheck && pnpm --dir apps/api test`
- [ ] `pnpm --dir apps/web typecheck && pnpm --dir apps/web test`
- [ ] `pnpm format` (biome) clean
- [ ] Manual: post agent shows thinking (stream) → form pause → planning → output → review; failure shows error block.
