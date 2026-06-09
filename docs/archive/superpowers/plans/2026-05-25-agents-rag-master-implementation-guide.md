# Agents + RAG — Guia de implementação

> Atualizado em 2026-05-25 após consolidação das branches em `feat/agents-platform-foundation`.
> Uma única worktree. Uma única branch de trabalho.

---

## O que já existe e está pronto

### Schema Prisma (V2)

- `AgentContextProfile`, `AgentContextFile`, `AgentContextReference`
- `AgentRunContextSnapshot`, `AgentRunContextSnapshotItem`
- `AgentRunSuspension`, `AgentRunSuspensionResponse`
- Campos de lineage em `AgentRun`: `rootRunId`, `parentRunId`, `parentStepId`, `depth`
- Campos de checkpoint em `AgentRun`: `currentBlockId`, `currentBlockType`, `waitingReason`, `resumeStatus`
- Campos enriquecidos em `AgentRunStep`: `sequence`, `branchKey`, `inputType`, `outputType`, `statePayload`, `uiOutputPayload`
- Migration `20260525000000_agents_context_runtime_schema`

### DTOs (V2)

- `agent-context.dto.ts` — `UpsertAgentContextDto`, `AgentContextFileDto`, `AgentContextReferenceDto`
- `agent-run-suspension.dto.ts` — `runSuspensionTypeSchema`, `runSuspensionResolvedPayloadSchema`, `createRunSuspensionResponseSchema`
- `agent-run.dto.ts` — snapshot, lineage, execute, list, get
- `agent-version.dto.ts` — contrato graph-aware com `nodes + edges`, `sourcePortKey`, `targetPortKey`, merge strategies, phase 1 block types
- `ui-output.dto.ts` — `UiOutputEnvelopeDto`, `UiOutputBlockDto`
- `agent-chat-orchestration.dto.ts`

### Backend runtime (V2)

- `agent-chat-orchestrator.service.ts` — orquestração conversation-first
- `agent-workflow-runtime.service.ts` — runtime orientado a grafo com `edges`, fan-in/fan-out
- `agent-block-executor.registry.ts` + `agent-block-registration.service.ts`
- `agent-context.service.ts` — resolve e persiste snapshot de contexto
- `agent-run-resume.service.ts` — resposta a suspensões
- Executores phase 1 em `blocks/`:
  - `input`, `decision`, `boolean`, `if_else`
  - `agent_call`, `clarification`, `form`, `validation`
  - `output_formatter`, `finalizer`

### Frontend (base V1 funcional)

- Layout de workspace, chat page, workflow page, executions page, settings page
- `AgentInactiveDialog` bloqueando agentes inativos
- Builder com React Flow (`flow-canvas.tsx`, `flow-block-node.tsx`)
- Chat com optimistic state, thinking bubble, execution inline card
- Hooks: `use-agent-chat.ts`, `use-agent-runs.ts`, `use-agents.ts`

---

## O que falta implementar

### 1. Backend — completar runtime V2

**Retomada de traversal do ponto exato de suspensão**

Hoje `agent-run-resume.service.ts` marca a suspensão como respondida e recoloca a run na fila do zero. Precisa retomar o graph traversal a partir do bloco que estava esperando.

Arquivos: `agent-run-resume.service.ts`, `agent-workflow-runtime.service.ts`

**Persistir campos enriquecidos de step durante traversal**

`sequence`, `branchKey`, `inputType`, `outputType`, `statePayload`, `uiOutputPayload` precisam ser populados corretamente em cada `AgentRunStep` criado durante a execução.

Arquivo: `agent-workflow-runtime.service.ts`

**Payloads UI estruturados no output do orchestrator**

O `agent-chat-orchestrator.service.ts` hoje responde com texto simples. Precisa emitir eventos estruturados (`UiOutputEnvelopeDto`) que o frontend possa renderizar como cards tipados.

Arquivo: `agent-chat-orchestrator.service.ts`

**Endurecer `agent_call` executor**

`agent-call-block.executor.ts` precisa de: userId real injetado, controle de custos, limite de depth funcional e testes dedicados.

Arquivo: `blocks/agent-call-block.executor.ts`

**APIs de arquivos e referências de contexto do agente**

`AgentContextFile` e `AgentContextReference` têm schema mas não têm endpoints de CRUD. Precisam de endpoints em `agents.controller.ts` e lógica em `agent-context.service.ts`.

**Remover caminho legado linear**

`agent-execution.service.ts` ainda tem fallback para flows sem `edges` (`llm_generate`, `question_form`, `html_validation`). Isolar ou remover após migração do frontend.

---

### 2. Frontend — migrar para V2

**Builder: catálogo e handles nomeados**

`block-types.ts` ainda representa o modelo V1. Precisa:
- Novo catálogo com os 10 tipos phase 1
- `flow-block-node.tsx` com handles nomeados e múltiplas portas de entrada/saída
- `flow-canvas.tsx` serializando `edges` com `sourcePortKey` e `targetPortKey`
- Config panels por tipo de bloco em `block-configs/`

**Builder: ação única save → publish → activate**

`use-agents.ts` expõe publish e activate separados. O botão "Publicar" no builder deve fazer as três ações em sequência sem expor os passos internos.

Arquivo: `apps/web/src/core/modules/agents/hooks/use-agents.ts`

**Chat: eventos e suspensões V2**

Novos componentes necessários:
- `agent-orchestration-event.tsx` — eventos visíveis de orquestração
- `agent-clarification-card.tsx` — suspensão de tipo clarification
- `agent-form-card.tsx` — suspensão de tipo form
- `agent-validation-card.tsx` — suspensão de tipo validation
- `subagent-run-card.tsx` — run de subagente inline

Hoje `execution-inline-card.tsx` está acoplado ao caso `question_form`. Precisam ser substituídos pelo contrato genérico de `AgentRunSuspension`.

**Chat: renderização de output UI tipado**

- `ui-output-renderer.tsx` — renderiza `UiOutputEnvelopeDto`
- `output-block-renderers/` — renderizadores por tipo: text, markdown, list, card, image, cta

**Settings: contexto persistente**

`agent-settings-page.tsx` não gerencia contexto persistente. Precisa de:
- Seção de instruções e notas (`AgentContextProfile`)
- Upload e listagem de arquivos (`AgentContextFile`)
- Referências de contexto (`AgentContextReference`)

**Hooks novos**

- `use-agent-context.ts` — CRUD de contexto persistente do agente
- `use-agent-run-resume.ts` — enviar resposta a suspensão ativa

---

### 3. Plataforma RAG (não iniciada)

Todo o domínio `apps/api/src/rag/` precisa ser criado do zero.

**Schema Prisma**

Modelos a criar: `RagDocument`, `RagChunk`, `RagEmbedding`, `RagIndexJob`

**Módulo e serviços**

- `rag.module.ts`
- `rag-document.service.ts` — gerencia documentos indexáveis
- `rag-chunking.service.ts` — divide documentos em chunks
- `rag-embedding.service.ts` — gera embeddings via adapter de IA
- `rag-indexing.service.ts` — orquestra ingestão completa
- `rag-retrieval.service.ts` — busca semântica permission-aware
- `rag-context-assembly.service.ts` — monta context pack para agents/chat
- `rag-policy.service.ts` — filtra resultados por permissão
- `rag.controller.ts` — endpoints de ingestão e busca

**Trigger tasks**

- `rag-index-document.task.ts`
- `rag-reindex-scope.task.ts`

**Tipos compartilhados**

- `packages/types/src/rag/index.ts`

**Conexões**

- Substituir `rag-context.service.ts` atual (que referencia `ContextEmbedding` inexistente) pela plataforma nova
- Conectar assets e brain como fontes de indexação
- Conectar `company-chat.service.ts` ao RAG compartilhado
- Conectar snapshot de contexto do agente ao RAG

---

## Ordem de execução recomendada

1. Backend runtime V2 — retomada de traversal + payloads UI estruturados
2. Frontend V2 — builder com contrato novo + chat com suspensões V2
3. RAG — depende do schema estável e das fontes formalizadas

O RAG pode começar em paralelo depois que o schema estiver fechado.

---

## Definição de pronto

- [ ] Retomada de run a partir do bloco suspenso funciona end-to-end
- [ ] Chat emite e renderiza `UiOutputEnvelopeDto`
- [ ] Suspensões `clarification`, `form` e `validation` aparecem como cards inline
- [ ] Builder persiste `edges` com portas nomeadas
- [ ] Ação única save → publish → activate no builder
- [ ] Settings gerencia contexto persistente, arquivos e referências
- [ ] Plataforma RAG com ingestão, chunking, embeddings e retrieval
- [ ] `company-chat` e agent runtime usam RAG compartilhado
- [ ] Contrato V1 (`llm_generate`, `question_form`, `html_validation`) removido
