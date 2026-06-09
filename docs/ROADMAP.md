# Roadmap de Desenvolvimento — Blister

> **Versão:** 1.1 · **Data base:** 2026-06-08 · **Atualização arquitetura:** 2026-06-09  
> **Base:** `docs/prd/blister-master-prd.md`, `CLAUDE.md`, `docs/project/current-state.md`

---

## Atualização 2026-06-09 (ler antes dos sprints abaixo)

Decisão aprovada: [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](decisions/2026-06-09-agents-isolated-architecture.md)

| Tópico | Antes (roadmap v1) | Agora |
|--------|-------------------|-------|
| Execução | Pipeline strategist→copywriter→designer | **Agentes isolados** — `POST /api/agents/:agentId/run` |
| Output | `ContentPiece` / peças | **`AgentRun.outputPayload`** por agente |
| Revisão | Módulo `/api/pecas` | **Por agente** — approve/reject/edit na run |
| Campanha | Dispara pipeline | **Workspace** — usuário escolhe qual agente rodar |
| Sprint 4 | `PipelineOrchestrator` | **Workflow engine** + `AgentRunService` (sem orchestrator) |
| Admin pipeline | Ordem de execução | **Catálogo** de agentes (habilitado + ordem UI) |
| Workers | setInterval / Bull | **Trigger.dev** (RAG + agent runs) |

Sprints 1–2 **parcialmente concluídos** — ver [`docs/project/current-state.md`](project/current-state.md). Detalhe Sprints 3–4: plano em `.cursor/plans/sprint_3-4_rag_engine_*.plan.md`.

---

## Estado Atual (Linha de Partida)

### Implementado e funcionando

| Área | O que existe |
|------|-------------|
| **Auth** | better-auth: login, signup, verify-email, forgot/reset, Google OAuth |
| **RBAC** | CASL via `packages/authz` — roles `owner/admin/member`, permissões Blister IA |
| **Schema Prisma** | Todos os modelos do domínio IA já migrados (`20260608120000_blister_ia_domain`) |
| **Seed** | Roles, platform settings, AI catalog (OpenRouter), admin user, demo business (MEI) |
| **Backend** | 7 módulos: `auth`, `users`, `platform`, `audit`, `email`, `prisma`, `app` |
| **Frontend** | Auth pages, dashboard shell (sidebar, header), account settings, workspace settings |
| **Email** | Resend adapter já implementado em `apps/api/src/email/` |
| **packages/authz** | Permissões Blister IA declaradas (brand.*, campaign.*, piece.*, credit.*, generation.*) |

### O que NÃO existe (domínio produto) — ver também [`current-state.md`](project/current-state.md)

**Pendente:** `rag/`, `ai-runtime/`, `agents/runtime/`, campanhas CRUD, UI por agente, revisão na run, learning loop.

**Já existe (2026-06-09):** `company/`, `brand/`, `storage/`, `credits/`, `ai-catalog/`, onboarding, platform admin, credit badge.

**Descartado:** pipeline automático, hub central peça/post, `PipelineOrchestrator`.

---

## Fase 0 — Fundação (✅ Concluída)

Auth, RBAC, schema completo, seed, dashboard shell, pacotes de authz.  
**Débitos técnicos menores a resolver no Sprint 1 abaixo.**

---

## Fase 1 — MVP

> Meta: usuário completa onboarding → gera post em < 2 min → aprova → sistema aprende.

---

### Sprint 1 — Correções de Fundação + Storage + Empresa + Cérebro da Marca

**Prioridade:** Mais alta. Tudo o que vem depois depende de ter empresa e marca.

#### Correções rápidas de fundação

- [ ] Adicionar `@Public()` em `GET /api/health` (hoje exige auth)
- [ ] Verificar que `UserType.BUSINESS` está em uso nos controllers (não legado)
- [ ] Validar que Resend está configurado no bootstrap e enviando links reais

#### Backend — módulo `storage/`

- [ ] Criar `apps/api/src/storage/storage.module.ts`
- [ ] `StorageService` — gera presigned URL S3 para upload (PUT) e download (GET)
- [ ] `POST /api/storage/presigned-upload` — recebe `{ key, mimeType, sizeBytes }`, retorna `{ url, fields }`  
  Permissão: qualquer usuário autenticado com empresa
- [ ] `GET /api/storage/presigned-download?key=` — retorna URL temporária  
  Permissão: `companyId` do recurso deve pertencer ao usuário
- [ ] Configurar via env: `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
- [ ] `.env.example` atualizado com vars de storage

#### Backend — módulo `empresa/`

- [ ] Criar `apps/api/src/empresa/empresa.module.ts`
- [ ] `EmpresaService` — CRUD de `Company`
- [ ] `GET /api/empresa` — retorna empresa do usuário atual  
  Permissão: `company.read`
- [ ] `PATCH /api/empresa` — atualiza nome  
  Permissão: `company.update` · AuditLog
- [ ] **Hook pós-signup**: ao criar conta BUSINESS, disparar bootstrap:
  - Criar `Company` + `CreditBalance` com `freeTierAmount` de `PlatformCreditSettings`
  - Criar entrada em `CreditLedger` (type=CREDIT, description="Free tier inicial")
  - Setar `userType = BUSINESS`
  - Disparar job RAG para indexar marca base (quando BrandProfile existir)
- [ ] `GET /api/empresa/onboarding-status` — retorna `{ completed: boolean }`

#### Backend — módulo `marca/` (dentro de `empresa/`)

- [ ] `MarcaService` — CRUD de `BrandProfile`
- [ ] `GET /api/empresa/marca` — retorna BrandProfile  
  Permissão: `brand.read`
- [ ] `PATCH /api/empresa/marca` — atualiza campos (brandVoice, palette, typography, niche, description)  
  Permissão: `brand.update` · AuditLog · Disparar RAG reindex
- [ ] `POST /api/empresa/marca/logo` — recebe storageKey após upload direto  
  Permissão: `brand.update`
- [ ] `POST /api/empresa/onboarding` — recebe `{ companyName, brandVoice, logoStorageKey? }`  
  Seta `onboardingCompletedAt` · cria BrandProfile mínimo · Permissão: `company.update`
- [ ] Zod DTOs em `packages/types/src/empresa/` (ou `apps/api/src/empresa/dto/`)

#### Frontend — módulo `onboarding`

- [ ] Criar `core/modules/onboarding/` no web
- [ ] Middleware/guard no proxy: redirecionar para `/onboarding` se `onboardingCompletedAt == null`
- [ ] Página `/onboarding` — wizard 2 passos:
  - Passo 1: Nome do negócio + logo (upload direto S3 via presigned URL)
  - Passo 2: Tom de voz (textarea com exemplos)
  - Submit → `POST /api/empresa/onboarding` → redirecionar para dashboard
- [ ] RHF + zodResolver · nuqs para estado do wizard · animações entre passos

#### Frontend — módulo `marca`

- [ ] Criar `core/modules/marca/`
- [ ] Rota `/dashboard/marca`
- [ ] Página: Cérebro da Marca
  - Seção logo: upload + preview
  - Seção tom de voz: textarea editável
  - Seção paleta: editor de cores (opcional, pode inferir do logo)
  - Seção nicho/descrição: campo livre
  - `Save` → `PATCH /api/empresa/marca` com feedback toast
- [ ] Hook `useMarca()` via TanStack Query
- [ ] Adicionar item "Cérebro da Marca" na sidebar

#### Contratos `packages/types`

- [ ] `EmpresaDto`, `BrandProfileDto`, `OnboardingDto` (Zod schemas)
- [ ] `PresignedUploadDto`

---

### Sprint 2 — Créditos + AI Catalog + Admin Settings

**Prioridade:** Alta. Créditos bloqueiam geração. Admin config desbloqueia operação.

#### Backend — módulo `credits/`

- [ ] Criar `apps/api/src/credits/credits.module.ts`
- [ ] `CreditService`:
  - `getBalance(companyId)` — retorna `CreditBalance`
  - `checkBalance(companyId, estimatedCost)` — lança exceção se insuficiente
  - `debit(companyId, amount, agentRunStepId, description)` — cria `CreditLedger` DEBIT + atualiza `CreditBalance`
  - `credit(companyId, amount, description)` — cria `CreditLedger` CREDIT + atualiza `CreditBalance`
  - `adjust(companyId, amount, adminUserId, reason)` — tipo ADJUST · AuditLog
  - Atomicidade via `prisma.$transaction`
- [ ] `GET /api/empresa/creditos` — `{ balance, currency, ledger: [...últimos 20] }`  
  Permissão: `credit.read`
- [ ] `GET /api/empresa/creditos/historico` — paginado (nuqs: `page`, `pageSize`)  
  Permissão: `credit.read`

#### Backend — módulo `ai-catalog/` (admin)

- [ ] Criar `apps/api/src/ai-catalog/ai-catalog.module.ts`
- [ ] Tudo protegido por `PlatformRoleGuard` (platform_owner ou platform_admin)
- [ ] **Providers:**
  - `GET /api/platform/ai/providers`
  - `POST /api/platform/ai/providers`
  - `PATCH /api/platform/ai/providers/:id`
  - `POST /api/platform/ai/providers/:id/credentials` — salva credencial criptografada
  - `DELETE /api/platform/ai/providers/:id/credentials/:credId`
- [ ] **Models:**
  - `GET /api/platform/ai/models`
  - `POST /api/platform/ai/models`
  - `PATCH /api/platform/ai/models/:id`
  - `DELETE /api/platform/ai/models/:id`
- [ ] **Agent policies:**
  - `GET /api/platform/agents/policies`
  - `PATCH /api/platform/agents/policies/:agentId`
- [ ] **Pipeline config:**
  - `GET /api/platform/agents/pipeline`
  - `PATCH /api/platform/agents/pipeline` — reordenar, ativar/desativar
- [ ] **Platform settings (créditos + RAG):**
  - `GET /api/platform/settings`
  - `PATCH /api/platform/settings/credits` — freeTierAmount, markupDefault, minRunCost
  - `PATCH /api/platform/settings/rag` — chunkSize, chunkOverlap, topK, rerankEnabled
- [ ] **Empresas (gestão admin):**
  - `GET /api/platform/empresas` — DataTable paginado
  - `GET /api/platform/empresas/:id`
  - `POST /api/platform/empresas/:id/creditos/ajustar` — debit/credit manual · AuditLog

#### Frontend — platform-admin (estender módulo existente)

O módulo `platform-admin` já existe com shell e componentes base. Estender:

- [ ] Aba **AI Catalog**: DataTable de providers + models, dialog de credencial (já existe `credential-dialog.tsx`)
- [ ] Aba **Pipeline**: lista drag-and-drop de agentes; ativar/desativar; política de modelo por agente
- [ ] Aba **RAG Settings**: formulário com chunk size, topK, rerank toggle
- [ ] Aba **Créditos (plataforma)**: free tier amount, markup; DataTable de empresas com saldo; dialog ajuste manual
- [ ] Rotas: `/platform/settings` → ativar (parece que a rota não está conectada ainda)
- [ ] Hooks `usePlatformSettings()`, `useAiCatalog()` via TanStack Query

#### Frontend — saldo de créditos

- [ ] Componente `CreditBadge` no header do dashboard — exibe saldo atual
- [ ] Hook `useCreditos()` — TanStack Query, auto-refetch a cada 60s
- [ ] Modal "Créditos esgotados" ao tentar gerar com saldo zero

---

### Sprint 3 — Plataforma RAG

**Prioridade:** Alta. Sem RAG, os agentes não têm contexto de marca.

#### Backend — módulo `rag/`

- [ ] Criar `apps/api/src/rag/rag.module.ts`
- [ ] **Serviços de ingestão:**
  - `RagDocumentService` — CRUD de `RagDocument`; dedup por `contentHash`
  - `RagChunkService` — chunking com overlap; `chunkSize` e `chunkOverlap` de `RagPlatformSettings`
  - `RagEmbeddingService` — gera embeddings via modelo configurado (`embeddingModelId`)
  - `RagIndexJobProcessor` — worker que consome `RagIndexJob.PENDING`; loop periódico (setInterval ou Bull)
    - Pipeline: document → chunks → embeddings → status=INDEXED
    - Tentativas com backoff; status=FAILED após 3 tentativas
- [ ] **Serviços de retrieval:**
  - `StructuredRetrievalService` — busca campos diretos de `BrandProfile` + `Campaign`
  - `VectorRetrievalService` — pgvector top-K filtrado por `companyId` (nunca cross-tenant)
  - `RerankerService` — reranking por relevância (pode ser simples score semântico se sem reranker externo)
  - `ContextPackService` — monta `RagContextPack` para step: combina estruturado + vetorial + rerank + truncamento
- [ ] **Triggers de indexação:**
  - Marca atualizada → `BRAND_BRAIN` document
  - Campanha criada/atualizada → `CAMPAIGN` document
  - Arquivo uploadado → `CAMPAIGN_FILE` document (após extração de texto)
  - Feedback aprovado/negado → `AGENT_LEARNING` document
  - Peça aprovada → `APPROVED_PIECE` document
- [ ] **Admin endpoints:**
  - `POST /api/platform/rag/reindex/:companyId` — força reindex manual

#### Contratos `packages/types`

- [ ] `RagContextPack` type (estruturado + chunks relevantes + citations)

---

### Sprint 4 — Workflow Engine + Agent Registry + Pipeline Orchestrator

**Prioridade:** Crítica. Infraestrutura que todos os agentes usam.

#### Backend — `agents/runtime/`

- [ ] Criar `apps/api/src/agents/runtime/`
- [ ] `AgentRegistryService` — descobre agentes por pasta em `agents/<agentId>/agent.definition.ts`; sem if/switch
- [ ] `WorkflowEngineService`:
  - Lê steps de `workflow.ts` do agente
  - Loop: executa step → processa `StepResult` (CONTINUE / PAUSED / FAILED / COMPLETE)
  - PAUSED: persiste `pauseFormSchema` em `AgentRun`; aguarda retomada
  - Resume: `POST /api/agents/runs/:runId/resume` com body do formulário pausado
  - FAILED: persiste `errorMessage`; debita créditos apenas dos steps completados
  - Zod validation no `validate_output` step de cada agente
- [ ] `AgentRunService` — CRUD de `AgentRun` e `AgentRunStep`
- [ ] `CreditDebitOnStep` — interceptor de step `generate_*`: debitar `tokensInput × inputCost + tokensOutput × outputCost × markup`
- [ ] `StepContext` montado pelo engine: `{ brandBrain, campaign?, userInput, ragPack, stepOutputs, agentId, companyId }`

#### Backend — `agents/orchestrator/`

- [ ] `PipelineOrchestratorService`:
  - Lê ordem de `PipelineAgentConfig` (admin configurável)
  - Cria `PipelineRun` → cria `AgentRun` por agente em ordem
  - Passa output do agente N como input do agente N+1
  - Status agregado: `PipelineRun.status` reflete o agente em execução
- [ ] `PipelineRunService` — CRUD de `PipelineRun`
- [ ] **Verificação de saldo** pré-pipeline: `CreditService.checkBalance()` antes de criar `PipelineRun`
- [ ] **Endpoints:**
  - `POST /api/generate` — body: `{ userInput, campaignId? }` → cria PipelineRun · Permissão: `generation.create`
  - `GET /api/generate/:runId` — status da run + steps + contentPieces
  - `POST /api/agents/runs/:runId/resume` — retoma run PAUSED
  - `GET /api/agents/runs/:runId/stream` — SSE de progresso (step atual, status, logs parciais)

#### Contratos `packages/types`

- [ ] `PipelineRunStatusDto`, `AgentRunStepDto`, `GenerateRequestDto`

---

### Sprint 5 — Agentes MVP (Strategist, Copywriter, Designer)

**Prioridade:** Alta. Vertical slice que entrega valor real ao usuário.

#### Backend — `agents/copywriter/`

- [ ] `agent.definition.ts` — agentId: `copywriter`, schema de input/output Zod
- [ ] `workflow.ts` — steps em ordem:
  1. `retrieve_context` — chama `ContextPackService`, boost AGENT_LEARNING por agentId
  2. `generate_captions` — LLM: gera legendas + hashtags para cada peça planejada pelo strategist
  3. `validate_output` — Zod valida estrutura de saída
- [ ] `learning/feedback-handler.ts` — processa APPROVED/REJECTED/EDITED/IMPROVE_REQUEST
- [ ] `learning/learning-rules.ts` — define boosts/penalidades de sinais
- [ ] `rules.ts` — regras de negócio do copywriter (comprimento, hashtags máx, etc.)
- [ ] `prompts/` — templates de prompt (base + learning context injection)

#### Backend — `agents/designer/`

- [ ] `agent.definition.ts` — agentId: `designer`
- [ ] `workflow.ts` — steps:
  1. `retrieve_context` — busca assets da marca (logo, paleta, tipografia)
  2. `generate_html` — LLM: gera HTML/CSS para post 1080×1080 usando variáveis de marca
  3. `render_satori` — Satori converte HTML→PNG; `@vercel/satori` + `sharp`
  4. `upload_image` — envia PNG ao S3 via `StorageService`; persiste `imageStorageKey` em `ContentPiece`
  5. `validate_output` — verifica que PNG existe e ContentPiece está completo
- [ ] `learning/feedback-handler.ts`

#### Backend — `agents/strategist/`

- [ ] `agent.definition.ts` — agentId: `strategist`
- [ ] `workflow.ts` — steps:
  1. `retrieve_context` — contexto de marca + campanha
  2. `plan_pieces` — LLM: decide quantidade e ângulos das peças para a solicitação
  3. `validate_plan` — Zod valida array de peças planejadas
- [ ] `learning/feedback-handler.ts`

#### Backend — `agents/_template/`

- [ ] Template base para futuros agentes com todos os arquivos obrigatórios

#### Integração e testes

- [ ] Teste de integração: pipeline completo mock (strategist → copywriter → designer)
- [ ] Testar pause/resume no copywriter (ex: step pausado pedindo confirmação)
- [ ] Verificar débito de créditos por step

---

### Sprint 6 — Campanhas + Arquivos

**Prioridade:** Alta. Enriquece o contexto para geração — segundo modo do produto.

#### Backend — módulo `campanhas/`

- [ ] Criar `apps/api/src/campanhas/campanhas.module.ts`
- [ ] **CRUD campanhas:**
  - `GET /api/campanhas` — lista paginada (nuqs: page, pageSize, status) · Permissão: `campaign.read`
  - `POST /api/campanhas` — body: `{ name, objective }` (2 campos mín.) · Permissão: `campaign.create`
  - `GET /api/campanhas/:id` — detalhe + arquivos + peças · Permissão: `campaign.read`
  - `PATCH /api/campanhas/:id` — name, objective, context, status · Permissão: `campaign.update`
  - `DELETE /api/campanhas/:id` — soft delete via status=ARCHIVED · Permissão: `campaign.delete`
- [ ] **Arquivos:**
  - `GET /api/campanhas/:id/arquivos`
  - `POST /api/campanhas/:id/arquivos/presigned` — body: `{ name, mimeType, sizeBytes }` → presigned URL
  - `POST /api/campanhas/:id/arquivos/confirm` — confirma upload completo; cria `CampaignFile`; dispara processamento
  - `DELETE /api/campanhas/:id/arquivos/:fileId` · Permissão: `file.delete`
- [ ] **Processamento de arquivos (async):**
  - txt / md: extrai texto direto → `extractedText`
  - PDF: `pdf-parse` → texto → `extractedText`
  - Imagens (png/jpg/webp): LLM vision caption → `caption` → `extractedText`
  - Após extração: criar `RagDocument` (sourceType=CAMPAIGN_FILE) + `RagIndexJob`
- [ ] Trigger RAG ao criar/atualizar campanha (sourceType=CAMPAIGN)

#### Frontend — módulo `campanhas`

- [ ] Criar `core/modules/campanhas/`
- [ ] Rota `/dashboard/campanhas` — DataTable de campanhas
  - Colunas: nome, objetivo, peças geradas, status, criado em
  - Filtros via nuqs: status, busca por nome
  - Ação: criar nova campanha → dialog com 2 campos (nome + objetivo)
  - Ação: arquivar campanha
- [ ] Rota `/dashboard/campanhas/[id]` — workspace da campanha
  - Header: nome + objetivo + status badge
  - Aba **Arquivos**: upload drag-and-drop; lista de arquivos com status de indexação
  - Aba **Peças**: grid de ContentPieces da campanha; acesso à revisão
  - Input de geração: "Criar post para esta campanha" → `POST /api/generate`
- [ ] Hook `useCampanhas()`, `useCampanha(id)`, `useCampanhaFiles(id)` via TanStack Query
- [ ] Adicionar "Campanhas" na sidebar

---

### Sprint 7 — Feedback + Learning Loop

**Prioridade:** Alta. Fecha o ciclo do produto — sem isso, o "auto-melhoramento" não existe.

#### Backend — módulo `feedback/` (ou dentro de `campanhas/`)

- [ ] **Endpoints de revisão:**
  - `PATCH /api/pecas/:id/aprovar` · Permissão: `piece.approve` · AuditLog
  - `PATCH /api/pecas/:id/negar` — body: `{ reason? }` · Permissão: `piece.approve`
  - `PATCH /api/pecas/:id` — edição manual de `caption`, `hashtags` · Permissão: `piece.update`
  - `POST /api/pecas/:id/melhorar` — body: `{ instruction }` → cria nova `AgentRun` vinculada · Permissão: `piece.approve`
  - `POST /api/pecas/:id/regenerar` → nova run completa · Permissão: `generation.create`
- [ ] `FeedbackIngestionService`:
  - Cria `AgentFeedback` com `contentHash`, tipo, userId, originalContent, editedContent
  - Cria `LearningSignal` por sinal relevante
  - Atualiza `AgentMemory` (summary + signals JSON) para o agentId
  - APPROVED → indexa peça como `RagDocument` (sourceType=APPROVED_PIECE)
  - Qualquer feedback → indexa como `RagDocument` (sourceType=AGENT_LEARNING)
  - Dispara `RagIndexJob`
- [ ] `feedback-handler.ts` de cada agente:
  - Recebe `AgentFeedback` e extrai sinais específicos do agente
  - Ex: copywriter aprende comprimento preferido, hashtags aprovadas
  - Ex: designer aprende layouts aprovados, cores negadas
- [ ] Guard: `companyId` do `ContentPiece` deve ser do usuário autenticado

---

### Sprint 8 — UI Geração Rápida + Revisão de Peças

**Prioridade:** Alta. É a interface principal do produto.

#### Frontend — geração rápida (home)

- [ ] Atualizar `/dashboard` (home page) com:
  - Input centralizado: "O que quer criar hoje?" (1 campo)
  - Select opcional: campanha (lista de campanhas ativas)
  - Botão "Criar post" → `POST /api/generate`
  - Estado: loading com progresso de steps (via polling `GET /api/generate/:runId` ou SSE)
  - Estado paused: renderiza `pauseFormSchema` como formulário → submit retoma run
  - Estado completed: mostra as peças geradas
  - Estado failed: mensagem de erro + opção de tentar novamente
- [ ] Hook `useGeneration(runId?)` — TanStack Query com polling 2s enquanto QUEUED/RUNNING
- [ ] Zustand store para estado de geração ativa (cross-componente)

#### Frontend — revisão de peças

- [ ] Criar `core/modules/pecas/`
- [ ] Componente `PecaCard`:
  - Preview PNG (image tag com URL presigned)
  - Legenda expandível
  - Hashtags como chips
  - Ações: Aprovar (verde) / Negar (cinza) / Editar / Pedir melhoria / Regenerar
- [ ] Dialog `EditarPecaDialog`:
  - Textarea de legenda editável
  - Tags de hashtags editáveis
  - Salvar → `PATCH /api/pecas/:id`
- [ ] Dialog `PedirMelhoriaDialog`:
  - Input curto: "O que melhorar?"
  - Submit → `POST /api/pecas/:id/melhorar` → polling nova run
- [ ] Dialog `NegarPecaDialog`:
  - Motivo opcional
  - Submit → `PATCH /api/pecas/:id/negar`
- [ ] Toast ao aprovar: "Preferência salva — próximas gerações vão melhorar"
- [ ] Export ao aprovar: botão "Baixar PNG" + "Copiar legenda + hashtags"
- [ ] Rota `/dashboard/pecas` — histórico de todas as peças (DataTable)

#### Frontend — formulário de pause

- [ ] Componente genérico `PauseFormRenderer`:
  - Recebe `pauseFormSchema` (JSON Schema)
  - Renderiza campos dinamicamente (text, select, textarea, etc.)
  - Submit → `POST /api/agents/runs/:runId/resume`

---

### Sprint 9 — Polimento, Guards e E2E

**Prioridade:** Necessária antes de qualquer release.

#### Guards e empty states

- [ ] Middleware no proxy web: se `onboardingCompletedAt == null` → redirecionar `/onboarding`
- [ ] Empty state `/dashboard/campanhas` sem campanhas — CTA "Criar primeira campanha"
- [ ] Empty state sem peças geradas — CTA "Criar post"
- [ ] Bloqueio visual ao tentar gerar sem saldo: modal "Créditos esgotados"
- [ ] Feedback visual quando arquivo está sendo indexado (status=PROCESSING)

#### Animações e polish

- [ ] `tw-animate-css` em todos os overlays, dialogs, transições de página
- [ ] Loading skeletons nas listas (campanhas, peças)
- [ ] `gap-6` entre seções, `gap-4` dentro de agrupamentos — auditoria de espaçamento
- [ ] Verificar zero jargão de IA exposto ao usuário final

#### Testes Playwright

- [ ] `e2e/onboarding.spec.ts` — signup → onboarding → marca configurada
- [ ] `e2e/campanha.spec.ts` — criar campanha → upload arquivo → arquivo indexado
- [ ] `e2e/geracao-rapida.spec.ts` — input 1 frase → pipeline executado → peças exibidas
- [ ] `e2e/revisao.spec.ts` — aprovar peça → export funciona / negar → nova geração
- [ ] `e2e/creditos.spec.ts` — saldo zerado → geração bloqueada com mensagem clara

#### Critérios de aceite MVP (checklist final)

- [ ] Usuário completa onboarding em ≤ 3 campos
- [ ] Gera post com 1 frase em < 2 min
- [ ] Peça inclui PNG + legenda + hashtags
- [ ] Negar peça melhora próxima geração (learning indexado confirmado)
- [ ] Saldo zera → bloqueio claro com mensagem contextual
- [ ] Admin altera free tier sem deploy

---

## Fase 2 — Pós-MVP (Próximas Iterações)

| Item | Descrição | Dependência |
|------|-----------|-------------|
| Recarga self-service | Stripe Checkout → CreditLedger CREDIT | MVP estável |
| Stories / carrossel | Novos formatos de `ContentPieceFormat` + novos templates Satori | Designer estável |
| Calendário sugerido | Strategist sugere dias e horários de postagem | Strategist v2 |
| Puppeteer HTML→PNG | Fallback ao Satori quando layouts complexos exigirem fidelidade CSS | Designer estável |
| Decay de sinais | Learning signals com peso decaindo por tempo | AgentMemory v2 |
| Histórico avançado | Filtros de peças por campanha, status, período | Fase 1 completa |
| Geração em lote | Múltiplos posts de uma vez (arrastar campanha → gerar N peças) | Pipeline estável |

---

## Fase 3 — Expansão

| Item | Descrição |
|------|-----------|
| Equipe multi-usuário | Convidar colaboradores para a empresa (roles: admin, member) |
| Publicação direct | Integração Instagram Graph API / TikTok API para publicar direto |
| Billing avançado | Planos, trials, gestão de assinatura |

---

## Dependências entre Sprints

```
Sprint 1 (Storage + Empresa + Marca)
  └── Sprint 2 (Créditos + Admin) — depende de Empresa para bootstrapping
       └── Sprint 3 (RAG) — depende de Marca para indexar BRAND_BRAIN
            └── Sprint 4 (Workflow Engine) — depende de RAG para StepContext
                 └── Sprint 5 (Agentes MVP) — depende de Engine
                      └── Sprint 6 (Campanhas) — pode rodar em paralelo com S5 na parte de CRUD; processamento depende de RAG
                           └── Sprint 7 (Feedback + Learning) — depende dos Agentes
                                └── Sprint 8 (UI Geração + Revisão) — depende de tudo acima
                                     └── Sprint 9 (Polish + E2E) — depende de tudo
```

**Paralelismo possível:**
- Sprint 2 (admin frontend) pode ser desenvolvido em paralelo com Sprint 3 (RAG backend)
- Sprint 6 CRUD de campanhas pode ser desenvolvido em paralelo com Sprint 5 (Agentes)
- Testes Playwright podem ser escritos incrementalmente a partir do Sprint 3

---

## Mapa de Arquivos a Criar

### Backend (`apps/api/src/`)

```
storage/
  storage.module.ts
  storage.service.ts

empresa/
  empresa.module.ts
  empresa.service.ts
  empresa.controller.ts
  dto/empresa.dto.ts
  marca/
    marca.service.ts
    marca.controller.ts
    dto/marca.dto.ts

credits/
  credits.module.ts
  credits.service.ts
  credits.controller.ts
  dto/credits.dto.ts

ai-catalog/
  ai-catalog.module.ts
  providers.service.ts
  models.service.ts
  policies.service.ts
  platform-settings.service.ts
  ai-catalog.controller.ts

rag/
  rag.module.ts
  services/
    document.service.ts
    chunk.service.ts
    embedding.service.ts
    index-job.processor.ts
    structured-retrieval.service.ts
    vector-retrieval.service.ts
    reranker.service.ts
    context-pack.service.ts

agents/
  _template/           ← copiar para novo agente
  runtime/
    agent-registry.service.ts
    workflow-engine.service.ts
    agent-run.service.ts
  orchestrator/
    pipeline-orchestrator.service.ts
    pipeline-run.service.ts
  strategist/
    agent.definition.ts
    workflow.ts
    steps/
    learning/
      feedback-handler.ts
      learning-rules.ts
    rules.ts
    prompts/
  copywriter/          ← mesma estrutura
  designer/            ← mesma estrutura
  agents.module.ts
  agents.controller.ts

campanhas/
  campanhas.module.ts
  campanhas.service.ts
  campanhas.controller.ts
  files/
    files.service.ts
    files.controller.ts
    processors/
      text-extractor.ts
      pdf-extractor.ts
      image-caption.ts
  dto/

feedback/
  feedback.module.ts
  feedback-ingestion.service.ts
  feedback.controller.ts
  dto/
```

### Frontend (`apps/web/src/core/modules/`)

```
onboarding/
  pages/onboarding-page.tsx
  components/
  hooks/use-onboarding.ts

marca/
  pages/marca-page.tsx
  components/
    logo-uploader.tsx
    brand-voice-editor.tsx
    palette-editor.tsx
  hooks/use-marca.ts

campanhas/
  pages/
    campanhas-list-page.tsx
    campanha-workspace-page.tsx
  components/
    campanha-table.tsx
    campanha-create-dialog.tsx
    arquivo-upload-zone.tsx
    arquivo-list.tsx
  hooks/
    use-campanhas.ts
    use-campanha.ts
    use-campanha-files.ts

pecas/
  pages/pecas-history-page.tsx
  components/
    peca-card.tsx
    editar-peca-dialog.tsx
    negar-peca-dialog.tsx
    pedir-melhoria-dialog.tsx
    pause-form-renderer.tsx
  hooks/use-pecas.ts

generation/
  components/
    generation-input.tsx
    generation-progress.tsx
  hooks/use-generation.ts
  store/generation-store.ts   ← zustand

credits/
  components/credit-badge.tsx
  hooks/use-creditos.ts
```

### Rotas novas (`apps/web/src/app/[locale]/dashboard/(shell)/`)

```
marca/page.tsx
campanhas/page.tsx
campanhas/[id]/page.tsx
pecas/page.tsx
```

---

## Convenções Reforçadas

> Aplicar em cada item implementado:

- **Toda nova permissão:** declarar em `packages/authz/src/index.ts` antes de usar no controller
- **Todo endpoint:** `@RequirePermission(key)` explícito (nunca sem guard)
- **userId:** sempre `req.currentUser.id`, nunca do body
- **DTOs:** Zod em `packages/types/` para contratos cross-boundary; Zod local para DTOs internos
- **TanStack Query:** hooks de domínio (`useCampanhas`, `useMarca`, etc.) — nunca fetch direto em página
- **RHF + zodResolver:** em todos os formulários
- **nuqs:** filtros, tabs, paginação, qualquer estado de URL
- **Server Components:** default; `"use client"` apenas quando necessário
- **AuditLog:** toda mutação sensível (marca, créditos, configuração admin)
- **Animações:** `tw-animate-css` em overlays, modais e transições
- **Espaçamento:** `gap-6` entre seções, `gap-4` dentro de agrupamentos
