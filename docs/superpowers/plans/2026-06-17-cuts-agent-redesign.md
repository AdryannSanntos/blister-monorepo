# Cuts Agent Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular por completo o agente de cortes — pipeline sem RAG, render paralelo com callback progressivo, players vidstack (story + minimal), thumbnails progressivos e modal com expansão animada.

**Architecture:** O backend dispara todos os jobs FFmpeg em paralelo via Trigger.dev (`batchTrigger` non-blocking), cada job gera a presigned URL internamente (HTTP Range Requests — sem download completo) e, ao terminar, chama um endpoint interno que emite SSE `cut_rendered`. O frontend acumula cortes progressivamente via SSE e expande o modal quando o primeiro corte chega.

**Tech Stack:** NestJS 11, Prisma, Trigger.dev SDK v3, AssemblyAI, FFmpeg, Next.js 16, React 19, Tailwind v4, @vidstack/react, TanStack Query, TypeScript, Zod

## Global Constraints

- Todo código em inglês (nomes de variáveis, funções, classes, comentários)
- Sem comentários desnecessários — só quando o WHY não é óbvio
- Sem lógica de agente fora do SDK (`packages/agent-sdk`) e do adapter (`apps/api/src/agents/cuts/`)
- `userId` nunca vem do body — sempre de `req.currentUser.id`
- Novos endpoints com `@Public()` explícito ou com guard — não há exceções
- CSS vars do design system: `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--fg-quaternary`, `--bg-canvas`, `--bg-elevated`, `--accent`, `--line-subtle`, `--danger`, `--r-md`, `--r-lg`, `--shadow-lg`

---

## File Map

### Criar
- `apps/api/src/agents/cuts/steps/dispatch-renders.step.ts` — step `dispatch_renders`
- `apps/api/src/agents/cuts/steps/await-renders.step.ts` — step `await_renders`
- `apps/web/src/core/modules/agents/components/cuts/players/story-player.tsx` — player story-style (vidstack)
- `apps/web/src/core/modules/agents/components/cuts/players/minimal-player.tsx` — player minimal (vidstack)

### Modificar
- `packages/types/src/agents.ts` — adicionar `cut_rendered`, `all_cuts_rendered` ao `agentRunEventTypeSchema`
- `packages/agent-sdk/src/core/execute-run.ts` — trocar referência `render_cuts` → `dispatch_renders`
- `apps/api/src/agents/cuts/agent.ts` — remover `withContext` + `retrieve_context`, atualizar pipeline
- `apps/api/src/agents/cuts/steps/cuts-steps.ts` — remover `createRenderCutsStep`, exportar novos steps
- `apps/api/src/agents/runtime/internal-events.controller.ts` — adicionar endpoint `POST /internal/agents/cuts/cut-rendered`
- `apps/api/src/agents/runtime/agent-sse.service.ts` — adicionar `emitCutRendered` + `emitAllCutsRendered`
- `trigger/cuts-render-clip.ts` — presigned URL interna, HTTP range requests, callback ao final
- `apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx` — prop `variant`, delega a story/minimal
- `apps/web/src/core/modules/agents/components/cuts/cut-story-thumb.tsx` — skeleton + video first-frame + review inline
- `apps/web/src/core/modules/agents/components/cuts/cuts-review-panel.tsx` — grade com N slots skeleton progressivos
- `apps/web/src/core/modules/agents/components/cuts/cuts-processing-step.tsx` — lista de etapas com checks
- `apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx` — expansão animada processing→results
- `apps/web/src/core/modules/agents/hooks/use-cuts-run-modal.ts` — estado `totalCuts` + handle `cut_rendered`
- `apps/web/src/core/modules/agents/utils/apply-agent-run-event.ts` — handler `cut_rendered` + `all_cuts_rendered`

---

## Task 1: Add SSE event types for progressive cut rendering

**Files:**
- Modify: `packages/types/src/agents.ts:220-237`

**Interfaces:**
- Produces: `AgentRunEventType` inclui `'cut_rendered'` e `'all_cuts_rendered'`

- [ ] **Step 1: Add new event types to the schema**

In `packages/types/src/agents.ts`, locate `agentRunEventTypeSchema` at line ~220 and add the two new types:

```ts
export const agentRunEventTypeSchema = z.enum([
  'run_started',
  'run_paused',
  'run_completed',
  'run_failed',
  'run_cancelled',
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
  // cuts progressive rendering
  'cut_rendered',
  'all_cuts_rendered',
]);
```

- [ ] **Step 2: Build types package**

```bash
cd packages/types && pnpm build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/agents.ts
git commit -m "feat(types): add cut_rendered and all_cuts_rendered SSE event types"
```

---

## Task 2: Add SSE emitters for progressive cut rendering

**Files:**
- Modify: `apps/api/src/agents/runtime/agent-sse.service.ts`

**Interfaces:**
- Consumes: `AgentRunEventType` from Task 1
- Produces: `AgentSseService.emitCutRendered(runId, workspaceId, data)` and `AgentSseService.emitAllCutsRendered(runId, workspaceId)`

- [ ] **Step 1: Add emitter methods to AgentSseService**

In `apps/api/src/agents/runtime/agent-sse.service.ts`, add after the last `emit*` method:

```ts
emitCutRendered(
  runId: string,
  workspaceId: string,
  data: {
    cutId: string;
    cutFileId: string;
    renderedCount: number;
    totalCuts: number;
  },
): void {
  this.emit(runId, workspaceId, 'cut_rendered', data);
}

emitAllCutsRendered(runId: string, workspaceId: string): void {
  this.emit(runId, workspaceId, 'all_cuts_rendered', {});
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api && pnpm build --filter=api 2>&1 | head -30
```

Expected: no TypeScript errors in `agent-sse.service.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/agents/runtime/agent-sse.service.ts
git commit -m "feat(api): add emitCutRendered and emitAllCutsRendered to SSE service"
```

---

## Task 3: Create dispatch_renders step

**Files:**
- Create: `apps/api/src/agents/cuts/steps/dispatch-renders.step.ts`

**Interfaces:**
- Consumes: `context.previousStepsOutput.rank_segments.cuts` — array de cortes do LLM
- Produces: step output `{ totalCuts: number, renderedCount: number, cuts: CutOutput[], runFolderId: string, sourceFileId: string }`

- [ ] **Step 1: Create the step file**

Create `apps/api/src/agents/cuts/steps/dispatch-renders.step.ts`:

```ts
import type { StepExecutor } from '@company-os/agent-sdk';
import type { CutOutput } from '@company-os/types';
import { getCutsRunDeps } from '../ports/cuts-run-deps';
import { ensureCutRunFolder } from '../../../media/cut-run-folder.util';

export const createDispatchRendersStep = (): StepExecutor => {
  return async (context) => {
    const rankOutput = context.previousStepsOutput.rank_segments as {
      cuts?: CutOutput[];
      sourceFileId?: string;
      captionStyleId?: string;
    };

    const cuts = rankOutput.cuts;
    if (!Array.isArray(cuts) || cuts.length === 0) {
      return { type: 'FAILED', error: 'No cuts to render' };
    }

    const sourceFileId = rankOutput.sourceFileId;
    if (!sourceFileId) {
      return { type: 'FAILED', error: 'sourceFileId missing from rank_segments output' };
    }

    try {
      const deps = getCutsRunDeps();

      const sourceFile = await deps.resolveSourceFile({
        sourceFileId,
        companyId: context.companyId,
      });

      const runFolderId = await deps.ensureRunFolder({
        runId: context.runId,
        companyId: context.companyId,
        sourceFile,
      });

      await deps.dispatchRenderJobs({
        runId: context.runId,
        runFolderId,
        companyId: context.companyId,
        cuts,
        sourceFile,
      });

      return {
        type: 'CONTINUE',
        output: {
          totalCuts: cuts.length,
          renderedCount: 0,
          cuts: cuts.map((cut) => ({ ...cut, cutFileId: undefined })),
          runFolderId,
          sourceFileId,
          captionStyleId: rankOutput.captionStyleId,
        },
      };
    } catch (error) {
      return {
        type: 'FAILED',
        error: error instanceof Error ? error.message : 'Failed to dispatch render jobs',
      };
    }
  };
};
```

- [ ] **Step 2: Add port methods to CutsRunDeps**

In `apps/api/src/agents/cuts/ports/cuts-run-deps.ts`, add the new port methods. Read the current file first, then add:

```ts
export type DispatchRenderJobsParams = {
  runId: string;
  runFolderId: string;
  companyId: string;
  cuts: CutOutput[];
  sourceFile: SourceFileRecord;
};

export type EnsureRunFolderParams = {
  runId: string;
  companyId: string;
  sourceFile: SourceFileRecord;
};

// Add to CutsRunDeps interface:
ensureRunFolder(params: EnsureRunFolderParams): Promise<string>;
dispatchRenderJobs(params: DispatchRenderJobsParams): Promise<void>;
```

- [ ] **Step 3: Implement port methods in build-cuts-run-deps.ts**

In `apps/api/src/agents/cuts/build-cuts-run-deps.ts`, add implementations:

```ts
const ensureRunFolder: CutsRunDeps['ensureRunFolder'] = async ({ runId, companyId, sourceFile }) => {
  const scope = resolveScope(sourceFile.companyId, sourceFile.personalSpaceId);
  const storageRoot = await resolveStorageRoot(prisma, sourceFile.companyId, sourceFile.personalSpaceId);
  const runStartedAt = await resolveRunStartedAt(prisma, runId);
  return ensureCutRunFolder(prisma, storage, {
    scope,
    storageRoot,
    runId,
    sourceFileName: sourceFile.name,
    runStartedAt,
  });
};

const dispatchRenderJobs: CutsRunDeps['dispatchRenderJobs'] = async ({
  runId,
  runFolderId,
  companyId,
  cuts,
  sourceFile,
}) => {
  const mode = readAgentExecutionMode();
  if (mode === 'inline-stub') return; // stub: skip dispatch, callback will be called inline

  const { cutsRenderClip } = await import('../../../../trigger/cuts-render-clip');

  const payloads = cuts.map((cut, index) => ({
    payload: {
      runId,
      runFolderId,
      cutId: cut.id,
      cutIndex: index + 1,
      title: cut.title,
      sourceStorageKey: sourceFile.storageKey,
      startSec: cut.startSec,
      endSec: cut.endSec,
      companyId: sourceFile.companyId,
      personalSpaceId: sourceFile.personalSpaceId,
    },
  }));

  await cutsRenderClip.batchTrigger(payloads);
};
```

Note: `resolveScope`, `resolveStorageRoot`, `resolveRunStartedAt` are currently in `render-cut-clips.service.ts` — move them to `build-cuts-run-deps.ts` or a shared utility.

- [ ] **Step 4: Verify TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep "cuts" | head -20
```

Expected: no errors in cuts-related files.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/agents/cuts/steps/dispatch-renders.step.ts \
  apps/api/src/agents/cuts/ports/cuts-run-deps.ts \
  apps/api/src/agents/cuts/build-cuts-run-deps.ts
git commit -m "feat(api): add dispatch_renders step — batchTrigger non-blocking"
```

---

## Task 4: Create await_renders step

**Files:**
- Create: `apps/api/src/agents/cuts/steps/await-renders.step.ts`

**Interfaces:**
- Consumes: `context.previousStepsOutput.dispatch_renders.{ renderedCount, totalCuts, cuts }`
- Produces: step output forwarding the final `{ totalCuts, renderedCount, cuts, runFolderId, sourceFileId, captionStyleId }` from dispatch_renders

- [ ] **Step 1: Create the step file**

Create `apps/api/src/agents/cuts/steps/await-renders.step.ts`:

```ts
import { createPauseStep } from '@company-os/agent-sdk';

type DispatchRendersOutput = {
  totalCuts?: number;
  renderedCount?: number;
  cuts?: unknown[];
  runFolderId?: string;
  sourceFileId?: string;
  captionStyleId?: string;
};

export const createAwaitRendersStep = () =>
  createPauseStep({
    pauseType: 'form',
    pauseReason: 'awaiting_renders',
    until: (context) => {
      const dispatch = context.previousStepsOutput.dispatch_renders as
        | DispatchRendersOutput
        | undefined;
      if (!dispatch) return false;
      const { renderedCount = 0, totalCuts = 1 } = dispatch;
      return renderedCount >= totalCuts;
    },
    onContinue: (context) => {
      const dispatch = context.previousStepsOutput.dispatch_renders as DispatchRendersOutput;
      return {
        totalCuts: dispatch.totalCuts ?? 0,
        renderedCount: dispatch.renderedCount ?? 0,
        cuts: dispatch.cuts ?? [],
        runFolderId: dispatch.runFolderId ?? '',
        sourceFileId: dispatch.sourceFileId ?? '',
        captionStyleId: dispatch.captionStyleId,
      };
    },
  });
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep "await-renders" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/agents/cuts/steps/await-renders.step.ts
git commit -m "feat(api): add await_renders pause step for progressive render sync"
```

---

## Task 5: Update cuts agent definition (remove RAG, update pipeline)

**Files:**
- Modify: `apps/api/src/agents/cuts/agent.ts`
- Modify: `apps/api/src/agents/cuts/steps/cuts-steps.ts`

**Interfaces:**
- Consumes: `createDispatchRendersStep` from Task 3, `createAwaitRendersStep` from Task 4
- Pipeline: `resolve_source → rank_segments → dispatch_renders → await_renders → await_cut_review → finalize_cuts → cleanup_source`

- [ ] **Step 1: Rewrite agent.ts**

Replace `apps/api/src/agents/cuts/agent.ts` entirely:

```ts
import {
  AgentBuilder,
  createLlmCallStep,
  createPauseStep,
} from '@company-os/agent-sdk';
import { reviewCutsSchema } from '@company-os/types';

import { cutsLearningHandler } from './learning/feedback-handler';
import { buildCutsSystemPrompt, buildCutsUserPrompt } from './prompts/cuts.prompts';
import {
  cutsInputZod,
  cutsLlmOutputZod,
  cutsOutputZod,
  normalizeCut,
} from './schemas/output.schema';
import {
  createCleanupSourceStep,
  createFinalizeCutsStep,
  createResolveSourceStep,
  getCutsSettings,
} from './steps/cuts-steps';
import { createDispatchRendersStep } from './steps/dispatch-renders.step';
import { createAwaitRendersStep } from './steps/await-renders.step';

const applyCutDecisions = (
  cuts: ReturnType<typeof normalizeCut>[],
  formData: Record<string, unknown> | undefined,
  autoAccept: boolean,
) => {
  if (autoAccept) {
    return cuts.map((cut) => ({ ...cut, reviewStatus: 'approved' as const }));
  }

  const parsed = reviewCutsSchema.safeParse(formData);
  if (!parsed.success) return cuts;

  const decisionMap = new Map(parsed.data.cutDecisions.map((d) => [d.cutId, d.decision]));

  return cuts.map((cut) => {
    const decision = decisionMap.get(cut.id);
    if (decision === 'approve') return { ...cut, reviewStatus: 'approved' as const };
    if (decision === 'reject') return { ...cut, reviewStatus: 'rejected' as const };
    return cut;
  });
};

export const cutsAgent = AgentBuilder.create({ id: 'cuts', version: '3.0.0' })
  .label('Gerador de Cortes')
  .description(
    'Transforma lives, podcasts e aulas longas em cortes curtos priorizados por potencial de retenção.',
  )
  .capabilities(['text', 'analysis'])
  .estimatedCost(0.08)
  .input(cutsInputZod)
  .output(cutsOutputZod)
  .review(reviewCutsSchema)
  .addStep('resolve_source', {
    label: 'Transcrever vídeo',
    type: 'preparation',
    run: createResolveSourceStep(),
  })
  .addStep('rank_segments', {
    label: 'Gerar cortes',
    type: 'llm_call',
    run: createLlmCallStep({
      outputSchema: cutsLlmOutputZod,
      buildSystem: buildCutsSystemPrompt,
      buildUser: buildCutsUserPrompt,
      transformOutput: (data, context) => {
        const input = context.inputPayload as {
          sourceFileId?: string;
          settings?: { captionStyleId?: string; autoAcceptResults?: boolean };
        };
        const settings = getCutsSettings(context);
        const normalized = data.cuts.map((cut, index) =>
          normalizeCut(
            { ...cut, id: `cut-${index + 1}` },
            settings.autoAcceptResults ? 'approved' : 'pending',
          ),
        );
        return {
          cuts: normalized,
          sourceFileId: input.sourceFileId ?? '',
          captionStyleId: settings.addCaptions ? settings.captionStyleId : undefined,
        };
      },
    }),
  })
  .addStep('dispatch_renders', {
    label: 'Iniciar renderização',
    type: 'preparation',
    run: createDispatchRendersStep(),
  })
  .addStep('await_renders', {
    label: 'Aguardando cortes',
    type: 'form',
    run: createAwaitRendersStep(),
  })
  .addStep('await_cut_review', {
    label: 'Revisar cortes',
    type: 'form',
    run: createPauseStep({
      pauseType: 'form',
      until: (context) => {
        const settings = getCutsSettings(context);
        if (settings.autoAcceptResults) return true;
        const cutDecisions = context.inputPayload.cutDecisions;
        return Array.isArray(cutDecisions) && cutDecisions.length > 0;
      },
      getFormSchema: () => reviewCutsSchema,
      pauseReason: 'awaiting_cut_review',
      previewBlock: 'output',
      onContinue: (context) => {
        const awaitsOutput = context.previousStepsOutput.await_renders as {
          cuts?: ReturnType<typeof normalizeCut>[];
          sourceFileId?: string;
          captionStyleId?: string;
        };
        const settings = getCutsSettings(context);
        const cuts = applyCutDecisions(
          awaitsOutput.cuts ?? [],
          context.inputPayload,
          settings.autoAcceptResults,
        );
        return {
          cuts,
          sourceFileId: awaitsOutput.sourceFileId ?? '',
          captionStyleId: awaitsOutput.captionStyleId,
        };
      },
    }),
  })
  .addStep('finalize_cuts', {
    label: 'Finalizar',
    type: 'output',
    run: createFinalizeCutsStep(),
  })
  .addStep('cleanup_source', {
    label: 'Limpar fonte',
    type: 'preparation',
    run: createCleanupSourceStep(),
  })
  .withLearning(cutsLearningHandler)
  .build();

export const cutsAgentDefinition = cutsAgent.definition;
```

- [ ] **Step 2: Remove createRenderCutsStep from cuts-steps.ts**

In `apps/api/src/agents/cuts/steps/cuts-steps.ts`, delete the entire `createRenderCutsStep` function (lines 67-121 in the current file). Keep `createResolveSourceStep`, `createFinalizeCutsStep`, `createCleanupSourceStep`, `getCutsSettings`.

Also update `createFinalizeCutsStep` to read from `await_cut_review` (unchanged) but update its `awaitsOutput` reference to `await_renders` if needed — check: `createFinalizeCutsStep` reads from `context.previousStepsOutput.await_cut_review`, which is correct.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no errors in agent or steps files.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/agents/cuts/agent.ts apps/api/src/agents/cuts/steps/cuts-steps.ts
git commit -m "feat(api): reformulate cuts agent — remove RAG, add dispatch/await_renders pipeline"
```

---

## Task 6: Update SDK kernel execute-run.ts (render_cuts → dispatch_renders)

**Files:**
- Modify: `packages/agent-sdk/src/core/execute-run.ts:411-419`

**Interfaces:**
- Changes `render_cuts` hardcoded reference to `dispatch_renders` in the paused output builder

- [ ] **Step 1: Update the hardcoded step key reference**

In `packages/agent-sdk/src/core/execute-run.ts`, find the `stepPaused` block (~line 411):

```ts
// BEFORE
const pausedOutput = {
  ...currentOutput,
  ...(completedOutputs.render_cuts ?? {}),
  ...(completedOutputs.rank_segments && !completedOutputs.render_cuts
    ? completedOutputs.rank_segments
    : {}),
};

// AFTER
const pausedOutput = {
  ...currentOutput,
  ...(completedOutputs.dispatch_renders ?? {}),
  ...(completedOutputs.rank_segments && !completedOutputs.dispatch_renders
    ? completedOutputs.rank_segments
    : {}),
};
```

- [ ] **Step 2: Build and verify**

```bash
cd packages/agent-sdk && pnpm build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add packages/agent-sdk/src/core/execute-run.ts
git commit -m "fix(agent-sdk): update paused output builder to use dispatch_renders step key"
```

---

## Task 7: Create internal callback endpoint for cut-rendered events

**Files:**
- Modify: `apps/api/src/agents/runtime/internal-events.controller.ts`

**Interfaces:**
- Consumes: `AgentSseService.emitCutRendered` and `emitAllCutsRendered` from Task 2
- Consumes: `WorkflowEngineService.resumeRun` from workflow engine
- Produces: `POST /internal/agents/cuts/cut-rendered` protected by `x-internal-secret`

- [ ] **Step 1: Add the new endpoint to InternalEventsController**

In `apps/api/src/agents/runtime/internal-events.controller.ts`, add imports and the endpoint:

Add to imports:
```ts
import { WorkflowEngineService } from './workflow-engine.service';
```

Add `WorkflowEngineService` to constructor injection:
```ts
constructor(
  private readonly config: ConfigService,
  private readonly prisma: PrismaService,
  private readonly sseService: AgentSseService,
  private readonly workflowEngine: WorkflowEngineService,
) {
  this.triggerSecret = this.config.get<string>('TRIGGER_SECRET_KEY') ?? '';
  this.internalSecret = this.config.get<string>('INTERNAL_SECRET') ?? this.triggerSecret;
}

private readonly internalSecret: string;
```

Add the schema and endpoint:
```ts
const cutRenderedBodySchema = z.object({
  cutId: z.string().min(1),
  cutFileId: z.string().min(1),
  runFolderId: z.string().min(1),
});

@Post('cuts/cut-rendered/:runId')
@Public()
@HttpCode(HttpStatus.OK)
async cutRendered(
  @Param('runId') runId: string,
  @Body() body: unknown,
  @Headers('x-internal-secret') secret?: string,
): Promise<{ ok: boolean }> {
  if (this.internalSecret && secret !== this.internalSecret) {
    throw new UnauthorizedException('Invalid internal secret');
  }

  const payload = cutRenderedBodySchema.parse(body);

  const run = await this.prisma.agentRun.findUnique({
    where: { id: runId },
    select: { companyId: true, personalSpaceId: true, status: true },
  });

  if (!run) return { ok: false };
  if (run.status === 'FAILED' || run.status === 'CANCELLED') return { ok: false };

  const workspaceId = run.companyId ?? run.personalSpaceId ?? '';

  // Find the dispatch_renders step and update its outputPayload atomically
  const updatedStep = await this.prisma.$transaction(async (tx) => {
    const step = await tx.agentRunStep.findFirst({
      where: { agentRunId: runId, stepKey: 'dispatch_renders', status: 'COMPLETED' },
    });

    if (!step) return null;

    const output = step.outputPayload as {
      totalCuts: number;
      renderedCount: number;
      cuts: Array<{ id: string; cutFileId?: string; [key: string]: unknown }>;
      runFolderId?: string;
      sourceFileId?: string;
      captionStyleId?: string;
    };

    const updatedCuts = output.cuts.map((cut) =>
      cut.id === payload.cutId ? { ...cut, cutFileId: payload.cutFileId } : cut,
    );

    const renderedCount = output.renderedCount + 1;

    await tx.agentRunStep.update({
      where: { id: step.id },
      data: {
        outputPayload: {
          ...output,
          renderedCount,
          cuts: updatedCuts,
        },
      },
    });

    return { totalCuts: output.totalCuts, renderedCount };
  });

  if (!updatedStep) return { ok: false };

  const { totalCuts, renderedCount } = updatedStep;

  this.sseService.emitCutRendered(runId, workspaceId, {
    cutId: payload.cutId,
    cutFileId: payload.cutFileId,
    renderedCount,
    totalCuts,
  });

  if (renderedCount >= totalCuts) {
    this.sseService.emitAllCutsRendered(runId, workspaceId);
    await this.workflowEngine.resumeRun({ runId });
  }

  return { ok: true };
}
```

Note: The controller is `@Controller('internal/agent-runs')` but this new endpoint follows the cuts-specific path. Make sure the controller route prefix matches or adjust accordingly. If `internal-events.controller.ts` uses `@Controller('internal/agent-runs')`, add the new method with full relative path `cuts/cut-rendered/:runId`.

- [ ] **Step 2: Register WorkflowEngineService in agents.module.ts if not already injected**

Check `apps/api/src/agents/agents.module.ts`. If `WorkflowEngineService` is not in `InternalEventsController`'s providers, add it.

```bash
grep -n "WorkflowEngineService\|InternalEventsController" apps/api/src/agents/agents.module.ts
```

Add `WorkflowEngineService` to providers array if missing.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | grep "internal-events" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/agents/runtime/internal-events.controller.ts \
  apps/api/src/agents/agents.module.ts
git commit -m "feat(api): add POST /internal/agents/cuts/cut-rendered callback endpoint"
```

---

## Task 8: Reformulate cuts-render-clip Trigger task

**Files:**
- Modify: `trigger/cuts-render-clip.ts`

**Interfaces:**
- Payload no longer contains a pre-built URL — uses `storageKey` and generates presigned URL internally
- Calls `POST /internal/agents/cuts/cut-rendered/:runId` when done
- FFmpeg reads directly from presigned URL (HTTP Range Requests)

- [ ] **Step 1: Rewrite the task**

Replace `trigger/cuts-render-clip.ts` entirely:

```ts
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { task, logger } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma';
import { resolveFfmpegPath } from '../src/media/resolve-ffmpeg-path';
import { trimVideoToBuffer } from '../src/media/trim-video';
import {
  buildCutStorageKey,
  registerCutWorkspaceFile,
} from '../src/media/register-cut-file';
import { StorageService } from '../src/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import type { WorkspaceStorageRoot } from '../src/files/workspace-storage.util';

const prisma = new PrismaClient();

const payloadSchema = z.object({
  runId: z.string().min(1),
  runFolderId: z.string().min(1),
  cutId: z.string().min(1),
  cutIndex: z.number().int().positive(),
  title: z.string().min(1),
  sourceStorageKey: z.string().min(1),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative().refine((v) => v > 0, 'endSec must be positive'),
  companyId: z.string().nullable(),
  personalSpaceId: z.string().nullable(),
});

export type CutsRenderClipPayload = z.infer<typeof payloadSchema>;

export type CutsRenderClipResult = {
  cutId: string;
  cutFileId: string;
  storageKey: string;
  sizeBytes: number;
};

const buildStorageService = (): StorageService => new StorageService(new ConfigService());

const resolveStorageRoot = async (
  companyId: string | null,
  personalSpaceId: string | null,
): Promise<WorkspaceStorageRoot> => {
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    });
    if (!company) throw new Error('Company not found for cut render');
    return { kind: 'company', slug: company.slug };
  }

  if (personalSpaceId) {
    const space = await prisma.personalSpace.findUnique({
      where: { id: personalSpaceId },
      select: { userId: true },
    });
    if (!space) throw new Error('Personal space not found for cut render');
    return { kind: 'personal', userId: space.userId };
  }

  throw new Error('Workspace scope is required to render a cut');
};

const notifyCutRendered = async (
  runId: string,
  cutId: string,
  cutFileId: string,
  runFolderId: string,
): Promise<void> => {
  const apiBaseUrl = process.env.API_BASE_URL;
  const internalSecret = process.env.INTERNAL_SECRET ?? process.env.TRIGGER_SECRET_KEY ?? '';

  if (!apiBaseUrl) {
    logger.warn('API_BASE_URL not set — skipping cut-rendered callback');
    return;
  }

  const url = `${apiBaseUrl}/internal/agent-runs/cuts/cut-rendered/${runId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify({ cutId, cutFileId, runFolderId }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`cut-rendered callback failed: ${response.status} ${text}`);
  }
};

export const cutsRenderClip = task({
  id: 'cuts-render-clip',
  machine: { preset: 'medium-1x' },
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: CutsRenderClipPayload): Promise<CutsRenderClipResult> => {
    const validated = payloadSchema.parse(payload);

    logger.info('Rendering cut clip', {
      runId: validated.runId,
      cutId: validated.cutId,
      cutIndex: validated.cutIndex,
      startSec: validated.startSec,
      endSec: validated.endSec,
    });

    const storage = buildStorageService();
    const ffmpegPath = resolveFfmpegPath();

    // Generate presigned URL internally — avoids URL expiration when tasks queue
    const sourceUrl = await storage.getPresignedDownloadUrl(validated.sourceStorageKey);

    logger.info('Got presigned source URL', { sourceStorageKey: validated.sourceStorageKey });

    // FFmpeg reads directly via HTTP Range Requests — only fetches segment bytes
    const clipBuffer = await trimVideoToBuffer({
      inputUrl: sourceUrl,
      startSec: validated.startSec,
      endSec: validated.endSec,
      ffmpegPath,
    });

    const scope =
      validated.companyId !== null
        ? { companyId: validated.companyId }
        : { personalSpaceId: validated.personalSpaceId! };

    const storageRoot = await resolveStorageRoot(
      validated.companyId,
      validated.personalSpaceId,
    );

    const { storageKey, fileName } = await buildCutStorageKey(prisma, {
      scope,
      storageRoot,
      runFolderId: validated.runFolderId,
      cutIndex: validated.cutIndex,
      title: validated.title,
    });

    await storage.uploadObject(storageKey, clipBuffer, 'video/mp4');

    const cutFileId = await registerCutWorkspaceFile(prisma, {
      scope,
      runFolderId: validated.runFolderId,
      cutIndex: validated.cutIndex,
      title: validated.title,
      fileName,
      storageKey,
      sizeBytes: clipBuffer.length,
    });

    logger.info('Cut clip rendered', {
      runId: validated.runId,
      cutId: validated.cutId,
      cutFileId,
      sizeBytes: clipBuffer.length,
    });

    await notifyCutRendered(validated.runId, validated.cutId, cutFileId, validated.runFolderId);

    return {
      cutId: validated.cutId,
      cutFileId,
      storageKey,
      sizeBytes: clipBuffer.length,
    };
  },
});
```

- [ ] **Step 2: Add API_BASE_URL and INTERNAL_SECRET to env docs**

Add to `apps/api/.env.example` (if it exists) or document in the PR:
```
API_BASE_URL=http://localhost:3001   # URL interna acessível pelo Trigger.dev worker
INTERNAL_SECRET=<random-secret>      # Compartilhado entre API e Trigger.dev worker
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/api && npx tsc -p tsconfig.trigger.json --noEmit 2>&1 | head -30
```

Expected: no errors in trigger file.

- [ ] **Step 4: Commit**

```bash
git add trigger/cuts-render-clip.ts
git commit -m "feat(trigger): refactor cuts-render-clip — presigned URL + HTTP range requests + callback"
```

---

## Task 9: Install vidstack and create player components

**Files:**
- Create: `apps/web/src/core/modules/agents/components/cuts/players/story-player.tsx`
- Create: `apps/web/src/core/modules/agents/components/cuts/players/minimal-player.tsx`

**Interfaces:**
- Produces: `<StoryPlayer src cutId startSec endSec className />` and `<MinimalPlayer src cutId startSec endSec className />`

- [ ] **Step 1: Install vidstack**

```bash
cd apps/web && pnpm add @vidstack/react
```

Expected: package installed, `package.json` updated.

- [ ] **Step 2: Create StoryPlayer**

Create `apps/web/src/core/modules/agents/components/cuts/players/story-player.tsx`:

```tsx
"use client";

import "@vidstack/react/player/styles/base.css";
import { MediaPlayer, MediaProvider, useMediaState } from "@vidstack/react";
import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "src/core/shared/utils";

type StoryPlayerProps = {
  src: string | null;
  cutId: string | null;
  startSec?: number;
  endSec?: number;
  className?: string;
};

function PlayPauseOverlay() {
  const paused = useMediaState("paused");
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
        paused ? "opacity-100" : "opacity-0 hover:opacity-100",
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
        {paused ? (
          <Play className="size-7 fill-white text-white" />
        ) : (
          <Pause className="size-7 fill-white text-white" />
        )}
      </div>
    </div>
  );
}

export function StoryPlayer({ src, cutId, startSec = 0, endSec, className }: StoryPlayerProps) {
  const playerRef = useRef<HTMLMediaElement>(null);

  // Seek to startSec when source or cut changes
  useEffect(() => {
    const video = playerRef.current;
    if (!video || !src) return;
    video.currentTime = startSec;
  }, [src, cutId, startSec]);

  const handleTimeUpdate = useCallback(() => {
    const video = playerRef.current;
    if (!video || !endSec) return;
    if (video.currentTime >= endSec) {
      video.currentTime = startSec;
      video.pause();
    }
  }, [startSec, endSec]);

  if (!src) return null;

  return (
    <MediaPlayer
      src={src}
      className={cn("relative aspect-[9/16] overflow-hidden rounded-[var(--r-md)]", className)}
      playsInline
    >
      <MediaProvider ref={playerRef} onTimeUpdate={handleTimeUpdate} />

      {/* Story progress bar */}
      <div className="absolute inset-x-0 top-2 h-0.5 bg-white/20 px-3">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-100"
          style={{
            width: endSec && endSec > startSec
              ? `${Math.min(100, ((0 - startSec) / (endSec - startSec)) * 100)}%`
              : "0%",
          }}
          data-progress="story"
        />
      </div>

      <PlayPauseOverlay />
    </MediaPlayer>
  );
}
```

Note: The progress bar width is driven by a `currentTime` state update. Use a `useMediaStore` hook or `onTimeUpdate` to animate it properly. For the initial implementation, the bar is static at 0% and animates via CSS `transition`. A full implementation should use `useMediaState('currentTime')` from vidstack to update the width reactively.

Full animated progress bar implementation:

```tsx
function StoryProgressBar({ startSec, endSec }: { startSec: number; endSec: number }) {
  const currentTime = useMediaState("currentTime");
  const duration = Math.max(1, endSec - startSec);
  const progress = Math.min(100, Math.max(0, ((currentTime - startSec) / duration) * 100));

  return (
    <div className="absolute inset-x-0 top-2 h-0.5 bg-white/20 px-3">
      <div
        className="h-full bg-[var(--accent)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

Use `<StoryProgressBar startSec={startSec} endSec={endSec ?? 0} />` inside `<MediaPlayer>`.

- [ ] **Step 3: Create MinimalPlayer**

Create `apps/web/src/core/modules/agents/components/cuts/players/minimal-player.tsx`:

```tsx
"use client";

import "@vidstack/react/player/styles/base.css";
import {
  MediaPlayer,
  MediaProvider,
  Controls,
  ControlsGroup,
  PlayButton,
  MuteButton,
  FullscreenButton,
  Time,
  useMediaState,
} from "@vidstack/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { cn } from "src/core/shared/utils";

type MinimalPlayerProps = {
  src: string | null;
  cutId: string | null;
  startSec?: number;
  endSec?: number;
  className?: string;
};

function Scrubber({ startSec, endSec }: { startSec: number; endSec: number }) {
  const currentTime = useMediaState("currentTime");
  const duration = Math.max(1, endSec - startSec);
  const progress = Math.min(100, Math.max(0, ((currentTime - startSec) / duration) * 100));

  return (
    <div
      className="relative h-1 flex-1 cursor-pointer rounded-full bg-[var(--line-subtle)]"
      role="slider"
      aria-label="Progresso"
    >
      <div
        className="h-full rounded-full bg-[var(--accent)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function MinimalPlayer({ src, cutId, startSec = 0, endSec, className }: MinimalPlayerProps) {
  const playerRef = useRef<HTMLMediaElement>(null);

  useEffect(() => {
    const video = playerRef.current;
    if (!video || !src) return;
    video.currentTime = startSec;
  }, [src, cutId, startSec]);

  const handleTimeUpdate = useCallback(() => {
    const video = playerRef.current;
    if (!video || !endSec) return;
    if (video.currentTime >= endSec) {
      video.currentTime = startSec;
      video.pause();
    }
  }, [startSec, endSec]);

  if (!src) return null;

  return (
    <MediaPlayer
      src={src}
      className={cn(
        "group relative overflow-hidden rounded-[var(--r-md)] bg-black",
        className,
      )}
      playsInline
    >
      <MediaProvider ref={playerRef} onTimeUpdate={handleTimeUpdate} />

      <Controls className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 py-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {endSec && endSec > startSec ? (
          <Scrubber startSec={startSec} endSec={endSec} />
        ) : null}
        <ControlsGroup className="flex items-center gap-3">
          <PlayButton className="flex size-8 items-center justify-center rounded-full text-white hover:text-[var(--accent)]">
            <Play data-visible className="hidden size-5 [[data-paused]_&]:block" />
            <Pause data-visible className="hidden size-5 [[data-playing]_&]:block" />
          </PlayButton>

          <Time type="current" className="text-xs tabular-nums text-white/80" />
          <span className="text-xs text-white/40">/</span>
          <Time type="duration" className="text-xs tabular-nums text-white/60" />

          <div className="ml-auto flex items-center gap-2">
            <MuteButton className="flex size-7 items-center justify-center text-white/70 hover:text-white">
              <Volume2 data-visible className="hidden size-4 [[data-unmuted]_&]:block" />
              <VolumeX data-visible className="hidden size-4 [[data-muted]_&]:block" />
            </MuteButton>
            <FullscreenButton className="flex size-7 items-center justify-center text-white/70 hover:text-white">
              <Maximize data-visible className="hidden size-4 [[data-not-fullscreen]_&]:block" />
              <Minimize data-visible className="hidden size-4 [[data-fullscreen]_&]:block" />
            </FullscreenButton>
          </div>
        </ControlsGroup>
      </Controls>
    </MediaPlayer>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "players" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/players/
git commit -m "feat(web): add StoryPlayer and MinimalPlayer components using vidstack"
```

---

## Task 10: Update CutStoryPlayer with variant prop

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx`

**Interfaces:**
- Consumes: `StoryPlayer` and `MinimalPlayer` from Task 9
- Produces: `<CutStoryPlayer variant="story"|"minimal" ... />`

- [ ] **Step 1: Rewrite CutStoryPlayer**

Replace `apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx`:

```tsx
"use client";

import type { CutOutput } from "@company-os/types";
import { Film, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { useStableMediaUrl } from "src/core/modules/agents/hooks/use-stable-media-url";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";
import { StoryPlayer } from "./players/story-player";
import { MinimalPlayer } from "./players/minimal-player";

export type PlayerVariant = "story" | "minimal";

type CutStoryPlayerProps = {
  fallbackSrc?: string | null;
  fallbackResourceKey?: string | null;
  cut: CutOutput | null;
  isResolvingSource?: boolean;
  hideMeta?: boolean;
  variant?: PlayerVariant;
  className?: string;
};

export const CutStoryPlayer = memo(function CutStoryPlayer({
  fallbackSrc,
  fallbackResourceKey,
  cut,
  isResolvingSource,
  hideMeta = false,
  variant = "story",
  className,
}: CutStoryPlayerProps) {
  const t = useTranslations("cuts.review");

  const usesRenderedClip = Boolean(cut?.cutFileId);
  const clipPreview = useCutClipPreviewUrl(cut, usesRenderedClip);
  const clipUrl = useStableMediaUrl(cut?.cutFileId ?? null, clipPreview.data?.url ?? null);
  const sourceUrl = useStableMediaUrl(fallbackResourceKey ?? null, fallbackSrc ?? null);

  const activeSrc = usesRenderedClip && clipUrl ? clipUrl : sourceUrl ?? null;
  const isLoading =
    !activeSrc &&
    (usesRenderedClip ? clipPreview.isLoading : Boolean(isResolvingSource));

  const PlayerComponent = variant === "minimal" ? MinimalPlayer : StoryPlayer;

  return (
    <div className={cn("flex min-h-0 flex-col gap-4", className)} data-testid="cut-story-player">
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line-subtle)] bg-[var(--bg-canvas)] p-4">
        <div className="relative aspect-[9/16] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-canvas)] shadow-[var(--shadow-lg)]">
          {activeSrc && cut ? (
            <PlayerComponent
              src={activeSrc}
              cutId={cut.id}
              startSec={usesRenderedClip ? 0 : cut.startSec}
              endSec={usesRenderedClip ? undefined : cut.endSec}
              className="size-full"
            />
          ) : isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-canvas)]">
              <Loader2 className="size-8 animate-spin text-[var(--accent)]" aria-hidden />
              <Paragraph size="p6" tone="tertiary">{t("loadingPreview")}</Paragraph>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--bg-canvas)] px-4 text-center">
              <Film className="size-8 text-[var(--fg-quaternary)]" aria-hidden />
              <Paragraph size="p6" tone="tertiary">{t("selectCutHint")}</Paragraph>
            </div>
          )}
        </div>
      </div>

      {cut && !hideMeta ? (
        <div className="shrink-0 space-y-2 border-t border-[var(--line-subtle)] pt-4">
          <Paragraph size="p3" tone="primary" className="font-medium">{cut.title}</Paragraph>
          <Paragraph size="p6" tone="tertiary" className="font-mono tabular-nums">
            {`${Math.floor(cut.startSec / 60)}:${String(Math.floor(cut.startSec % 60)).padStart(2, "0")} → ${Math.floor(cut.endSec / 60)}:${String(Math.floor(cut.endSec % 60)).padStart(2, "0")}`}
          </Paragraph>
          {cut.description ? (
            <Paragraph size="p4" tone="secondary" className="line-clamp-3">{cut.description}</Paragraph>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "cut-story-player" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/cut-story-player.tsx
git commit -m "feat(web): add variant prop to CutStoryPlayer — story and minimal"
```

---

## Task 11: Update apply-agent-run-event and use-cuts-run-modal for progressive rendering

**Files:**
- Modify: `apps/web/src/core/modules/agents/utils/apply-agent-run-event.ts`
- Modify: `apps/web/src/core/modules/agents/hooks/use-cuts-run-modal.ts`

**Interfaces:**
- `cut_rendered` event data: `{ cutId: string, cutFileId: string, renderedCount: number, totalCuts: number }`
- New state in modal hook: `totalCuts: number`, `progressiveRenderedCount: number`

- [ ] **Step 1: Add cut_rendered handler to apply-agent-run-event.ts**

In `apps/web/src/core/modules/agents/utils/apply-agent-run-event.ts`, add a new case in the switch:

```ts
case "cut_rendered": {
  const cutId = typeof data.cutId === "string" ? data.cutId : null;
  const cutFileId = typeof data.cutFileId === "string" ? data.cutFileId : null;
  if (!cutId || !cutFileId) return current;

  const currentOutput = (run.outputPayload ?? {}) as Record<string, unknown>;
  const existingCuts = Array.isArray(currentOutput.cuts)
    ? (currentOutput.cuts as Array<Record<string, unknown>>)
    : [];

  const updatedCuts = existingCuts.map((cut) =>
    cut.id === cutId ? { ...cut, cutFileId } : cut,
  );

  const newCut = existingCuts.every((c) => c.id !== cutId)
    ? null
    : null;

  return {
    ...current,
    run: {
      ...run,
      outputPayload: {
        ...currentOutput,
        cuts: newCut
          ? [...existingCuts, { id: cutId, cutFileId }]
          : updatedCuts,
        renderedCount: typeof data.renderedCount === "number" ? data.renderedCount : currentOutput.renderedCount,
        totalCuts: typeof data.totalCuts === "number" ? data.totalCuts : currentOutput.totalCuts,
      },
    },
  };
}

case "all_cuts_rendered":
  return current; // state already updated by cut_rendered events; no extra update needed
```

- [ ] **Step 2: Add totalCuts and progressiveRenderedCount to use-cuts-run-modal.ts**

In `apps/web/src/core/modules/agents/hooks/use-cuts-run-modal.ts`, add state for progressive tracking:

After existing state declarations, add:
```ts
const [totalCuts, setTotalCuts] = useState<number>(0);
const [progressiveRenderedCount, setProgressiveRenderedCount] = useState(0);
```

Update the phase transition effect to handle `awaiting_renders` pause:
```ts
useEffect(() => {
  if (!runId || (phase !== "processing" && phase !== "results")) return;

  if (runStatus === "FAILED" || runStatus === "CANCELLED") {
    setErrorMessage(runData?.run.errorMessage ?? tModal("errorGeneric"));
    setPhase("error");
    return;
  }

  // Transition to results when first cut is rendered OR when paused for review
  const outputPayload = runData?.run.outputPayload as Record<string, unknown> | undefined;
  const outputTotalCuts = typeof outputPayload?.totalCuts === "number" ? outputPayload.totalCuts : 0;
  const outputRenderedCount = typeof outputPayload?.renderedCount === "number" ? outputPayload.renderedCount : 0;

  if (outputTotalCuts > 0 && totalCuts !== outputTotalCuts) {
    setTotalCuts(outputTotalCuts);
  }
  if (outputRenderedCount > 0 && progressiveRenderedCount !== outputRenderedCount) {
    setProgressiveRenderedCount(outputRenderedCount);
  }

  if (
    runStatus === "COMPLETED" ||
    reviewable ||
    (phase === "processing" && (cuts.length > 0 || outputRenderedCount > 0))
  ) {
    setPhase("results");
  }
}, [runId, phase, runStatus, reviewable, cuts.length, runData, tModal, totalCuts, progressiveRenderedCount]);
```

Update `resetState` to include the new state:
```ts
setTotalCuts(0);
setProgressiveRenderedCount(0);
```

Expose in the return value:
```ts
totalCuts,
progressiveRenderedCount,
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "apply-agent|use-cuts-run-modal" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/modules/agents/utils/apply-agent-run-event.ts \
  apps/web/src/core/modules/agents/hooks/use-cuts-run-modal.ts
git commit -m "feat(web): handle cut_rendered SSE event for progressive cut state updates"
```

---

## Task 12: Redesign cuts-processing-step with step list UI

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/cuts/cuts-processing-step.tsx`

**Interfaces:**
- Consumes: `stepCompletions: { resolve_source: boolean, rank_segments: boolean }`, `progressiveRenderedCount: number`, `totalCuts: number`

- [ ] **Step 1: Rewrite the component**

Replace `apps/web/src/core/modules/agents/components/cuts/cuts-processing-step.tsx`:

```tsx
"use client";

import type { AgentRunStatus } from "@company-os/types";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "src/core/shared/utils";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type StepStatus = "pending" | "running" | "done";

type ProcessingStep = {
  key: string;
  label: string;
  status: StepStatus;
  detail?: string;
};

type CutsProcessingStepProps = {
  isUploading: boolean;
  uploadProgress: number;
  sourceFileName: string | null;
  runStatus: AgentRunStatus | null;
  resolveSourceDone: boolean;
  rankSegmentsDone: boolean;
  progressiveRenderedCount: number;
  totalCuts: number;
};

function StepRow({ step }: { step: ProcessingStep }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-5 shrink-0 items-center justify-center">
        {step.status === "done" ? (
          <div className="flex size-5 items-center justify-center rounded-full bg-[var(--accent)]">
            <Check className="size-3 text-white" strokeWidth={3} />
          </div>
        ) : step.status === "running" ? (
          <Loader2 className="size-5 animate-spin text-[var(--accent)]" />
        ) : (
          <div className="size-2 rounded-full bg-[var(--fg-quaternary)]" />
        )}
      </div>
      <div className="flex flex-col">
        <Paragraph
          size="p4"
          tone={step.status === "pending" ? "quaternary" : "primary"}
          className={cn("font-medium", step.status === "done" && "line-through opacity-60")}
        >
          {step.label}
        </Paragraph>
        {step.detail && step.status !== "pending" ? (
          <Paragraph size="p6" tone="tertiary">{step.detail}</Paragraph>
        ) : null}
      </div>
    </div>
  );
}

export const CutsProcessingStep = ({
  isUploading,
  uploadProgress,
  sourceFileName,
  runStatus,
  resolveSourceDone,
  rankSegmentsDone,
  progressiveRenderedCount,
  totalCuts,
}: CutsProcessingStepProps) => {
  const t = useTranslations("cuts.modal");

  if (isUploading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12" data-testid="cuts-processing-step" aria-busy="true">
        <Loader2 className="size-10 animate-spin text-[var(--accent)]" />
        <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
          <Paragraph className="font-medium">{t("uploading")}</Paragraph>
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--line-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <Paragraph size="p6" tone="tertiary">
            {t("uploadProgress", { progress: Math.round(uploadProgress) })}
          </Paragraph>
          {sourceFileName ? (
            <Paragraph size="p6" tone="tertiary" className="max-w-full truncate">{sourceFileName}</Paragraph>
          ) : null}
        </div>
      </div>
    );
  }

  const renderLabel =
    totalCuts > 0
      ? t("renderingCuts", { done: progressiveRenderedCount, total: totalCuts })
      : t("preparingRender");

  const renderStatus: StepStatus =
    progressiveRenderedCount >= totalCuts && totalCuts > 0
      ? "done"
      : totalCuts > 0 || rankSegmentsDone
        ? "running"
        : "pending";

  const steps: ProcessingStep[] = [
    {
      key: "resolve_source",
      label: t("stepTranscribe"),
      status: resolveSourceDone ? "done" : runStatus === "RUNNING" ? "running" : "pending",
    },
    {
      key: "rank_segments",
      label: t("stepRankCuts"),
      status: rankSegmentsDone ? "done" : resolveSourceDone ? "running" : "pending",
    },
    {
      key: "dispatch_renders",
      label: renderLabel,
      status: renderStatus,
      detail: totalCuts > 0 ? `${progressiveRenderedCount}/${totalCuts}` : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4 py-8 px-2" data-testid="cuts-processing-step" aria-busy="true" aria-live="polite">
      {steps.map((step) => (
        <StepRow key={step.key} step={step} />
      ))}
      {sourceFileName ? (
        <Paragraph size="p6" tone="quaternary" className="mt-2 truncate text-center">
          {sourceFileName}
        </Paragraph>
      ) : null}
    </div>
  );
};
```

- [ ] **Step 2: Add i18n keys**

The component uses new translation keys. Add to the `cuts.modal` namespace in the translations file (find it via `find apps/web -name "*.json" | xargs grep -l "cuts.modal" 2>/dev/null`):

```json
"stepTranscribe": "Transcrevendo vídeo",
"stepRankCuts": "Gerando cortes",
"preparingRender": "Preparando renderização...",
"renderingCuts": "Renderizando cortes ({done}/{total})"
```

- [ ] **Step 3: Update CutsRunModal to pass new props**

In `apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx`, the `CutsProcessingStep` call must pass the new props. Extract from `controller`:
```tsx
const {
  // ... existing
  totalCuts,
  progressiveRenderedCount,
} = controller;

// In the isProcessing block:
<CutsProcessingStep
  isUploading={isUploading}
  uploadProgress={uploadProgress}
  sourceFileName={sourceFileName}
  runStatus={runStatus}
  resolveSourceDone={/* from run steps or SSE step_completed events */}
  rankSegmentsDone={/* same */}
  progressiveRenderedCount={progressiveRenderedCount}
  totalCuts={totalCuts}
/>
```

For `resolveSourceDone` and `rankSegmentsDone`: add tracking to `use-cuts-run-modal.ts`:
```ts
const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
```

In `apply-agent-run-event.ts`, handle `step_completed`:
```ts
case "step_completed": {
  // existing handler — extract stepKey and track in modal hook
}
```

The simplest approach: read from `runData.steps` (polled data) which already has step statuses:
```ts
const resolveSourceDone = runData?.steps.some(
  (s) => s.stepKey === "resolve_source" && s.status === "COMPLETED"
) ?? false;
const rankSegmentsDone = runData?.steps.some(
  (s) => s.stepKey === "rank_segments" && s.status === "COMPLETED"
) ?? false;
```

Expose from `use-cuts-run-modal.ts` and pass to modal.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/cuts-processing-step.tsx \
  apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx \
  apps/web/src/core/modules/agents/hooks/use-cuts-run-modal.ts
git commit -m "feat(web): redesign processing step UI with granular step list and render counter"
```

---

## Task 13: Update CutStoryThumb with skeleton + first-frame + inline review

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/cuts/cut-story-thumb.tsx`

**Interfaces:**
- When `cut.cutFileId` is null: shows animated skeleton
- When `cut.cutFileId` is set: shows `<video>` paused at first frame (t=0)
- When `reviewable`: shows approve/reject buttons overlaid

- [ ] **Step 1: Rewrite the component**

Read the current file first:
```bash
cat apps/web/src/core/modules/agents/components/cuts/cut-story-thumb.tsx
```

Then replace with an implementation that:

```tsx
"use client";

import type { CutOutput } from "@company-os/types";
import { Check, X } from "lucide-react";
import { memo, useRef, useEffect } from "react";
import { useCutClipPreviewUrl } from "src/core/modules/agents/hooks/use-cut-clip-preview-url";
import { useStableMediaUrl } from "src/core/modules/agents/hooks/use-stable-media-url";
import { cn } from "src/core/shared/utils";

type CutDecision = "approve" | "reject";

type CutStoryThumbProps = {
  cut: CutOutput;
  index: number;
  selected: boolean;
  reviewable?: boolean;
  compact?: boolean;
  decision?: CutDecision;
  onSelect: () => void;
  onApprove?: () => void;
  onReject?: () => void;
};

/** Skeleton placeholder shown while cutFileId is not yet available */
function CutSkeleton({ index }: { index: number }) {
  return (
    <div className="flex aspect-[9/16] w-full flex-col overflow-hidden rounded-[var(--r-md)] bg-[var(--bg-elevated)]">
      <div className="flex-1 animate-pulse bg-[var(--line-subtle)]" />
      <div className="p-1.5">
        <div className="mb-1 h-2 w-3/4 animate-pulse rounded bg-[var(--line-subtle)]" />
        <div className="h-1.5 w-1/2 animate-pulse rounded bg-[var(--line-subtle)]" />
      </div>
      <div className="absolute inset-x-0 top-1 flex items-center justify-center">
        <span className="text-xs font-medium text-[var(--fg-quaternary)]">{index + 1}</span>
      </div>
    </div>
  );
}

export const CutStoryThumb = memo(function CutStoryThumb({
  cut,
  index,
  selected,
  reviewable = false,
  decision,
  onSelect,
  onApprove,
  onReject,
}: CutStoryThumbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasRendered = Boolean(cut.cutFileId);

  const clipPreview = useCutClipPreviewUrl(hasRendered ? cut : null, hasRendered);
  const clipUrl = useStableMediaUrl(cut.cutFileId ?? null, clipPreview.data?.url ?? null);

  // Pause video at first frame when src loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipUrl) return;

    const handleLoadedData = () => {
      video.currentTime = 0;
      video.pause();
    };

    video.addEventListener("loadeddata", handleLoadedData);
    return () => video.removeEventListener("loadeddata", handleLoadedData);
  }, [clipUrl]);

  const isApproved = decision === "approve";
  const isRejected = decision === "reject";

  return (
    <div
      role="option"
      aria-selected={selected}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-[var(--r-md)] transition-all duration-150",
        "border-2",
        selected
          ? "border-[var(--accent)]"
          : "border-transparent hover:border-[var(--line-subtle)]",
        isApproved && "ring-2 ring-green-500/60",
        isRejected && "ring-2 ring-[var(--danger)]/60 opacity-60",
      )}
      onClick={onSelect}
    >
      {!hasRendered ? (
        <div className="relative">
          <CutSkeleton index={index} />
        </div>
      ) : (
        <div className="relative aspect-[9/16] w-full bg-black">
          {clipUrl ? (
            <video
              ref={videoRef}
              src={clipUrl}
              className="size-full object-cover"
              preload="metadata"
              muted
              playsInline
              aria-label={cut.title}
            />
          ) : (
            <div className="size-full animate-pulse bg-[var(--bg-elevated)]" />
          )}

          {/* Decision overlay */}
          {isApproved ? (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
              <Check className="size-6 text-green-400" strokeWidth={3} />
            </div>
          ) : isRejected ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--danger)]/20">
              <X className="size-6 text-[var(--danger)]" strokeWidth={3} />
            </div>
          ) : null}

          {/* Cut number badge */}
          <div className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white">
            {index + 1}
          </div>

          {/* Inline review buttons */}
          {reviewable && (onApprove || onReject) ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
              {onReject ? (
                <button
                  type="button"
                  aria-label="Rejeitar"
                  onClick={(e) => { e.stopPropagation(); onReject(); }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-colors",
                    isRejected
                      ? "bg-[var(--danger)] text-white"
                      : "bg-white/20 text-white hover:bg-[var(--danger)] hover:text-white",
                  )}
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              ) : null}
              {onApprove ? (
                <button
                  type="button"
                  aria-label="Aprovar"
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full transition-colors",
                    isApproved
                      ? "bg-green-500 text-white"
                      : "bg-white/20 text-white hover:bg-green-500 hover:text-white",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Cut title below thumb */}
      {hasRendered ? (
        <div className="p-1.5">
          <p className="line-clamp-1 text-xs font-medium text-[var(--fg-secondary)]">{cut.title}</p>
        </div>
      ) : null}
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/cut-story-thumb.tsx
git commit -m "feat(web): CutStoryThumb — skeleton while rendering, first-frame thumb, inline review"
```

---

## Task 14: Update CutsReviewPanel for progressive skeleton slots

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/cuts/cuts-review-panel.tsx`

**Interfaces:**
- New prop: `totalCuts: number` — number of skeleton slots to show before cuts arrive
- Renders `totalCuts` slots; slots with a matching cut show the real thumb, empty slots show skeleton

- [ ] **Step 1: Update the component**

In `apps/web/src/core/modules/agents/components/cuts/cuts-review-panel.tsx`, add `totalCuts` prop and skeleton slots:

```tsx
export type CutsReviewPanelProps = {
  cuts: CutOutput[];
  totalCuts: number;               // NEW — total expected cuts (for skeleton slots)
  selectedCut: CutOutput | null;
  // ... rest unchanged
};
```

Update the grid to show skeleton slots for not-yet-rendered cuts:

```tsx
{/* In the grid rendering section: */}
{Array.from({ length: Math.max(cuts.length, totalCuts) }, (_, index) => {
  const cut = cuts[index];
  if (cut) {
    return (
      <CutStoryThumb
        key={cut.id}
        cut={cut}
        index={index}
        selected={cut.id === selectedCut?.id}
        reviewable={reviewable}
        decision={decisions[cut.id]}
        onSelect={() => onSelectCut(cut.id)}
        onApprove={onApprove ? () => onApprove(cut.id) : undefined}
        onReject={onReject ? () => onReject(cut.id) : undefined}
      />
    );
  }
  // Skeleton slot for cut not yet rendered
  return (
    <div
      key={`skeleton-${index}`}
      className="aspect-[9/16] animate-pulse rounded-[var(--r-md)] bg-[var(--bg-elevated)]"
      aria-hidden
    />
  );
})}
```

- [ ] **Step 2: Update CutsRunModal to pass totalCuts**

In `cuts-run-modal.tsx`, pass `totalCuts` from controller to `CutsReviewPanel`:

```tsx
<CutsReviewPanel
  cuts={cuts}
  totalCuts={totalCuts}
  // ... rest unchanged
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/cuts-review-panel.tsx \
  apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx
git commit -m "feat(web): CutsReviewPanel — progressive skeleton slots for not-yet-rendered cuts"
```

---

## Task 15: Animate modal expansion from processing to results

**Files:**
- Modify: `apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx`

**Interfaces:**
- When first cut arrives (`progressiveRenderedCount` goes from 0 to 1) and phase transitions to `results`: modal expands with smooth size transition

- [ ] **Step 1: Add expansion animation**

In `apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx`, update the `DialogContent` to use `tw-animate-css` and size transition:

```tsx
<DialogContent
  data-testid="cuts-run-modal"
  data-phase={phase}
  showCloseButton={!isBusy}
  className={cn(
    "transition-all duration-500 ease-in-out",
    isResults
      ? "flex max-h-[min(94vh,1000px)] h-[min(94vh,900px)] max-w-[min(97vw,1180px)] flex-col overflow-hidden gap-0 p-0 sm:max-w-[min(97vw,1180px)]"
      : phase === "error"
        ? "max-w-lg gap-6"
        : "max-w-lg gap-6 overflow-hidden",
  )}
>
```

The `transition-all duration-500` on `DialogContent` animates the width/height changes when the class switches from `max-w-lg` (processing) to `max-w-[1180px]` (results). This works if the Dialog uses `max-width` transitions.

For the phase transition animation, add `tw-animate-css` fade-in on the results content:

```tsx
{isResults ? (
  <div className={cn(
    "flex flex-col flex-1 min-h-0",
    "animate-in fade-in duration-300"
  )}>
    {/* results content */}
  </div>
) : null}
```

- [ ] **Step 2: Update player variant in results view**

In the `CutsReviewPanel` call inside `cuts-run-modal.tsx`, the `CutStoryPlayer` in the right panel should use `variant="story"` for generate intent and `variant="minimal"` for view intent:

In `cuts-review-panel.tsx`, add `playerVariant` prop and pass to `CutStoryPlayer`:
```tsx
<CutStoryPlayer
  fallbackSrc={fallbackPlayerSrc}
  fallbackResourceKey={fallbackPlayerResourceKey}
  cut={selectedCut}
  variant={playerVariant ?? "story"}
  isResolvingSource={isResolvingSource}
  hideMeta
  className="min-h-0 flex-1"
/>
```

In `cuts-run-modal.tsx`:
```tsx
<CutsReviewPanel
  playerVariant={intent === "view" ? "minimal" : "story"}
  // ... rest
/>
```

- [ ] **Step 3: Verify the full flow TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/core/modules/agents/components/cuts/cuts-run-modal.tsx \
  apps/web/src/core/modules/agents/components/cuts/cuts-review-panel.tsx
git commit -m "feat(web): animated modal expansion on first cut render, story/minimal player by intent"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Task |
|---|---|
| Remove RAG/context from agent | Task 5 |
| dispatch_renders step (batchTrigger non-blocking) | Task 3 |
| await_renders pause step | Task 4 |
| SDK kernel render_cuts → dispatch_renders | Task 6 |
| Trigger task: presigned URL interno + HTTP Range | Task 8 |
| Trigger task: callback endpoint | Tasks 7 + 8 |
| SSE cut_rendered + all_cuts_rendered | Tasks 1 + 2 + 7 |
| Processing UI: etapas com checks | Task 12 |
| Player story-style (vidstack) | Task 9 |
| Player minimal (vidstack) | Task 9 |
| CutStoryPlayer variant prop | Task 10 |
| Thumbnails: skeleton → video first frame | Task 13 |
| Review buttons: inline no thumb + abaixo do player | Tasks 13 + 14 |
| Grade com slots progressivos | Task 14 |
| Modal animado expanding | Task 15 |
| Página de resultados usa mesmo modal | Already works via `handleOpenRunDetails` — no new task needed |

### Type consistency

- `dispatch_renders` step key used consistently in Tasks 3, 4, 5, 6
- `cut_rendered` event type added in Task 1, emitted in Task 2, handled in Task 11
- `CutsRunDeps.ensureRunFolder` + `dispatchRenderJobs` defined in Task 3 port and implemented in deps
- `PlayerVariant = "story" | "minimal"` defined in Task 10, consumed in Tasks 14 + 15
- `totalCuts` added to modal hook in Task 11, passed through modal in Tasks 14 + 15

### Known implementation detail

The `await_renders` step uses `createPauseStep` with `pauseType: 'form'` (existing type). The `pauseReason: 'awaiting_renders'` is non-standard but ignored by the form UI — only the frontend needs to know it's not a user-facing form. If the existing frontend code reacts to `pauseReason === 'awaiting_cut_review'` for the review button, ensure `awaiting_renders` does not trigger that path.
