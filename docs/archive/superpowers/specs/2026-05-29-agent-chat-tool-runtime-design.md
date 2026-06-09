# Agent Chat Tool Runtime Design

## Objective

Definir a arquitetura da fase 1 de tool calling conversacional para agentes do Workana AI, mantendo o chat como interface principal e sem obrigar cada uso de tool a virar `AgentRun`.

Esta fase introduz um runtime compartilhado de tools para o chat do agente, com foco em leitura e pesquisa:

- `rag_search`
- `file_search`
- `web_research`

## Scope

### In scope

- Tool loop conversacional no chat do agente
- Runtime backend dedicado para tools de chat
- Allowlist de tools por agente
- Persistencia de tool calls no contexto da conversa
- Auditoria operacional de tool usage
- Renderizacao inline das tool calls no bubble do assistente
- Policy centralizada para uso de tools
- Preparacao estrutural para approvals futuros

### Out of scope

- Converter tool calls conversacionais em `AgentRun`
- Adicionar blocos novos no workflow builder nesta fase
- Navegacao web arbitraria estilo browser agent
- Escrita autonoma sem aprovacao
- Pesquisa irrestrita em todo o workspace da empresa
- Streaming progressivo de tool output antes do fim do turno

## Product Constraints

Esta spec segue as regras atuais do produto e do monorepo:

- chat-first por padrao
- zero formularios desnecessarios
- a IA deve trabalhar em background e expor apenas o necessario
- toda leitura sensivel continua sujeita a permissao
- toda acao sensivel futura deve passar por approval humano
- o usuario nao deve precisar entender `workflow`, `run`, `tool schema` ou `RAG`

## Current State

Hoje o produto ja possui:

- `AgentChatService` e `AgentChatOrchestratorService` para turnos conversacionais
- `AgentRun`, `AgentRunStep` e runtime de workflow para execucoes publicadas
- `RagRetrievalService` e `RagContextAssemblyService` para recuperacao vetorial
- `AgentContextService` para contexto persistente do agente
- UI de chat com `toolParts` e renderers em `agent-elements`

Problema atual:

- o chat ainda nao possui um runtime real de tools
- o RAG existe, mas aparece mais como contexto interno do orquestrador do que como capability explicita do agente
- a UI suporta tool cards mais ricos do que o backend efetivamente produz para o chat do agente

## Target Outcome

Ao final da fase 1, um agente ativo podera:

1. receber uma mensagem no chat
2. decidir se precisa pesquisar antes de responder
3. chamar uma ou mais tools permitidas ao agente
4. incorporar os resultados dessas tools no proprio turno
5. responder ao usuario no mesmo bubble
6. mostrar inline quais fontes consultou

Sem subir `AgentRun`, sem redirecionar o usuario para outra tela e sem exigir modelagem previa no workflow.

## Architecture

### Overview

Sera criada uma nova camada backend chamada `AgentToolRuntime`.

Ela ficara entre:

- `AgentChatOrchestratorService`
- executores concretos de tools

Fluxo conceitual:

1. `AgentChatService` persiste a mensagem do usuario
2. `AgentChatOrchestratorService` classifica o turno
3. se o turno exigir pesquisa, o orquestrador entra em um tool loop
4. o tool loop chama `AgentToolRuntime`
5. `AgentToolRuntime` valida policy, executa tool e normaliza a resposta
6. o orquestrador decide se precisa de outra tool ou se ja responde ao usuario
7. a mensagem assistente final e persistida com `toolParts` estruturados no metadata

### Why not AgentRun

Tool calls conversacionais nao devem virar `AgentRun` nesta fase porque:

- o usuario escolheu surface `chat only`
- o objetivo e manter o turno leve e natural
- `AgentRun` continua reservado para execucao operacional explicita baseada em workflow
- misturar os dois modos agora aumentaria acoplamento e confusao sem ganho direto

### New Backend Layer

`AgentToolRuntime` concentra quatro responsabilidades:

1. `policy`
2. `execution`
3. `approval-state`
4. `serialization`

Isso evita duplicar logica no orquestrador e cria uma base futura reutilizavel pelo workflow.

## Conversational Tool Loop

### Behavior

O orquestrador passa a operar em loop estruturado durante o turno:

1. recebe contexto atual do turno
2. pede ao modelo uma decisao estruturada
3. se a decisao for `respond`, encerra
4. se a decisao for `tool_call`, delega ao `AgentToolRuntime`
5. recebe resultado normalizado da tool
6. injeta resultado no contexto do turno
7. repete ate resposta final ou erro terminal

### Loop Boundaries

Para evitar runaway behavior, a fase 1 deve impor limites simples:

- maximo de tools por turno
- timeout total do loop
- limite de resultados por tool
- truncation explicita quando o resultado for grande demais

### Failure Model

Falha de tool nao deve necessariamente falhar o turno.

O orquestrador deve poder:

- continuar com contexto parcial
- responder com fallback contextual
- explicitar ao usuario que uma fonte falhou, quando isso afetar a confiabilidade da resposta

## Tool Catalog

### Agent-level allowlist

Cada agente tera sua propria allowlist de tools.

Exemplo conceitual:

```ts
allowedTools: ["rag_search", "file_search", "web_research"]
```

Essa configuracao pertence ao agente, nao a versao.

### Tool 1: rag_search

Objetivo:

- consultar apenas o material indexado no RAG da empresa, respeitando permissoes

Input minimo:

- `query`
- `limit`

Output normalizado:

- `summary`
- `results[]`
- `citations[]`

Cada resultado deve poder conter:

- `sourceType`
- `sourceId`
- `title`
- `snippet`
- `score`

Implementacao:

- reaproveita `RagRetrievalService`
- usa `RagContextAssemblyService` quando for util montar bloco para prompt

### Tool 2: file_search

Objetivo:

- pesquisar em arquivos do contexto do agente e em documentos indexados relevantes

Escopo aprovado para fase 1:

- `agentContextFile`
- documentos do RAG relacionados ao org

Nao faz parte da fase 1:

- grep bruto em qualquer arquivo do workspace
- leitura irrestrita do filesystem da empresa

Input minimo:

- `query`
- `limit`
- `scope`, com default seguro equivalente a `agent_context_plus_rag`

Output normalizado:

- `summary`
- `results[]`
- `citations[]`

Cada resultado deve poder conter:

- `origin`
- `fileId` ou `documentId`
- `filename` ou `title`
- `snippet`
- `score`

### Tool 3: web_research

Objetivo:

- pesquisar fontes externas e devolver evidencias compactas para o turno

Fase 1 nao deve ser browser automation. O modelo e:

- search
- selecao de fontes
- fetch resumido
- retorno estruturado

Input minimo:

- `query`
- `limit`
- opcional `freshness`

Output normalizado:

- `summary`
- `results[]`
- `citations[]`

Cada resultado deve poder conter:

- `title`
- `url`
- `snippet`
- `source`
- `retrievedAt`

## Unified Tool Result Contract

Todas as tools do runtime devem convergir para o mesmo envelope logico:

```ts
type AgentToolResult = {
  toolName: string;
  summary: string;
  results: Array<Record<string, unknown>>;
  citations: Array<{
    label: string;
    url?: string;
    sourceType?: string;
    sourceId?: string;
  }>;
  metadata: {
    durationMs: number;
    resultCount: number;
    truncated?: boolean;
  };
};
```

O orquestrador nao deve conhecer detalhes internos de cada executor alem desse contrato normalizado.

## Policy Model

Cada tool call passa por tres validacoes obrigatorias.

### 1. Agent allowlist

Se a tool nao estiver habilitada no agente, a chamada e negada.

### 2. Source permission

O runtime deve respeitar as permissoes existentes do usuario para cada fonte consultada.

Exemplos:

- `context.read`
- `asset.read`
- `agent.read`
- `agent.run.read`
- `brain.read`

O agente nunca ganha acesso extra por existir.

### 3. Conversational-mode safety

Nesta fase, apenas tools de leitura entram no chat conversacional:

- `rag_search`
- `file_search`
- `web_research`

Qualquer tool sensivel futura deve poder ser barrada ou entrar em approval.

## Persistence Model

### Message metadata as UI projection

A mensagem assistente final do turno passa a persistir no `metadata`:

- `orchestration`
- `toolParts`
- `citations`
- `contextHints`

`toolParts` e a projecao otimizada para UI.

### Operational audit entity

Sera criada uma nova entidade dedicada para auditoria operacional.

Nome proposto:

- `AgentChatToolCall`

Campos minimos esperados:

- `id`
- `organizationId`
- `agentId`
- `threadId`
- `messageId`
- `toolName`
- `status`
- `inputPayload`
- `outputPayload`
- `errorMessage`
- `durationMs`
- `createdByUserId`
- `createdAt`

### Source of truth split

- `AgentChatToolCall` = verdade operacional
- `message.metadata.toolParts` = verdade de renderizacao do turno

Isso evita depender de um JSON gigante dentro da mensagem para analytics, debugging e auditoria.

## Approval Readiness

Embora a fase 1 seja predominantemente de leitura, o runtime deve nascer pronto para tools sensiveis.

Estados minimos esperados para tool calls:

- `completed`
- `error`
- `awaiting_approval`
- `rejected`

Nesta fase, `rag_search`, `file_search` e `web_research` devem operar normalmente como `completed`, exceto falhas.

## Frontend UX

### Principle

O usuario conversa normalmente. Tool usage aparece como evidencia operacional, nao como interface principal.

### Expected turn experience

1. usuario envia mensagem
2. bubble do assistente entra em estado de processamento
3. tools sao executadas no backend
4. resposta final chega no mesmo bubble
5. tool rows aparecem inline associadas a essa resposta
6. quando relevante, citacoes/fontes ficam visiveis

### Frontend implementation rule

O frontend do chat de agentes deve usar `agent-elements` como base obrigatoria para os componentes de IA.

Prioridade de reutilizacao:

1. `ToolRenderer`
2. `ToolGroup`
3. `GenericTool`
4. `SearchTool`
5. `QuestionTool`
6. componentes de loading como `SpiralLoader` e `TextShimmer`

Regras:

- nao criar uma linguagem paralela de tool cards se `agent-elements` ja cobre o caso
- usar wrappers finos apenas quando o contrato do produto exigir adaptacao de dados
- manter o bubble do assistente integrado ao pipeline de `toolParts` ja esperado por `agent-elements`
- tratar `GenericTool` como fallback oficial para tools novas ou estados ainda nao especializados
- tratar `ToolGroup` como composicao padrao quando houver mais de uma tool call no mesmo turno ou quando a resposta precisar colapsar detalhes secundarios

### Ordering inside assistant bubble

1. resposta final
2. tool rows
3. footer com timestamp e acoes

### Rendering guidelines per tool

#### `rag_search`

Label recomendada:

- `Consultou contexto da empresa`

Expansao mostra:

- fontes consultadas
- snippets curtos
- score nao precisa ser exibido ao usuario final

Implementacao de frontend recomendada:

- usar `SearchTool` quando o payload ja puder ser mapeado como lista de resultados
- usar `GenericTool` apenas como fallback temporario

#### `file_search`

Label recomendada:

- `Pesquisou arquivos do contexto`

Expansao mostra:

- nome do arquivo ou documento
- trechos encontrados
- origem do resultado

Implementacao de frontend recomendada:

- usar `SearchTool` como renderer principal
- agrupar resultados por arquivo quando isso melhorar leitura, mas sem criar uma UI paralela fora do ecossistema `agent-elements`

#### `web_research`

Label recomendada:

- `Pesquisou fontes externas`

Expansao mostra:

- dominio
- titulo
- snippet
- link

Implementacao de frontend recomendada:

- usar `SearchTool` para o corpo principal do resultado
- preservar links externos clicaveis no renderer
- quando houver multiplas tool calls no mesmo turno, encapsular via `ToolGroup`

### Show vs hide

Mostrar por padrao:

- quais fontes foram usadas
- quais tipos de busca ocorreram
- links e snippets uteis
- falhas quando afetarem a resposta

Nao mostrar por padrao:

- payload bruto
- scores vetoriais
- JSON tecnico
- detalhes internos de policy
- traces de retry

### Loading behavior

Na fase 1, tool rows devem ser renderizadas ao final do turno, nao em streaming progressivo.

Motivos:

- menor complexidade de estado
- menos risco de quebrar o chat atual
- entrega mais rapida

Enquanto a resposta final nao chega, a camada visual de IA deve continuar seguindo `agent-elements`, usando especialmente:

- `SpiralLoader`
- `TextShimmer`
- `ToolGroup` quando houver agrupamento de estados intermediarios

### Failure UX

Se uma tool falhar, a UX alvo e:

- tool row mostra falha
- assistente ainda responde quando possivel
- resposta final contextualiza que parte da consulta nao foi concluida

Quando uma tool nao tiver renderer especializado ou o payload vier incompleto, o frontend deve cair para `GenericTool` em vez de inventar um card novo ad hoc.

## Data Model Changes

### Backend

Adicionar ao agente um campo persistente para allowlist de tools.

Representacao sugerida:

- lista simples de strings validadas por schema/enum interno

### Suggested chat tool call table

Adicionar tabela/modelo para `AgentChatToolCall`.

### Message metadata

Expandir o uso de metadata das mensagens assistentes para incluir `toolParts` e `citations` em formato estavel.

## API Changes

### Existing endpoints reused

- os endpoints de chat do agente permanecem os mesmos
- nao sera criado endpoint novo para o usuario chamar tool diretamente nesta fase

### New internal contracts

Sera necessario introduzir contratos internos para:

- decisao estruturada do loop conversacional
- input/output das tools
- serializacao de `toolParts`

## Interaction with Existing Runtime

### Chat runtime

- continua leve e conversacional
- usa `AgentToolRuntime`

### Workflow runtime

- continua separado nesta fase
- nao ganha blocos novos ainda

### Future convergence

O `AgentToolRuntime` deve ser desenhado para ser reutilizado pelo workflow numa fase posterior.

Isso permite que blocos futuros como `file_search`, `web_research` e `tool_call` usem os mesmos executores, policy e serializacao.

## Rollout Plan

### Phase 1

- chat only
- tool loop conversacional
- allowlist por agente
- `rag_search`
- `file_search`
- `web_research`
- persistencia em `message.metadata` + `AgentChatToolCall`
- sem `AgentRun`
- sem blocos novos no builder

### Phase 2

- tools sensiveis com approval inline
- retomada conversacional apos aprovacao/rejeicao

### Phase 3

- exposicao das mesmas tools como blocos explicitos do workflow
- reaproveitando o mesmo runtime compartilhado

## Risks

### Dual-runtime drift

Risco:

- chat runtime e workflow runtime evoluirem separados demais

Mitigacao:

- centralizar policy, executores e serializacao no `AgentToolRuntime`

### Message metadata bloat

Risco:

- metadata da mensagem crescer demais

Mitigacao:

- guardar no metadata apenas a projecao de UI
- manter payload detalhado no log operacional

### Permission leakage

Risco:

- agente acessar fontes alem do permitido ao usuario

Mitigacao:

- todas as tools passam por policy centralizada e reaproveitam os filtros existentes

### Poor tool selection loops

Risco:

- modelo chamar tools demais ou repetidamente

Mitigacao:

- max tools per turn
- timeout total
- deduplicacao simples de chamadas iguais no mesmo turno

## Testing Requirements

### Backend

- testes do `AgentToolRuntime`
- testes de policy por tool
- testes do loop conversacional do orquestrador
- testes de persistencia de `toolParts`
- testes de auditoria `AgentChatToolCall`
- testes de degradacao quando tool falha

### Frontend

- renderizacao de tool rows por tipo
- citacoes/fontes no bubble
- estado de erro de tool
- compatibilidade com mensagens sem tool parts

### Integration

- mensagem -> tool loop -> resposta final
- allowlist bloqueando tool nao autorizada
- `file_search` combinando contexto do agente com documentos indexados
- `web_research` retornando evidencias estruturadas

## Success Criteria

Esta fase estara pronta quando:

1. um agente com tools habilitadas conseguir pesquisar e responder no chat sem criar `AgentRun`
2. o usuario enxergar inline quais pesquisas foram feitas
3. as fontes respeitarem permissoes existentes
4. as tool calls ficarem auditaveis fora do metadata bruto da mensagem
5. a arquitetura ficar reutilizavel por blocos de workflow em fase futura

## Final Recommendation

Implementar um `AgentToolRuntime` compartilhado, mas usado inicialmente apenas pelo chat do agente, com tres tools de leitura e allowlist por agente.

Esse desenho entrega valor rapido sem quebrar o modelo atual de `AgentRun`, mantem a UX conversa-first e prepara a base correta para evoluir depois para approvals sensiveis e tools explicitas no workflow.
