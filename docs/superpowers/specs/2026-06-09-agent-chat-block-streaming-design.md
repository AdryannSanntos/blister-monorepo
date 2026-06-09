# Design — Chat de agente por protocolo de blocos via SSE

> Data: 2026-06-09 · Status: aprovado para implementação
> Contexto: Blister — marketing com IA. Agentes isolados (`POST /api/agents/:agentId/run`),
> output em `AgentRun.outputPayload`, revisão por agente, zero jargão de IA na UI.

## Problema

O chat do agente hoje reconstrói o estado da UI a partir de um blob `run + steps`
(`apps/web/src/core/modules/agents/utils/build-agent-messages.ts`, ~860 linhas),
com casos especiais por agente (hardcode do workflow `post`). Os eventos SSE atuais
são genéricos (`run_started`, `step_started`, `step_completed`, `step_failed`,
`run_paused`, `run_completed`, `run_failed`, `output_chunk`) e não carregam semântica
de apresentação. Consequências:

- Em falha (ex.: `plan_design` FAILED) a UI mostra pouco ou nada útil.
- A timeline de "pensamento" do agente é inferida de `steps`, de forma frágil.
- Não há um contrato claro: "cada passo do agente é um evento tipado distinto".

## Solução

Introduzir um **protocolo de blocos** sobre o SSE. Uma **mensagem** do assistente é
uma lista ordenada de **blocos** tipados. Cada evento SSE referencia
`(messageId, blockId)`. Blocos-anotação (thinking, searching, planning, working)
chegam antes dos blocos-conteúdo (text, output) na mesma mensagem — o "exibido acima
da mensagem". Um run pode emitir várias mensagens (ex.: um ciclo por pergunta/resposta).

O modelo encaixa nativamente no `agent-elements`: cada mensagem é um `UIMessage` com
`parts[]` em ordem de chegada.

### Decisões aprovadas

1. **Protocolo de blocos** + manter `AgentRun`/`AgentRunStep` como registro durável.
2. **Persistir os blocos** (nova tabela `AgentRunBlock`) para histórico fiel.
3. **Texto e thinking em tokens** (`block_delta`); searching/form/output como blocos discretos.
4. Catálogo completo de blocos no MVP: `thinking`, `searching_context`, `planning`,
   `working`, `simple_text` (`text`), `form_question`, `output`, `error`.
5. Turnos do usuário também são blocos (`role: 'user'`) → frontend lê **uma única fonte**.

## Protocolo de eventos SSE

**Envelope** (inalterado): `{ type, runId, timestamp, data }`.

**Ciclo de vida** (mantidos): `run_started`, `run_paused`, `run_completed`, `run_failed`.

**Novos eventos de bloco:**

| Evento | `data` | Uso |
|---|---|---|
| `message_start` | `{ messageId, role }` | abre uma mensagem |
| `block_start` | `{ messageId, blockId, blockType, index, label?, stepKey? }` | abre um bloco |
| `block_delta` | `{ messageId, blockId, delta }` | append token-a-token (thinking, text) |
| `block_end` | `{ messageId, blockId, status, payload? }` | finaliza com payload discreto |
| `message_end` | `{ messageId }` | fecha a mensagem |

`blockType` (enum, identificadores em inglês; rótulos pt-BR só na UI):

- **Anotação:** `thinking`, `searching_context`, `planning`, `working`
- **Conteúdo:** `text`, `form_question`, `output`, `error`

**Mapeamento bloco → renderer (`agent-elements`):**

| blockType | Renderer | Streaming |
|---|---|---|
| `thinking` | ThinkingTool (`tool-Thinking`) | sim (`block_delta`) |
| `searching_context` | SearchTool (`tool-Search`) | discreto |
| `planning` | PlanTool (`tool-PlanWrite`) | discreto (payload com resumo) |
| `working` | card de status (SpiralLoader/Thinking) | discreto |
| `text` | part `text` | sim (`block_delta`) |
| `form_question` | QuestionTool (`tool-Question`) | discreto; pausa o run |
| `output` | BlisterPost / BlisterOutput / BlisterReview | discreto |
| `error` | ErrorMessage | discreto |

### Semântica de vínculo e ordenação

- Cada mensagem do assistente = um `UIMessage` com `parts[]` na ordem dos blocos (`index`).
- Anotações vêm antes do conteúdo naturalmente, pela ordem de emissão.
- O frontend mantém ordem por `(messageId, index)`; dedupe por `(messageId, blockId)`.

## Persistência — nova tabela `AgentRunBlock`

`AgentRun`/`AgentRunStep` permanecem como registro durável de execução. A nova tabela
é a **timeline de apresentação** (append-only, atualizável durante streaming):

```prisma
model AgentRunBlock {
  id         String   @id @default(cuid())
  agentRunId String
  messageId  String
  role       String   // 'user' | 'assistant'
  blockType  String
  index      Int
  label      String?
  text       String?  @db.Text   // texto acumulado (thinking/text)
  payload    Json     @default("{}") // discreto: results, plan, formSchema, output, error
  stepKey    String?
  status     String   // 'streaming' | 'complete' | 'error'
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  agentRun   AgentRun @relation(fields: [agentRunId], references: [id], onDelete: Cascade)

  @@unique([agentRunId, messageId, index])
  @@index([agentRunId])
}
```

Adicionar `blocks AgentRunBlock[]` ao model `AgentRun`. Migração **aditiva** — nenhuma
mudança em `AgentRun`/`AgentRunStep`.

Turnos do usuário (input inicial + respostas de formulário no resume) são persistidos
como blocos `role: 'user'`, `blockType: 'text'`, no momento em que chegam. Resultado:
o frontend lê uma única fonte (blocos) ao vivo e no histórico.

## Backend

### Contratos (`packages/types/src/agents.ts`)

- Estender `agentRunEventTypeSchema` com `message_start`, `block_start`, `block_delta`,
  `block_end`, `message_end`.
- Adicionar `blockTypeSchema`, `agentRunBlockRoleSchema`, `agentRunBlockStatusSchema`.
- Adicionar `agentRunBlockDtoSchema` e tipos derivados.
- Adicionar schemas Zod do `data` por evento de bloco (validação em fronteira).

### `BlockEmitter` (novo helper no kernel)

Abstração sobre `EventPublisher` com API semântica que **(a)** publica o evento SSE e
**(b)** persiste/atualiza o `AgentRunBlock` (via Prisma). Substitui as factories cruas
(`createOutputChunkEvent`, `createStep*`).

API (esboço):

```ts
interface BlockEmitter {
  openMessage(role?: 'assistant'): MessageHandle;   // emite message_start
}
interface MessageHandle {
  thinking(): StreamingBlock;        // block_start(thinking); .delta(); .end()
  text(): StreamingBlock;            // block_start(text); .delta(); .end()
  searching(payload): Promise<void>; // block_start+block_end(searching_context)
  planning(payload): Promise<void>;
  working(label): WorkingHandle;     // block_start(working) ... .done()
  formQuestion(formSchema): Promise<void>;
  output(payload): Promise<void>;
  error(message, opts?): Promise<void>;
  end(): Promise<void>;              // message_end
}
interface StreamingBlock { delta(s: string): void; end(payload?): Promise<void>; }
```

Cada método atribui `messageId`/`blockId`/`index` determinísticos por run.

### Mapeamento step → blocos (sem switch central)

O `BlockEmitter` entra no `StepContext`/`ExecutionDependencies`. Cada step declara
seus próprios blocos:

| Step (agente `post`) | Blocos emitidos |
|---|---|
| `retrieve_context` | `searching_context` (nº de referências do Cérebro da Marca) |
| `collect_brief` | `form_question` (+ pausa) |
| `plan_design` | `thinking` (stream) + `planning` (resumo do plano) |
| `generate_post` | `thinking`/`text` (stream) + `output` (post) |
| `validate_output` | `working` |
| qualquer falha | `error` (mensagem amigável pt-BR + retry) |

O kernel (`agent-execution.kernel.ts`) deixa de emitir `step_*`/`output_chunk` para a
superfície de chat; continua persistindo `AgentRunStep` no Prisma. Eventos de ciclo de
vida (`run_*`) permanecem.

### Serviços e controllers

- `AgentSseService.emit` já é genérico — apenas inclui os novos tipos no buffer.
  Para reconexão após o TTL de 5 min em run ainda ativo, `subscribe` pode semear a
  partir dos blocos persistidos (enhancement, não bloqueante).
- `GET /api/agents/runs/:runId` passa a incluir `blocks` (ordenados por messageId/index).
- `@Sse(':runId/stream')` inalterado no transporte.
- `resume` continua o ciclo `form_question` → pausa → resume.

## Frontend

1. **`useAgentRunStream`** — registra os novos eventos e reduz para estado baseado em blocos.
2. **Substituir `applyAgentRunEvent`** por um **redutor de blocos**:
   `Map<messageId, { role, blocks: Map<blockId, BlockState> }>`; `block_delta` concatena
   texto; `block_end` grava `payload`/`status`. Mantém os `run_*` para status do chat.
3. **Substituir `build-agent-messages.ts`** por `build-messages-from-blocks.ts`:
   mapeamento puro `blocks → UIMessage[]` via tabela `blockType → part`. Remove o
   hardcode do `post` e a reconstrução por steps.
4. **`use-agent-run.ts`** — query traz `run + blocks`; render inicial dos blocos
   persistidos; SSE faz merge dos blocos ao vivo (dedupe por `messageId+blockId`).
5. **Renderers** — reaproveita Thinking/Search/Plan/Question/Blister*; adiciona card de
   status `working`. Ações de revisão ligam-se ao bloco `output`; submit de
   `form_question` chama o `resume`.

## Erros

Bloco `error` vinculado à mensagem, com texto amigável pt-BR + ação "tentar novamente".
O caso `plan_design` FAILED passa a mostrar o bloco `thinking` (o que tentou) + o bloco
`error`, em vez de uma mensagem solta.

## Migração e compatibilidade

- Migração aditiva (`AgentRunBlock`); sem mudança em `AgentRun`/`AgentRunStep`.
- Runs antigos sem blocos: fallback mínimo no frontend (input do usuário + output final).
- Eventos legados (`step_*`, `output_chunk`) deixam de ser consumidos pela nova UI.

## Testes / verificação

- **Backend:** unit do `BlockEmitter` (sequência de eventos + persistência); unit do
  mapeamento step → bloco por agente; validação Zod dos novos eventos.
- **Frontend:** unit do redutor (sequência de eventos → `UIMessage[]`).
- **E2E (Playwright):** agente `post` — thinking aparece em stream, `form_question`
  pausa e retoma, `output` renderiza com revisão, caminho de erro mostra bloco `error`.

## Regras do projeto respeitadas

- Zod em toda fronteira (eventos, DTOs). Identificadores em inglês; rótulos pt-BR na UI.
- Zero jargão de IA nos rótulos visíveis.
- Prisma como único cliente de banco; `@RequirePermission` mantido nos endpoints.
- TanStack Query no estado de servidor; sem fetch direto em página.
- Agentes isolados — sem pipeline automático; blocos são declarados dentro de cada agente.
