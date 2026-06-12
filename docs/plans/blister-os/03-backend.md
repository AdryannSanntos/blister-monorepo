# Plano 3 — Backend + Agents (Blister OS)

> **Pré-requisito:** [Plano 1](./01-correction-and-docs.md) ✅ · [Plano 2](./02-frontend.md) em estágio avançado (contratos definidos)  
> **Regras:** [00-execution-rules.md](./00-execution-rules.md)

## Objetivo

Implementar **API, Prisma, RAG, agent-sdk e agentes** seguindo padrões do monorepo (NestJS, CASL, Zod, Trigger.dev).

**Regra:** implementar o que o **frontend já definiu** — seção [Contrato com o Frontend](#contrato-com-o-frontend) é atualizada pelo Plano 2.

**Contexto:** o Plano 2 entrega UI **sem nenhuma integração** — só dados fake funcionais. Este plano constrói a API e, na Fase 3.7, substitui os mocks.

**SDK monolith:** zero lógica de agente em `apps/api/src/agents/{agentId}/`.

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

**Agent IDs (canônicos):**

| ID | Tier | UI (Plano 2) |
|----|------|----------------|
| `video_editor` | default | wizard 4 steps |
| `cuts` | default | wizard cortes |
| `research` | default | brief + entregas |
| `planning` | marketplace | AgentPage |
| `script` | marketplace | AgentPage |
| `thumbnail` | marketplace | AgentPage |

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
| | | |

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

## Fase 3.2 — Files + extract + RAG

1. `FilesService` + S3 paths por workspace/folder
2. Trigger `file-extract-index.ts`
3. RAG source `WORKSPACE_SETTINGS`, `WORKSPACE_FILE` (renomear `BRAND_BRAIN`)
4. `ContextPackService` — settings + files + learning

Extratores MVP: PDF/TXT/MD, vídeo→STT, imagem→caption, SRT/VTT

---

## Fase 3.3 — Agent SDK monolith

Alinhar [`.cursor/plans/agent_sdk_monolith_ae991433.plan.md`](../../../.cursor/plans/agent_sdk_monolith_ae991433.plan.md).

### Estrutura `packages/agent-sdk/src/`

```
agents/
  research/, cuts/, video-editor/
  planning/, script/, thumbnail/
  _deprecated/
marketplace/
  catalog.ts, entitlement-resolver.ts, redeem.ts
```

### Migrar de `apps/api/src/agents/`

- Toda pasta `{agentId}/` → SDK ou `_deprecated`
- Manter em API: controllers, adapters, `workflow-engine.service.ts` fino

### Adapters

| Interface SDK | Implementação API |
|---------------|-------------------|
| `RunStore` | `prisma-run-store.adapter.ts` |
| `EntitlementStore` | `prisma-entitlement-store.adapter.ts` |
| `ContextPackBuilder` | `context-pack-builder.adapter.ts` |
| `UsageReporter` | `usage-reporter.adapter.ts` → créditos |
| `EventPublisher` | SSE / internal-events |

---

## Fase 3.4 — Agentes

### Default (sem entitlement)

| Agente | Steps resumidos |
|--------|-----------------|
| `research` | context → analyze_trends → validate |
| `cuts` | context → transcribe → identify_moments → validate |
| `video_editor` | context → brief → plan_edit → pause → apply_edit → validate |

### Marketplace

| Agente | Steps |
|--------|-------|
| `planning` | context → build_calendar → validate |
| `script` | context → brief → write_script → validate |
| `thumbnail` | context → concepts → variants → validate |

Cada um: `learning/feedback-handler.ts` obrigatório.

### Integração frontend

- Wizard pause → `POST /runs/:id/resume` com `formData` do step
- Output files → criar `WorkspaceFile` em `Gerados/` (`origin: AGENT_RUN`)
- SSE blocks → UI streaming (onde Plano 2 mantiver chat)

---

## Fase 3.5 — Marketplace backend

1. Seed `MarketplaceItem` (edit styles do reference + agentes)
2. `POST /marketplace/redeem` — débito créditos + `WorkspaceEntitlement`
3. `EntitlementResolver` no SDK antes de `executeRun`
4. Sync catálogo agentes: `tier` + `refId`

---

## Fase 3.6 — Integrações (pós-MVP core)

- `SocialConnection` OAuth
- Sync vídeos → `WorkspaceFile` em `Integrações/{platform}`
- Agente `distribution` (marketplace)

---

## Fase 3.7 — Integração com frontend

> **Único momento** em que o frontend passa a chamar API de produto. Até aqui, Plano 2 permanece 100% fake/funcional.

Ordem sugerida de trocar mocks por hooks reais (TanStack Query + `apiClient`):

1. Settings (GET/PATCH)
2. Marketplace + entitlements + créditos
3. Files browse/upload
4. Projects
5. Agent catalog + entitlement gate
6. Runs (wizards conectados)
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
- [ ] Files API + extract + RAG sources
- [ ] Marketplace redeem + entitlements
- [ ] SDK monolith; zero `{agentId}/` na API
- [ ] 3 default + 3 marketplace agents operacionais
- [ ] Contrato com Frontend: todos `LIVE`
- [ ] Trigger.dev: `agent-run-execute`, `file-extract-index`
- [ ] Testes SDK: `pnpm --filter @company-os/agent-sdk test`

---

## O que não fazer

- Integrar frontend com API **antes** da Fase 3.7 (Plano 2 = fake funcional apenas)
- Lógica de step/prompt em `apps/api`
- Novo hub `ContentPiece` / `/api/pecas`
- `BrandProfile` / módulo `brand/` ativos
- Endpoints não listados no Contrato sem atualizar Plano 2

---

## Referências técnicas

- [`docs/agents/workflow-engine.md`](../../agents/workflow-engine.md)
- [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../../decisions/2026-06-09-agents-isolated-architecture.md)
- [`docs/skills/backend-skill.md`](../../skills/backend-skill.md)
- [`docs/skills/agents-skill.md`](../../skills/agents-skill.md)
