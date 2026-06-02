# Shared Conversation + RAG Design

## Objetivo

Substituir completamente o legado conversacional de `agent chat` por uma arquitetura nova baseada em `SSE + eventos persistidos + projeções de replay + tools visíveis em tempo real`, apoiada por uma plataforma RAG compartilhada, reaproveitável e altamente configurável para o produto inteiro.

## Escopo deste ciclo

- Migrar funcionalmente apenas `agent chat`
- Não mexer em `workflow`, `AgentRun` e builder como superfícies de produto
- Remover o legado conversacional antigo de `agent chat`
- Criar uma plataforma compartilhada pronta para adoção posterior por `company chat` e demais experiências conversacionais

## Fora de escopo deste ciclo

- Migrar `company chat`
- Alterar runtime de workflow
- Redesenhar tela de execuções
- Criar UI nova de tools além de `GenericTool` e `ToolGroup`
- Exibir qualquer visualização operacional via URL separada

---

## 1. Decisões confirmadas

### 1.1 Plataforma conversacional

- Haverá um domínio conversacional compartilhado no backend, separado de `AgentRun`
- `agent chat` será o primeiro consumidor
- O contrato SSE deste ciclo atende apenas a superfície conversacional
- O mesmo desenho deve permitir migrar `company chat` depois sem redesenho estrutural

### 1.2 Persistência

- Persistir tudo que o usuário precisa rever depois:
  - mensagem do usuário
  - mensagem do agente
  - eventos de stream
  - tool calls e seus estados
  - pesquisas de contexto/arquivos/web
  - citations
  - falhas e conclusões
- O histórico oficial será composto por:
  - `event log` persistido
  - projeções/snapshots para replay rápido

### 1.3 Frontend

- No frontend, exibir processamento usando apenas `GenericTool` e `ToolGroup`
- O texto do agente continua streamado no chat
- O replay histórico deve mostrar a mesma narrativa operacional vista em tempo real

### 1.4 RAG

- Índice base por `organization`
- Views derivadas por `agent`
- Fontes obrigatórias neste ciclo:
  - `Brain`
  - `Context Sources`
  - `Agent Context Files`
  - `Agent Context References`
  - `Assets`
  - `Web research cache`
- Conversas e outputs de run não entram no índice agora

---

## 2. Estado atual e problemas

## 2.1 Estado atual observado

- `apps/web/src/core/modules/agents/hooks/use-agent-chat.ts` usa polling com `refetchInterval`
- `apps/api/src/agents/agent-chat.service.ts` ainda trabalha em fluxo request/response tradicional
- `apps/api/src/agents/agent-chat-orchestrator.service.ts` já possui runtime conversacional com `rag_search`, `file_search` e `web_research`
- `apps/api/src/agents/tools/web-research.tool.ts` ainda depende de gateway stub por padrão
- `apps/web/src/core/modules/agents/components/chat/chat-tool-sections.ts` ainda precisa fallback legado baseado em `agentRun`
- `apps/web/src/core/modules/agents/components/chat/chat-message-parts.ts` ainda projeta `agentRun.steps` como tools no chat

## 2.2 Problemas centrais

- Não existe stream SSE real para o chat de agentes
- Não existe replay persistido completo da narrativa operacional
- O chat ainda mistura contratos novos e legados
- O frontend depende de fallback acoplado a `AgentRun`
- O RAG atual existe parcialmente, mas ainda não está consolidado como plataforma compartilhada configurável

---

## 3. Arquitetura alvo

## 3.1 Novo domínio conversacional compartilhado

Criar um domínio compartilhado responsável por:

- iniciar interações conversacionais
- abrir e conduzir stream SSE
- persistir eventos conversacionais ordenados
- manter projeções materializadas da thread e da mensagem
- servir replay persistido
- coordenar tool runtime conversacional
- coordenar texto streamado do LLM

Esse domínio não substitui `AgentRun`. Ele resolve apenas a camada conversacional.

## 3.2 Entidades novas

### `ConversationEvent`

Evento canônico persistido.

Campos esperados:

- `id`
- `organizationId`
- `threadId`
- `messageId`
- `sequence`
- `eventType`
- `status`
- `payload`
- `createdAt`

### `ConversationMessageProjection`

Projeção materializada da mensagem conversacional.

Campos esperados:

- texto agregado atual
- status da mensagem
- citations consolidadas
- flags de streaming/completion/failure
- metadados resumidos necessários para render

### `ConversationToolCallProjection`

Projeção materializada de cada tool call.

Campos esperados:

- `toolCallId`
- `groupId`
- `toolName`
- `status`
- `inputPayload`
- `outputPayload`
- `errorMessage`
- `durationMs`
- `displayOrder`

## 3.3 Tipos de evento

Contrato base do event log:

- `message_created`
- `message_stream_started`
- `message_text_delta`
- `message_text_snapshot`
- `message_completed`
- `message_failed`
- `tool_group_started`
- `tool_started`
- `tool_progress`
- `tool_completed`
- `tool_failed`
- `citations_emitted`
- `context_search_started`
- `context_search_completed`
- `file_search_started`
- `file_search_completed`
- `web_research_started`
- `web_research_completed`

Regra:

- `delta` existe para tempo real
- `snapshot` existe para replay e recuperação eficiente
- o frontend renderiza tools a partir de eventos semânticos, não de tokens

## 3.4 Projeções obrigatórias

- lista de threads
- lista de mensagens da thread
- estado materializado da mensagem do agente
- grupos de tools por mensagem
- estado materializado de cada tool call
- replay da thread com ordenação determinística

---

## 4. Fluxo SSE conversacional

## 4.1 Fluxo de envio

1. O frontend envia a mensagem do usuário
2. O backend persiste a mensagem do usuário
3. O backend cria a mensagem-resposta do agente em estado inicial
4. O backend inicia o pipeline de orquestração
5. O backend emite SSE em tempo real
6. Cada evento relevante é persistido
7. As projeções são atualizadas incrementalmente
8. O frontend aplica os eventos ao estado local
9. Ao reabrir a thread, o frontend usa replay persistido

## 4.2 Superfície de API

Recomendação confirmada:

- usar um `POST` que inicia e streama a própria resposta como `text/event-stream`

Isso reduz sincronização entre duas chamadas separadas e simplifica o acoplamento do composer com a resposta.

## 4.3 Regras do SSE

Cada evento SSE deve incluir:

- `event`
- `id`
- `data`
- `threadId`
- `messageId`
- `sequence`

O cliente deve tolerar:

- reconexão
- duplicidade eventual
- retomada a partir do último `sequence`
- stream interrompido com replay posterior

---

## 5. Tool runtime conversacional

## 5.1 Escopo deste ciclo

O runtime conversacional cobre apenas:

- `rag_search`
- `file_search`
- `web_research`

Ele continua separado de `AgentRun` e do workflow runtime.

## 5.2 Contrato operacional

Cada tool call deve produzir:

- evento de início
- progresso opcional
- evento de conclusão ou erro
- persistência completa de input/output/erro/duração
- projeção pronta para replay

## 5.3 Exibição no frontend

Padrão visual:

- um `ToolGroup` para representar a fase operacional da resposta
- vários `GenericTool` para cada step semântico dentro do grupo

Exemplo de narrativa:

- `ToolGroup`: "Pesquisando contexto"
- `GenericTool`: "Consultou contexto da empresa"
- `GenericTool`: "Pesquisou arquivos relevantes"
- `GenericTool`: "Pesquisou fontes externas"

Nada de cards específicos novos neste ciclo.

## 5.4 Permissões

O runtime deve continuar permission-aware.

Antes de executar retrieval, aplicar filtros por permissões relevantes como:

- `context.read`
- `brain.read`
- `asset.read`

---

## 6. Plataforma RAG compartilhada

## 6.1 Objetivo

Consolidar o domínio de retrieval em uma plataforma única, configurável e reaproveitável para o produto inteiro.

## 6.2 Camadas da plataforma

- `RagSourceRegistry`
  - registra tipos de fonte indexável
- `RagIngestionService`
  - transforma fontes em documentos canônicos
- `RagChunkingService`
  - segmenta documentos
- `RagEmbeddingService`
  - gera embeddings
- `RagIndexingService`
  - coordena ingestão e reindexação
- `RagRetrievalService`
  - executa busca semântica
- `RagPolicyService`
  - aplica filtros de escopo e permissão
- `RagContextAssemblyService`
  - monta o contexto final de prompt para consumidores
- `WebResearchCacheService`
  - persiste e normaliza pesquisa externa

## 6.3 Escopo e particionamento

- partição primária por `organization`
- escopo derivado por `agent` por meio de filtros, referências e configuração de retrieval
- evitar duplicação desnecessária de ingestão por agente

## 6.4 Configurabilidade mínima obrigatória

- fontes habilitadas por consumer
- `chunkSize`
- `chunkOverlap`
- `topK`
- `minScore`
- pesos por tipo de fonte
- inclusão/exclusão de escopos
- estratégia por consumer (`agent_chat`, futuras conversas, etc.)

## 6.5 Fontes obrigatórias

Neste ciclo, a plataforma precisa ingestir:

- `Brain`
- `ContextSource`
- `AgentContextFile`
- `AgentContextReference`
- `Asset`
- resultados do `WebResearchCache`

## 6.6 Web research

Pesquisa web deve nascer com:

- gateway adapter pluggable
- um provider real inicial
- normalização de resultado externo
- persistência do resultado bruto útil
- indexação do resultado no cache interno
- possibilidade de reutilizar resultado sem nova chamada externa

---

## 7. Estratégia de remoção de legado

## 7.1 Remover neste ciclo

Apenas na superfície de `agent chat`:

- polling como mecanismo principal do chat
- fallback visual baseado em `agentRun.steps`
- caminhos de renderização concorrentes para tools do chat
- contratos síncronos legados que não façam mais parte do caminho oficial
- adapters temporários que existam só para sustentar o caminho antigo

## 7.2 Preservar por enquanto

- `workflow`
- `AgentRun`
- builder
- páginas de execução
- suspensões

Regra: o novo `agent chat` não deve depender disso para funcionar.

---

## 8. Frontend alvo

## 8.1 Estado

O frontend precisa separar:

- `persistedThreadState`
- `liveStreamingState`
- `mergedDisplayState`

## 8.2 Comportamento

- leitura inicial vem do replay persistido
- stream SSE atualiza a thread em tempo real
- ao reconectar, retomar do último `sequence` conhecido
- `AgentInactiveDialog` continua obrigatório
- sugestões, anexos e comportamento geral do `InputBar` permanecem dentro do padrão atual

## 8.3 Renderização da mensagem do agente

- texto streamado
- `ToolGroup` com `GenericTool`s
- citations quando existirem
- replay histórico com a mesma ordem lógica do streaming ao vivo

---

## 9. Erros e resiliência

## 9.1 Chat

- falha do LLM gera `message_failed`
- falha de tool gera `tool_failed`
- interrupção do stream não perde o que já foi persistido
- replay deve reidratar a mensagem mesmo após erro parcial

## 9.2 RAG

- falhas de embedding e indexação devem ser idempotentes e observáveis
- falha do provider web não pode derrubar outras fontes
- fontes quebradas devem ficar com status operacional claro

---

## 10. Testes obrigatórios

## 10.1 Backend conversacional

- persistência de eventos
- ordenação por sequência
- idempotência de append
- atualização de projeções
- replay de thread
- stream SSE de sucesso
- stream SSE com erro
- ciclo completo de tools

## 10.2 Backend RAG

- ingestão por tipo de fonte
- chunking
- embedding adapter
- retrieval com filtros de permissão
- assembly por consumer
- cache e reuso de web research

## 10.3 Frontend

- renderização de replay persistido
- renderização ao vivo via SSE
- fusão entre histórico e stream
- uso exclusivo de `GenericTool` e `ToolGroup`
- remoção do fallback legado de `agentRun`

---

## 11. Definição de pronto

- `agent chat` usa SSE real
- todos os eventos conversacionais relevantes ficam persistidos
- replay da thread mostra texto, tools, citations e estados
- frontend usa apenas `GenericTool` e `ToolGroup` para a narrativa operacional
- polling deixa de ser o mecanismo primário do chat
- fallback visual legado baseado em `agentRun` sai do chat novo
- plataforma RAG compartilhada indexa as seis fontes obrigatórias
- retrieval é permission-aware e configurável
- `web_research` usa provider real via gateway adapter
- a arquitetura fica pronta para migrar `company chat` depois sem redesenho
