---
name: shared-conversation-rag-execution
description: Decisões de execução da spec/plan de Shared Conversation + RAG (agent chat SSE) confirmadas pelo usuário
metadata:
  type: project
---

Execução da spec `docs/superpowers/specs/2026-05-30-shared-conversation-rag-design.md` + plan `docs/superpowers/plans/2026-05-30-shared-conversation-rag-implementation.md`. Iniciada em 2026-05-30. Usuário pediu para NÃO usar superpowers — usar as skills do projeto em `docs/skills/` (project-engineering, backend, frontend, agents).

Decisões confirmadas pelo usuário:
- **Cadência:** task a task, com checkpoint. Parar ao fim de cada task com testes verdes antes de seguir.
- **Streaming LLM:** implementar streaming real de tokens na camada de adapter do `AIRuntimeService` (`apps/api/src/ai-runtime/`) — emitir `message_text_delta` reais. Hoje só existe `generateText` (resposta completa) e `createEmbedding`, sem stream.
- **Web research:** NÃO adicionar provider externo (Tavily/Brave). Usar a capacidade nativa de web search/grounding dos providers de LLM que já estão configurados no AIRuntime. Hoje `web_research` é `StubWebResearchGateway` que retorna `[]`.
- **Testes frontend:** configurar Vitest + Testing Library no `apps/web` (hoje `pnpm test` é no-op, sem infra). Backend já tem Jest.
- **Qualidade dos testes:** o usuário exige testes que previnam bugs de verdade (não testes que sempre passam), cobrindo geração de mensagem, erros, replay, tools — back e front.

Estado real diverge do plan:
- Módulo `apps/api/src/rag/` JÁ existe quase inteiro (embedding real via pgvector, chunking, indexing, policy, retrieval, context-assembly, document, controller). Falta: RagSourceRegistry, ingestão automática das 6 fontes, knobs de config expostos, web-research-cache, provider web real.
- Módulo `apps/api/src/conversation/` NÃO existe (criar do zero + 3 modelos Prisma).
- Permissões já existem no `packages/authz` (`context.*`, `agent.*`, `brain.read`, `asset.read`) — catálogo do CLAUDE.md está desatualizado. Não criar permissões novas.
- `AgentChatToolCall` já existe como tabela de auditoria de tool calls.

Workflow de migrations (NÃO-ÓBVIO — descoberto em 2026-05-30):
- O banco local (`company_os` em localhost:5433) foi construído inteiramente com `prisma db push`. A tabela `_prisma_migrations` NÃO existe; as 6 migrations em `prisma/migrations/` nunca foram "aplicadas" no sentido do Prisma.
- `prisma migrate dev` NÃO FUNCIONA neste repo: o shadow DB replica o histórico do zero e quebra porque `Organization`/`User`/`Session`/`Account`/`Verification` são criadas pelo better-auth (`@better-auth/prisma-adapter`), fora do histórico de migrations. O primeiro migration (`add_assets`) já referencia `Organization`.
- Para aplicar mudança de schema localmente: usar `prisma db push` (não-destrutivo p/ adições).
- Para entregar migration files em ordem: gerar SQL com `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` e salvar em `prisma/migrations/<timestamp>_<nome>/migration.sql`.
- Migration da Task 1 criada: `20260530000000_conversation_event_log` (3 tabelas Conversation*).

Status (2026-05-30): BACKEND + FRONTEND COMPLETOS. API: 376 testes, 0 typecheck, `nest build` + start OK. WEB: 34 testes (Vitest), 0 typecheck, `next build` + `next start` OK.

Frontend (SSE): hook `use-agent-chat-stream.ts` (fetch POST stream + `useThreadReplay`), libs puras `agent-chat-events.ts`/`agent-chat-event-reducer.ts`/`agent-chat-display-state.ts`, render `chat-stream-message.tsx` + `chat-replay-adapter.ts` (tools via `tool-Task`/`tool-Search` → ToolGroup/GenericTool). Removido cluster legado: chat-message-bubble, chat-tool-sections, chat-message-parts, chat-tool-part-adapter, chat-optimistic, execution-inline-card, ui-output-renderer, agent-suspension-card. `use-agent-chat.ts` enxuto (sem polling/sync/regenerate). Vitest+Testing Library configurados (`apps/web/vitest.config.ts`).
Regenerate = re-stream da última msg do usuário; Edit = branch (backend não cria mais a msg) + stream no branch.
CUIDADO: `createUserMessageAndProcess`/`listMessages`/`orchestrateMessage` são COMPARTILHADOS com company chat (CompanyChatService/Controller) — NÃO remover (não são legado morto). Só o legado exclusivo do agent-chat foi removido (rotas GET messages/POST messages/POST regenerate, `regenerateMessage`).

Status anterior: BACKEND COMPLETO (Tasks 1-7). 387 testes passando, typecheck 0 erros, DI do AppModule resolve, banco em sync. Falta: frontend (Tasks 8-9) e remoção de legado (Task 10, só depois do frontend migrar — não remover o endpoint sync antigo antes disso senão quebra o front atual).

Arquitetura entregue no backend:
- `apps/api/src/conversation/` (módulo compartilhado, consumer-agnostic): event log + projeções + SSE service. NÃO depende de AgentRun.
- Orquestrador: `streamTurn()` (async generator de eventos) ao lado do `orchestrateMessage()` legado.
- AIRuntime: `streamText()` com streaming real no OpenRouter + fallback universal.
- AgentChatService: `streamAssistantReply()` (SSE) + `getThreadReplay()`. Endpoints: `POST .../chat/threads/:threadId/messages/stream` (text/event-stream) e `GET .../chat/threads/:threadId/replay`.
- RAG: `RagSourceRegistry` (6 fontes + permissão + peso), ranking ponderado, retrieval/policy/assembly usam o registry. `WebResearchCacheService` + `AiRuntimeWebResearchGateway` (web research via provider já configurado, sem Tavily/Brave).
- IMPORTANTE web research: OpenAI/Anthropic adapters NÃO fazem text gen (só listModels) — só Gemini/OpenRouter/assemblyai-gateway funcionam. O gateway de web research usa structured output do modelo configurado; eficácia real de browsing depende do modelo ter grounding nativo. Risco de URL alucinada mitigado (valida URL http(s), instrui o modelo a não inventar).

Veja [[agents-domain-lifecycle]] se existir.
