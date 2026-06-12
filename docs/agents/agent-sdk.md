# Agent SDK — Documentação completa

> **Pacote:** `@company-os/agent-sdk` (`packages/agent-sdk`)
> **Status:** Vigente
> **Decisões base:** [`2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md) · [`2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)
> **Regras do projeto:** `CLAUDE.md` §7, §14, §15, §16

---

## 1. O que é o Agent SDK

O Agent SDK contém **100% da lógica de agentes** do Blister OS: o kernel de
workflow, a API de construção (`AgentBuilder`), os tipos de step, os schemas de
validação, o motor de execução, o streaming de blocos e o registry de learning.

O pacote é **agnóstico de framework e de banco**. Ele não conhece NestJS, Prisma,
RAG ou Trigger.dev. Tudo que é específico de infraestrutura entra por
**interfaces injetadas** (`LlmProvider`, `ImageProvider`, `RunStore`,
`ContextPackBuilder`, `EventPublisher`, etc.), implementadas em
`apps/api/src/agents/` (a camada de adapters HTTP).

```
┌─────────────────────────────────────────────────────────────┐
│  packages/agent-sdk  — lógica pura, sem dependência de infra  │
│  • AgentBuilder / defineAgent     • executeRun (kernel)       │
│  • steps (factories)              • schemas / validação Zod   │
│  • clarification / intelligence   • routing                   │
│  • learning registry              • stream / BlockEmitter     │
│  • middleware / observability     • testing harness           │
└───────────────▲───────────────────────────────────────────────┘
                │ interfaces injetadas (providers/stores)
┌───────────────┴───────────────────────────────────────────────┐
│  apps/api/src/agents  — adapters + HTTP + persistência         │
│  • adapters/ (Prisma RunStore, LLM, RAG, usage, memory)        │
│  • runtime/ (WorkflowEngine, AgentRun*, AgentRegistry, SSE)    │
│  • runtime/kernel/ (executeRun NestJS, step registry, credits) │
│  • *.controller.ts (POST /agents/:agentId/run, runs, catalog)  │
└────────────────────────────────────────────────────────────────┘
```

### Princípios invioláveis (CLAUDE.md §7, §14)

- **1 agente = 1 pasta** em `packages/agent-sdk/src/agents/<agentId>/`.
- **Registry, não switch** — agentes são plugáveis e isolados.
- **Sem pipeline automático** — cada run é `POST /api/agents/:agentId/run`.
- Output do run em `AgentRun.outputPayload`.
- `learning/feedback-handler.ts` é **obrigatório** em todo agente.
- Validação **Zod em toda fronteira** (input, output de step, payload de agente).

---

## 2. Estrutura do pacote

```
packages/agent-sdk/src/
  core/
    agent-builder.ts        AgentBuilder + defineAgent
    agent-registry.ts       AgentRegistry (in-memory)
    types.ts                BuiltAgent, StepExecutionContext, StepResult, providers
    agent-runtime-types.ts  tipos do kernel (ExecutionKernelDeps, etc.)
    execute-run.ts          motor de execução (state machine do run)
    run-store.ts            interface RunStore + tipos de persistência
    checkpoint.ts           CheckpointStore para re-execução
  steps/                    factories de step (LLM, validação, output, imagem, pause…)
  schemas/                  Zod → JSON schema, parseLlmJson, validateStepOutput, normalizer
  clarification/            fluxo de formulário adaptativo (ClarificationFlow)
  intelligence/             analyze-request + adaptive-brief
  routing/                  skips condicionais de step
  learning/                 LearningSerializerRegistry (feedback → RAG)
  stream/                   BlockEmitter + EventPublisher + eventos de run
  middleware/               hooks beforeRun/afterRun/beforeStep/afterStep
  observability/            TelemetryProvider + RunSnapshotBuilder
  memory/                   MemoryProvider (recall de runs anteriores)
  usage/                    UsageReporter (tokens/custo)
  tools/                    ToolRegistry + createToolStep
  context/                  buildStepContext
  testing/                  AgentTestHarness, StepTestHarness, fixtures, matchers
  index.ts                  barrel export público
```

Tudo o que é público é exportado por `packages/agent-sdk/src/index.ts` — ver
a tabela de referência na §13.

---

## 3. Modelo mental: o ciclo de um run

```
POST /api/agents/:agentId/run
        │
        ▼
WorkflowEngineService.startRun()           (apps/api)
   • valida userInput contra inputSchema
   • cria AgentRun (status QUEUED) no Prisma
   • resolve execution mode (inline-stub | inline-live | trigger)
        │
        ▼
executeRun(deps, params)                   (SDK — core/execute-run.ts)
   • carrega a definição via loadAgentDefinition(agentId)
   • abre BlockEmitter (streaming)
   • para cada step na ordem definida:
        buildStepContext()  → StepExecutionContext
        step.run(ctx, deps) → StepResult
        persiste blocos + debita créditos (UsageReporter)
        se StepResult.type === 'PAUSED' → pausa o run (form)
   • finaliza: COMPLETED | FAILED | PAUSED
        │
        ▼
AgentRun.outputPayload preenchido
   • cliente recebe blocos por SSE em tempo real
   • feedback (approve/reject/edit) → LearningSerializerRegistry → RAG
```

Estados do run (`AgentRunStatus`): `QUEUED → RUNNING → (PAUSED) → COMPLETED | FAILED | CANCELLED`.

---

## 4. Construindo um agente — `AgentBuilder`

A API fluente está em `core/agent-builder.ts`. Um agente é construído uma vez
(no carregamento do módulo) e produz um `BuiltAgent`.

```ts
import { z } from 'zod';
import {
  AgentBuilder,
  createRetrieveContextStep,
  createLlmCallStep,
  createOutputStep,
} from '@company-os/agent-sdk';

const researchInput = z.object({ userInput: z.string().min(1) });
const researchOutput = z.object({
  brief: z.string(),
  references: z.array(z.string()),
});

export const researchAgent = AgentBuilder.create({ id: 'research', version: '1.0.0' })
  .label('Pesquisar')
  .description('Briefing, tendências e referências para o próximo conteúdo.')
  .capabilities(['text', 'analysis'])
  .estimatedCost(0.05)
  .input(researchInput)
  .output(researchOutput)
  .withContext({ useRag: true, scope: 'workspace' })
  .addStep('retrieve_context', {
    label: 'Buscar contexto',
    type: 'retrieve_context',
    run: createRetrieveContextStep(),
  })
  .addStep('generate_brief', {
    label: 'Gerar briefing',
    type: 'llm_call',
    run: createLlmCallStep({
      schema: researchOutput,
      buildSystemPrompt: (ctx) => `Você é um pesquisador de conteúdo. ${ctx.brand?.voice ?? ''}`,
      buildUserPrompt: (ctx) => ctx.run.userInput,
    }),
  })
  .addStep('finalize', {
    label: 'Finalizar',
    type: 'output',
    run: createOutputStep(),
  })
  .withLearning(researchLearningHandler) // obrigatório
  .build();

export const researchAgentDefinition = researchAgent.definition;
```

### Métodos do `AgentBuilder`

| Método | Obrigatório | Descrição |
|--------|-------------|-----------|
| `.create(id \| { id, version })` | sim | Cria o builder. |
| `.label(string)` | recomendado | Label operacional exibido na UI. |
| `.description(string)` | não | Descrição curta. |
| `.input(ZodType)` | **sim** | Schema do payload de entrada. `build()` lança se ausente. |
| `.output(ZodType)` | **sim** | Schema do `outputPayload`. `build()` lança se ausente. |
| `.review(ZodType)` | não | Subset revisável (aprovar/editar). |
| `.capabilities(string[])` | não | Tags: `text`, `analysis`, `strategy`, `planning`, `image`, `html`… |
| `.estimatedCost(number)` | não | Custo estimado em créditos (exibido no catálogo). |
| `.withContext(AgentContextConfig)` | não | Configura RAG/escopo de contexto. |
| `.withSkills(string[])` | não | IDs de skills/prompts associados. |
| `.withLearning(handler)` | **sim (§14)** | Registra o serializer de feedback no `LearningSerializerRegistry`. |
| `.withTools(AgentTool[] \| ToolRegistry)` | não | Tools chamáveis como step. |
| `.addRouting(RoutingRule)` | não | Regra de skip condicional de steps. |
| `.beforeRun / .afterRun / .beforeStep / .afterStep(fn)` | não | Middleware (hooks). |
| `.addStep(key, { label, type, config?, run })` | **sim (≥1)** | Adiciona um step. Lança em key duplicada. |
| `.build()` | sim | Valida e retorna `BuiltAgent`. |

### `defineAgent` — atalho funcional

Equivalente declarativo ao builder fluente, útil para agentes simples:

```ts
export const researchAgent = defineAgent({
  agentId: 'research',
  label: 'Pesquisar',
  input: researchInput,
  output: researchOutput,
  learning: researchLearningHandler,
  steps: [
    { key: 'retrieve_context', label: 'Buscar contexto', type: 'retrieve_context', run: createRetrieveContextStep() },
    { key: 'generate_brief', label: 'Gerar briefing', type: 'llm_call', run: createLlmCallStep({ /* … */ }) },
    { key: 'finalize', label: 'Finalizar', type: 'output', run: createOutputStep() },
  ],
});
```

### O que `build()` produz — `BuiltAgent`

```ts
interface BuiltAgent {
  definition: BuiltAgentDefinition; // metadados + steps + JSON schemas (input/output/review)
  steps: Record<string, AnyStepExecutor>; // executores por stepKey
  learning?: LearningHandler;
  tools?: ToolRegistry;
  routing?: RoutingRule[];
  middleware: AgentMiddleware;
}
```

`definition.inputSchema` e `definition.outputSchema` já são **JSON Schema**
(convertidos via `zodToJsonSchema`), prontos para serialização no catálogo.

---

## 5. Steps

Um step é uma função `(ctx, deps) => StepResult`. Não escreva steps na mão sem
necessidade — use as **factories**, que já tratam validação, parsing de JSON do
LLM, retry e emissão de blocos.

### Factories disponíveis (`steps/`)

| Factory | Tipo | Uso |
|---------|------|-----|
| `createRetrieveContextStep()` | `retrieve_context` | Busca contexto no RAG (via `ContextPackBuilder`), filtrado por `workspaceId`. |
| `createLlmCallStep({ schema, buildSystemPrompt, buildUserPrompt, … })` | `llm_call` | Chamada LLM com saída validada contra Zod (`parseLlmJson` + `validateStepOutput`). |
| `createValidationStep(schema)` | `validation` | Valida o acumulado contra um schema. |
| `createOutputStep()` | `output` | Consolida o resultado final em `outputPayload`. |
| `createImageGenerationStep({ … })` | `image_generation` | Geração de imagem via `ImageProvider`. |
| `createPauseStep(options)` | `pause` | Pausa o run para coletar um formulário (clarification). |
| `createClarificationStep(flow)` | `clarification` | Conduz um `ClarificationFlow`. |
| `createToolStep(tool)` | `tool_call` | Executa uma tool registrada. |

Opções transversais úteis: `RetryPolicy` (retries com backoff por
`RetryReason`) e `CacheProvider` (`createInMemoryCacheProvider`) para memoizar
chamadas caras.

### `StepExecutionContext` (o que cada step recebe)

```ts
interface StepExecutionContext {
  run: { id; agentId; userInput; inputPayload };
  company?: { id };
  campaign?: { id };
  brand?: BrandProfile;          // identidade do workspace (Settings)
  contextPack?: ContextPack;     // chunks do RAG (Files + feedback indexado)
  previousStepsOutput: Record<string, unknown>; // saídas dos steps anteriores
  message: MessageHandle;        // API de streaming de blocos (ver §8)
}
```

### `StepResult`

```ts
type StepResult =
  | { type: 'CONTINUE'; output: unknown }   // segue para o próximo step
  | { type: 'COMPLETE'; output: unknown }   // encerra o run com sucesso
  | { type: 'PAUSED'; pauseFormSchema }     // pausa para formulário
  | { type: 'FAILED'; errorMessage: string };
```

---

## 6. Schemas e validação (Zod)

Tudo em `schemas/`. Regra do projeto: **Zod em toda fronteira**.

- `zodToJsonSchema(zod)` — converte Zod → JSON Schema (usado no `build()`).
- `parseLlmJson(text, options)` — parsing robusto da saída do LLM com fallbacks
  (cerca de código, JSON parcial). Retorna `ParseLlmJsonResult`.
- `validateStepOutput(schema, value)` — valida a saída de um step.
- `defineAgentSchemas()` — converte um conjunto de Zod em JSON schemas.
- `createNormalizer(rules)` / `createValidator(...)` — normalização e validação
  reutilizáveis.
- `request-analysis` — schemas para classificar a intenção do usuário
  (`baseRequestAnalysisSchema`, `defineRequestAnalysisSchema`).

---

## 7. Clarification, intelligence e routing

**Clarification** (`clarification/`): formulários adaptativos. Defina campos com
`defineClarificationFlow`, avance com `getNextField`, mescle respostas com
`mergeFormData` e resolva campos condicionais com `resolveConditionalFields`.
Combine com `createPauseStep` para pausar o run aguardando input.

**Intelligence** (`intelligence/`): antes de perguntar, o agente pode analisar a
mensagem do usuário (`createAnalyzeRequestStep` / `analyzeUserRequest`) e pular
perguntas cuja resposta já é inferível (`createAdaptiveBriefStep`). Isso
sustenta a regra de **simplicidade radical** (CLAUDE.md §10): no máximo 2–3
campos para iniciar uma tarefa.

**Routing** (`routing/`): `addRouting(rule)` + `computeRoutingSkips` permitem
pular steps condicionalmente conforme o input/análise. `suggestWorkflowPath` e
`mapSuggestedPathToBranch` ajudam a escolher a ramificação.

---

## 8. Streaming — `BlockEmitter` e eventos

O `BlockEmitter` (`stream/`) é o coração do streaming. Cada step recebe
`ctx.message` (`MessageHandle`) para emitir blocos enquanto trabalha:

- Tipos de bloco: `thinking`, `text`, `searching`, `planning`, `form_question`,
  `output`, `error`, `working`.
- `appendText` é append-only (delta), ideal para streaming token a token.
- Os blocos são persistidos via `AgentRunBlockServiceLike` (implementado por
  `AgentRunBlockService` na API) e publicados via `EventPublisher`.

Eventos de run (`run-events.ts`): `createRunStartedEvent`,
`createRunCompletedEvent`, `createRunFailedEvent`, `createRunPausedEvent`. Na
API, `AgentSseService` transmite esses eventos por SSE ao cliente.

---

## 9. Learning / feedback (obrigatório)

`learning/learning-registry.ts` expõe o `LearningSerializerRegistry`. Todo
agente registra um `LearningHandler` via `.withLearning(...)`. O handler:

- `serialize(feedback)` → markdown indexável no RAG do workspace.
- `extractInsights(feedback)` → sinais estruturados (`LearningSignal`).

```ts
export const researchLearningHandler: LearningHandler = {
  serialize: (fb) => `# Aprendizado (research)\nAprovado: ${fb.approved}\n${fb.userFeedback ?? ''}`,
  extractInsights: (fb) => [{ signalType: 'tone', signalValue: fb.approved ? 'ok' : 'revise', weight: 1 }],
};
```

O feedback (`AgentFeedback`) e os sinais (`LearningSignal`) são persistidos e
**re-indexados no RAG filtrado por `workspaceId`** — sem vazamento cross-tenant
(CLAUDE.md §15).

---

## 10. Execução — kernel e providers

`executeRun(deps, params)` (`core/execute-run.ts`) é o motor. Ele recebe
`ExecutionKernelDeps` com as interfaces de infra:

| Dependência | Interface | Implementação (API) |
|-------------|-----------|---------------------|
| Persistência do run | `RunStore` | `prisma-run-store.adapter.ts` |
| LLM | `LlmProvider` / `LlmProviderRuntime` | `trigger-providers.ts` |
| Imagem | `ImageProvider` | `trigger-providers.ts` |
| Contexto RAG | `ContextPackBuilder` | `context-pack-builder.adapter.ts` |
| Memória | `MemoryProvider` | `memory-provider.adapter.ts` |
| Uso/custo | `UsageReporter` | `usage-reporter.adapter.ts` |
| Eventos | `EventPublisher` | `in-process-event.publisher.ts` |
| Executores custom | `Record<string, CustomStepExecutor>` | `agent-step-registry.ts` |

**Créditos** (CLAUDE.md §16): o débito ocorre por step LLM
(`credit-debit.helper.ts` na API, via `UsageReporter`).

`RunStore` é a fronteira de persistência: `findRun`, `claimRunForExecution`,
`startStep`, `completeStep`, `failRun`, `mergeInputPayload`,
`getCompletedStepOutputs`. Para re-execução determinística há o
`CheckpointStore` (`createInMemoryCheckpointStore`).

---

## 11. Camada de API (`apps/api/src/agents`)

A API é **apenas adapters + HTTP**. Nenhuma lógica de agente vive aqui.

### Endpoints

| Método | Rota | Serviço |
|--------|------|---------|
| `POST` | `/agents/:agentId/run` | `WorkflowEngineService.startRun` |
| `GET` | `/agents/:agentId/runs` | `AgentRunService.listByAgent` |
| `GET` | `/agents/catalog` | `AgentRegistryService.getCatalog` |
| `GET` | `/agents/runs/:runId` | status + steps + blocks |
| `POST` | `/agents/runs/:runId/resume` | `WorkflowEngineService.resumeRun` (de PAUSED) |
| `POST` | `/agents/runs/:runId/cancel` | `WorkflowEngineService.cancelRun` |
| `POST` | `/agents/runs/:runId/approve` \| `/reject` | `AgentRunReviewService` (feedback → learning) |
| `PATCH` | `/agents/runs/:runId/output` | edição do output aprovado |
| `POST` | `/agents/runs/:runId/regenerate` | re-run com feedback |

Regras (CLAUDE.md §2, §3): `userId` sempre de `req.currentUser.id`, IDs de
recurso de `req.params`, nunca do body. Endpoints com guard ou `@Public`.

### Registro de um agente na API

1. **Definição/loader** — `runtime/kernel/agent-loader.ts`: adicione ao
   `defaultAgentDefinitions` (ou `registerAgentDefinition(def)`).
2. **Step executors** — `runtime/kernel/agent-step-registry.ts`: espalhe
   `...buildAgentStepExecutors(<agent>)` (gera entradas `agentId:stepKey`).
3. **Catálogo** — `agent-catalog.ts`: adicione um `toRegisteredAgent({ … })` em
   `buildRegisteredAgents()` (alimenta `AgentRegistryService`).
4. **Seed** — `prisma/seed.ts` e `prisma/seed-ai-catalog.ts`: registre o
   `agentId` em `PIPELINE_AGENTS`/`pipelineAgents` e a política de modelo.

> Após a remoção dos agentes legados, todos esses pontos estão **vazios**
> (catálogo retorna `[]`, loader/registry sem entradas). Eles são os ganchos
> onde os novos agentes (`research`, `cuts`, `video_editor`, e marketplace)
> serão plugados.

### Modelos Prisma relevantes

`AgentRun`, `AgentRunStep`, `AgentRunBlock`, `AgentFeedback`, `LearningSignal`,
`AgentMemory`, `PipelineAgentConfig`. Enums: `AgentRunStatus`,
`AgentRunStepStatus`, `StepResultType`, `FeedbackType`. Nunca editar
`apps/api/src/generated/prisma` à mão (CLAUDE.md §5).

---

## 12. Testes — harness do SDK

`testing/` oferece harnesses que rodam agentes/steps com providers fake:

```ts
import { AgentTestHarness, StepTestHarness } from '@company-os/agent-sdk';

const harness = new AgentTestHarness(researchAgent);
const result = await harness.run({ userInput: 'tema X' });
expect(result.status).toBe('COMPLETED');

// matcher de schema
import { registerSchemaMatchers } from '@company-os/agent-sdk';
registerSchemaMatchers();
expect(result.output).toMatchSchema(researchOutput);
```

Fixtures prontas: `brandProfileFixture`, `contextPackFixture`. Stubs:
`in-memory-run-store`, `in-memory-block-store`.

---

## 13. Passo a passo: criar um novo agente

1. Crie `packages/agent-sdk/src/agents/<agentId>/`.
2. `schemas/output.schema.ts` — `Zod` de input, output e (se houver) review.
3. `prompts/` — builders de system/user prompt.
4. `learning/feedback-handler.ts` — `LearningHandler` (**obrigatório**).
5. `agent.ts` — monte com `AgentBuilder`/`defineAgent`, exporte `agent` e
   `agentDefinition`.
6. Registre na API (§11): loader, step registry, catálogo, seed.
7. Doc em `docs/agents/<agentId>/README.md`.
8. Se for marketplace: item + preview no catálogo admin; o resgate desbloqueia
   o `agentId` (entitlement).
9. Teste com `AgentTestHarness` e adicione um smoke Playwright na superfície (P2+).

### Catálogo de agentes do produto (alvo)

| Tier | IDs |
|------|-----|
| Default (signup) | `research`, `cuts`, `video_editor` |
| Marketplace (resgate → Biblioteca) | `planning`, `script`, `thumbnail`, `distribution` |

> Os agentes legados MEI (`strategist`, `copywriter`, `designer`, `post`) foram
> **removidos** do código. Não reintroduzir.

---

## 14. Referência rápida de exports (`@company-os/agent-sdk`)

| Área | Exports principais |
|------|--------------------|
| Core | `AgentBuilder`, `defineAgent`, `AgentRegistry`, `executeRun`, `buildStepContext` |
| Tipos | `BuiltAgent`, `BuiltAgentDefinition`, `StepExecutionContext`, `StepResult`, `StepExecutor`, `LlmProvider`, `ImageProvider`, `BrandProfile`, `ContextPack` |
| Steps | `createLlmCallStep`, `createRetrieveContextStep`, `createValidationStep`, `createOutputStep`, `createImageGenerationStep`, `createPauseStep`, `createClarificationStep`, `createToolStep`, `createInMemoryCacheProvider` |
| Schemas | `zodToJsonSchema`, `parseLlmJson`, `validateStepOutput`, `defineAgentSchemas`, `createNormalizer`, `createValidator`, `baseRequestAnalysisSchema` |
| Clarification | `defineClarificationFlow`, `getNextField`, `mergeFormData`, `resolveConditionalFields` |
| Intelligence | `analyzeUserRequest`, `createAnalyzeRequestStep`, `createAdaptiveBriefStep` |
| Routing | `computeRoutingSkips`, `createConditionalStep`, `suggestWorkflowPath`, `mapSuggestedPathToBranch` |
| Learning | `LearningSerializerRegistry`, `LearningHandler` |
| Stream | `BlockEmitter`, `EventPublisher`, `MessageHandle`, `createRun*Event` |
| Middleware | `createEmptyMiddleware`, `AgentMiddleware` |
| Observability | `RunSnapshotBuilder`, `createNoOpTelemetryProvider`, `TelemetryProvider` |
| Memory / Usage | `createNoOpMemoryProvider`, `MemoryProvider`, `createCollectingUsageReporter`, `createNoOpUsageReporter` |
| Kernel | `RunStore`, `ExecutionKernelDeps`, `CustomStepExecutor`, `CheckpointStore`, `createInMemoryCheckpointStore` |
| Testing | `AgentTestHarness`, `StepTestHarness`, `assertMatchesSchema`, `toMatchSchema`, `registerSchemaMatchers`, `brandProfileFixture`, `contextPackFixture` |

---

## 15. Fontes de verdade

1. [`docs/agents/README.md`](README.md) — catálogo e princípios
2. [`docs/agents/workflow-engine.md`](workflow-engine.md) — kernel
3. [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)
4. `CLAUDE.md` §7, §14, §15, §16
5. Código: `packages/agent-sdk/src/index.ts` (superfície pública)
