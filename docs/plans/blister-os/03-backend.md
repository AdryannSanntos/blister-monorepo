# Plano 3 — Backend + Agents (Blister OS)

> **Pré-requisito:** [Plano 1](./01-correction-and-docs.md) ✅ · [Plano 2](./02-frontend.md) em estágio avançado (contratos definidos)  
> **Regras:** [00-execution-rules.md](./00-execution-rules.md)

## Objetivo

Implementar **API, Prisma, agent-sdk e agente `cuts`** seguindo padrões do monorepo (NestJS, CASL, Zod).

**Regra:** implementar o que o **frontend já definiu** — seção [Contrato com o Frontend](#contrato-com-o-frontend) é atualizada pelo Plano 2.

**Contexto:** o Plano 2 entrega UI **sem nenhuma integração** — só dados fake funcionais. Este plano constrói a API e, na Fase 3.7, substitui os mocks.

**Separação hard:** o módulo `ia/` do SDK contém **toda** lógica de IA (LLM, RAG, embedding, model resolver, assemblyai STT, caption, chunk, ingestion, retrieval). O backend não tem nenhuma lógica de IA — só rotas HTTP, guards, DTOs, workflow engine, SSE e créditos.

---

## Fronteira backend ↔ SDK

```
apps/api/src/           packages/agent-sdk/src/
──────────────          ──────────────────────────
controllers/            ia/
  agents/                 llm/           ← providers, model resolver, platform client
  files/                  rag/           ← ingestion, retrieval, embedding, chunk
  marketplace/            stt/           ← assemblyai STT adapter
  ...                     caption/       ← image caption
  guards/                 context/       ← ContextPackBuilder implementation
  dtos/               agents/
agents/adapters/          cuts/          ← agent.ts, steps, prompts, schemas, learning
  prisma-run-store       (future: planning, script, thumbnail...)
  sdk-step              core/            ← kernel, AgentBuilder, executeRun
  usage-reporter        steps/           ← createLlmCallStep, createPauseStep, ...
workflow-engine         stream/
sse/                    testing/
credits/
```

**O que NUNCA vai em `apps/api`:** LLM calls, RAG queries, embedding, STT, caption, model selection, prompt building, step logic.

---

## Limpeza obrigatória (executar antes da Fase 3.3)

### Deletar do backend

```
apps/api/src/ai-runtime/     ← mover todo conteúdo para packages/agent-sdk/src/ia/
apps/api/src/rag/            ← mover todo conteúdo para packages/agent-sdk/src/ia/rag/
```

### Adapters que se movem para o SDK

Os seguintes arquivos em `apps/api/src/agents/adapters/` contêm lógica de IA e devem ir para o SDK:

| Arquivo atual (API) | Destino (SDK) |
|---------------------|---------------|
| `brand-profile.mapper.ts` | `packages/agent-sdk/src/ia/context/brand-profile.mapper.ts` |
| `context-pack-builder.adapter.ts` | `packages/agent-sdk/src/ia/context/context-pack-builder.ts` |
| `asset-resolver.adapter.ts` | `packages/agent-sdk/src/ia/assets/asset-resolver.ts` |

### Ficam no backend (wiring puro, sem IA)

```
apps/api/src/agents/adapters/
  prisma-run-store.adapter.ts    ← persiste runs/steps no Prisma
  sdk-step.adapter.ts            ← wiring step executor → NestJS
  usage-reporter.adapter.ts      ← débito créditos via CreditService
```

---

## Contrato com o Frontend

> **Seção viva** — atualizar sempre que o Plano 2 mudar telas, campos ou fluxos.  
> Última revisão: _2026-06-12_ (baseline inicial)

### Legenda de status

| Status | Significado |
|--------|-------------|
| `MOCK` | Frontend usa fixture; API não existe |
| `SPEC` | Contrato acordado; API pendente |
| `LIVE` | API implementada; frontend integrado |

---

### Workspace e auth

| Need (Frontend) | Método | Rota | Status |
|-----------------|--------|------|--------|
| Sessão / login | — | better-auth `/api/auth/*` | LIVE |
| Empresa ativa | header | `x-blister-company-id` | LIVE |
| Home destination | GET | `/api/companies/home-destination` | SPEC → `personal-space` default |
| Espaço pessoal | GET | `/api/personal-space` | SPEC |
| Settings pessoal | GET/PATCH | `/api/personal-space/settings` | SPEC |
| Settings empresa | GET/PATCH | `/api/company/settings` | SPEC |
| Listar empresas acessíveis | GET | `/api/companies` | SPEC → owned + member |

**Payload `WorkspaceSettings.profile` (Zod):** voz, nicho, público, posicionamento, preferências conteúdo — espelhar cards Settings "Contexto da marca".

---

### Marketplace e biblioteca

| Need | Método | Rota | Status |
|------|--------|------|--------|
| Listar itens | GET | `/api/marketplace/items?type=` | SPEC |
| Detalhe item | GET | `/api/marketplace/items/:id` | SPEC |
| Resgatar | POST | `/api/marketplace/redeem` `{ itemId }` | SPEC |
| Biblioteca (owned) | GET | `/api/marketplace/entitlements` | SPEC |
| Créditos saldo | GET | `/api/company/credits` | LIVE |

**Tipos:** `edit-style`, `post-style`, `pack`, `template`, `asset`, `agent` (refId = agentId)

**Regra:** agente marketplace sem entitlement → `POST /agents/:id/run` → 403 + code `ENTITLEMENT_REQUIRED`

---

### Files

| Need | Método | Rota | Status |
|------|--------|------|--------|
| Browse pasta | GET | `/api/files/browse?folderId=` | SPEC |
| Breadcrumb | GET | `/api/files/breadcrumb/:folderId` | SPEC |
| Criar pasta | POST | `/api/files/folders` | SPEC |
| Upload | POST | `/api/files/upload` `{ folderId?, extractData? }` | SPEC |
| Preview URL | GET | `/api/files/:id/preview` | SPEC |
| Mover/renomear | PATCH | `/api/files/:id` | SPEC |
| Extract | POST | `/api/files/:id/extract` | SPEC |
| Delete | DELETE | `/api/files/:id` | SPEC |

**Pastas sistema (seed):** `Uploads`, `Gerados`, `Integrações`

---

### Projetos

| Need | Método | Rota | Status |
|------|--------|------|--------|
| Listar | GET | `/api/projects` | SPEC |
| CRUD | POST/PATCH/DELETE | `/api/projects` | SPEC |

_Schema: evoluir `Campaign` ou novo `Project` — decidir ao integrar._

---

### Agentes e runs

| Need | Método | Rota | Status |
|------|--------|------|--------|
| Catálogo | GET | `/api/agents/catalog` | LIVE → atualizar tiers |
| Start run | POST | `/api/agents/:agentId/run` | LIVE |
| Run detail | GET | `/api/agents/runs/:runId` | LIVE |
| Resume (wizard pause) | POST | `/api/agents/runs/:runId/resume` | LIVE |
| SSE stream | GET | `/api/agents/runs/:runId/stream` | LIVE |
| Approve/reject/edit | POST/PATCH | `/api/agents/runs/:runId/*` | LIVE |
| Histórico | GET | `/api/agents/:agentId/runs` | LIVE |

**Agent IDs (MVP — somente `cuts` implementado agora):**

| ID | Tier | UI (Plano 2) | Status |
|----|------|----------------|--------|
| `cuts` | default | wizard cortes | **implementar agora** |
| `planning` | marketplace | AgentPage | futuro |
| `script` | marketplace | AgentPage | futuro |
| `thumbnail` | marketplace | AgentPage | futuro |

> **Nota:** `research` e `video_editor` são IDs reservados para fases futuras — não implementar neste plano.

**Deprecar:** `post`, `strategist`, `copywriter`, `designer` no catálogo ativo.

---

### Equipe (empresa)

| Need | Método | Rota | Status |
|------|--------|------|--------|
| Membros | GET/POST/DELETE | `/api/members/*` | LIVE → escopar por companyId |
| Roles | GET/PATCH | `/api/roles/*` | LIVE |

**Roles:** `owner`, `admin`, `editor`, `social_media`, `viewer` — RBAC por `companyId`

---

### Changelog de contrato

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-06-12 | Baseline inicial a partir do plano monólito + reference HTML | — |
| 2026-06-22 | Separação hard IA→SDK, somente `cuts` no MVP, deletar ai-runtime/rag do backend | — |

---

## Fase 3.1 — Fundação de contas (Prisma + API)

### Schema

```prisma
model PersonalSpace { ... }      # ver plano monólito
model WorkspaceSettings { ... }
model CompanyMember { ... }
model WorkspaceFolder { ... }
model WorkspaceFile { ... }
model MarketplaceItem { ... }
model WorkspaceEntitlement { ... }
model SocialConnection { ... }   # fase posterior
```

### Migrations

1. `PersonalSpace` + bootstrap signup
2. `CompanyMember` + migrar `ownerUserId`
3. `WorkspaceSettings` ← migrar `BrandProfile`
4. `WorkspaceFolder` + `WorkspaceFile`
5. Marketplace + entitlements

### Authz

Atualizar [`packages/authz`](../../../packages/authz/src/index.ts): 5 roles, permissões por empresa.

[`PermissionGuard`](../../../apps/api/src/users/guards/permission.guard.ts): scope `companyId` do header.

### Módulos NestJS

| Módulo | Path |
|--------|------|
| `personal-space/` | settings, bootstrap |
| `workspace-settings/` | ou dentro company/personal |
| `files/` | browse, upload, extract |
| `marketplace/` | items, redeem, entitlements |
| `projects/` | CRUD |
| `integrations/` | OAuth fase posterior |

---

## Fase 3.2 — Files + extract (SDK ia/)

1. `FilesService` + S3 paths por workspace/folder
2. Trigger job `file-extract-index.ts` — chama extratores do SDK
3. SDK `ia/rag/` expõe: `ingestDocument`, `indexChunks`, `retrieveContext`
4. SDK `ia/stt/` expõe: `transcribeAudio` (assemblyai)
5. SDK `ia/caption/` expõe: `captionImage`
6. `ContextPackService` no SDK — settings + files + learning (lê via interfaces)

Extratores MVP: PDF/TXT/MD, vídeo→STT, imagem→caption, SRT/VTT

**Backend não chama IA diretamente** — enfileira job, SDK executa, persiste resultado via `WorkspaceFile.extractedData`.

---

## Fase 3.3 — Limpeza IA + SDK monolith

Executar a limpeza descrita em [Limpeza obrigatória](#limpeza-obrigatória-executar-antes-da-fase-33).

### Estrutura `packages/agent-sdk/src/`

```
ia/
  llm/          ← AiRuntimeService, providers (openrouter, gemini), model-resolver
  rag/          ← ingestion, retrieval, embedding, chunk, document
  stt/          ← assemblyai STT
  caption/      ← image caption service
  context/      ← ContextPackBuilder, brand-profile.mapper
  assets/       ← asset-resolver

agents/
  cuts/         ← agent.ts, steps/, prompts/, schemas/, learning/
  (future: planning/, script/, thumbnail/)
  _deprecated/

marketplace/
  catalog.ts, entitlement-resolver.ts, redeem.ts
```

### Adapters que ficam em `apps/api`

| Interface SDK | Implementação API | Notas |
|---------------|-------------------|-------|
| `RunStore` | `prisma-run-store.adapter.ts` | CRUD Prisma puro |
| `StepExecutor` | `sdk-step.adapter.ts` | wiring NestJS |
| `UsageReporter` | `usage-reporter.adapter.ts` | débito créditos |
| `EventPublisher` | `http-event-publisher.ts` (existente) | SSE |

---

## Fase 3.4 — Agente `cuts`

### Steps do agente

| Step | Primitive SDK |
|------|---------------|
| `retrieve_context` | `createRetrieveContextStep()` |
| `transcribe` | step custom → `ia/stt/transcribeAudio` |
| `identify_moments` | `createLlmCallStep({ outputSchema: cutsOutputZod })` |
| `validate_output` | `createValidationStep({ schema: cutsOutputZod })` |

### Estrutura no SDK

```
packages/agent-sdk/src/agents/cuts/
├── agent.ts              ← AgentBuilder: init, contexto, steps, learning
├── schemas/
│   ├── output.schema.ts  ← input, output, llmOutput (defineAgentSchemas)
│   └── cuts.types.ts
├── steps/
│   └── transcribe.step.ts
├── prompts/
│   └── identify-moments.system.ts
└── learning/
    └── feedback-handler.ts   ← obrigatório
```

### Integração frontend

- Wizard pause → `POST /runs/:id/resume` com `formData` do step
- Output files → criar `WorkspaceFile` em `Gerados/` (`origin: AGENT_RUN`)
- SSE blocks → UI streaming

---

## Fase 3.5 — Marketplace backend

1. Seed `MarketplaceItem` (edit styles do reference + agentes futuros)
2. `POST /marketplace/redeem` — débito créditos + `WorkspaceEntitlement`
3. `EntitlementResolver` no SDK antes de `executeRun`
4. Sync catálogo: somente `cuts` como default; marketplace IDs reservados

---

## Fase 3.6 — Integrações (pós-MVP core)

- `SocialConnection` OAuth
- Sync vídeos → `WorkspaceFile` em `Integrações/{platform}`
- Agentes futuros: `planning`, `script`, `thumbnail`, `distribution`

---

## Fase 3.7 — Integração com frontend

> **Único momento** em que o frontend passa a chamar API de produto. Até aqui, Plano 2 permanece 100% fake/funcional.

Ordem sugerida de trocar mocks por hooks reais (TanStack Query + `apiClient`):

1. Settings (GET/PATCH)
2. Marketplace + entitlements + créditos
3. Files browse/upload
4. Projects
5. Agent catalog + entitlement gate
6. Runs — agente `cuts` conectado
7. Extract + RAG feedback na UI (badges extraction status)

Cada troca: atualizar status na tabela [Contrato](#contrato-com-o-frontend) para `LIVE`.

---

## `packages/types`

- DTOs HTTP/SSE apenas
- Schemas de agente **definidos no SDK**; re-export se necessário
- Novos: `WorkspaceSettingsDto`, `FileBrowseResponse`, `MarketplaceItemDto`, `RedeemRequest`

---

## Checklist de conclusão (Plano 3)

- [ ] PersonalSpace + CompanyMember + 5 roles
- [ ] WorkspaceSettings migrou BrandProfile
- [ ] `apps/api/src/ai-runtime/` deletado — conteúdo no SDK `ia/`
- [ ] `apps/api/src/rag/` deletado — conteúdo no SDK `ia/rag/`
- [ ] `brand-profile.mapper`, `context-pack-builder`, `asset-resolver` removidos dos adapters API
- [ ] Files API + extract (SDK executa, backend enfileira)
- [ ] Marketplace redeem + entitlements
- [ ] SDK monolith; zero `{agentId}/` na API
- [ ] Agente `cuts` operacional (default, sem entitlement)
- [ ] Contrato com Frontend: todos `LIVE`
- [ ] Trigger job: `agent-run-execute`, `file-extract-index`
- [ ] Testes SDK: `pnpm --filter @company-os/agent-sdk test`

---

## O que não fazer

- Integrar frontend com API **antes** da Fase 3.7 (Plano 2 = fake funcional apenas)
- Qualquer lógica de IA em `apps/api` (LLM, RAG, embedding, STT, caption)
- Manter `apps/api/src/ai-runtime/` ou `apps/api/src/rag/` após Fase 3.3
- Implementar `research` ou `video_editor` neste plano — são agentes futuros
- Novo hub `ContentPiece` / `/api/pecas`
- `BrandProfile` / módulo `brand/` ativos
- Endpoints não listados no Contrato sem atualizar Plano 2

---

## Arquitetura alvo (diagrama)

```
apps/api/                           packages/agent-sdk/
──────────────────────────────      ──────────────────────────────────
controllers/ (HTTP, guards, DTOs)   ia/
agents/                               llm/ (providers, model-resolver)
  adapters/                           rag/ (ingestion, retrieval, embed)
    prisma-run-store ──────────────→  stt/ (assemblyai)
    sdk-step         ──────────────→  caption/
    usage-reporter   ──────────────→  context/ (ContextPackBuilder)
workflow-engine ─────────────────→  agents/
sse/                                  cuts/ (agent.ts, steps, schemas)
credits/                            core/ (kernel, AgentBuilder)
                                    steps/ (primitives)
                                    stream/ (BlockEmitter)
                                    testing/ (harness, stubs)
```

---

## Referências técnicas

- [`docs/agents/workflow-engine.md`](../../agents/workflow-engine.md)
- [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../../decisions/2026-06-09-agents-isolated-architecture.md)
- [`docs/skills/backend-skill.md`](../../skills/backend-skill.md)
- [`docs/skills/agents-skill.md`](../../skills/agents-skill.md)
- [`.cursor/plans/agent_sdk_monolith_ae991433.plan.md`](../../../.cursor/plans/agent_sdk_monolith_ae991433.plan.md)
