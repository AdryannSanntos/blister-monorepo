# ADR — Pivot Blister OS (Video-First, User-Centric)

> **Data:** 2026-06-12  
> **Status:** Aprovado  
> **Substitui parcialmente:** [`2026-06-08-product-pivot-ai-marketing.md`](2026-06-08-product-pivot-ai-marketing.md) como visão de produto  
> **Mantém:** [`2026-06-09-agents-isolated-architecture.md`](2026-06-09-agents-isolated-architecture.md)

---

## Contexto

O produto evoluiu de **marketing post-first para MEI** (imagem + legenda + hashtags) para **Blister OS** — um sistema operacional de conteúdo **video-first** para creators, mentores e agências. A UI proto (`blister-os-reference.html`) e os planos 01→02→03 formalizam essa direção.

---

## Decisão

Adotar **Blister OS** como produto alvo. Fonte #1: [`docs/prd/blister-os-prd.md`](../prd/blister-os-prd.md).

---

## O que permanece

| Área | Detalhe |
|------|---------|
| **Monorepo** | `apps/web`, `apps/api`, `packages/authz`, `packages/types`, `packages/agent-sdk` |
| **Auth** | better-auth — sessão apenas |
| **RBAC base** | CASL, `@RequirePermission`, `<PermissionGate>` |
| **Agentes isolados** | Sem pipeline; `POST /api/agents/:agentId/run`; output em `AgentRun` |
| **RAG + learning** | Filtrado por workspace; feedback → `AGENT_LEARNING` |
| **Créditos** | Saldo, ledger, free tier admin, débito por step |
| **Storage** | S3 presigned |
| **Platform admin** | AI catalog, settings, ajuste de créditos |
| **Workflow engine** | Multi-step **dentro** de um agente — kernel no SDK |
| **Trigger.dev** | Execução async de runs e indexação RAG |
| **Design tokens** | Satoshi, Poppins, primary-600, dark mode |
| **Regras de código** | Zod, TanStack Query, RHF, nuqs, Playwright |

---

## O que muda

| Antes (MEI/post-first) | Depois (Blister OS) |
|------------------------|---------------------|
| Público: MEI, bolo no Instagram | Creators, mentores, agências video-first |
| Entrega: PNG + legenda + hashtags | Vídeo editado, cortes, roteiro, planejamento |
| **Cérebro da Marca** (`/dashboard/brand`) | **Configurações** — contexto da marca integrado |
| Campanha como workspace central | **Projetos** como workspace operacional |
| Agentes: strategist, copywriter, designer, post | Default: `research`, `cuts`, `video_editor` |
| Catálogo fixo | **Marketplace** + Biblioteca (resgate com créditos) |
| Uploads soltos | **Arquivos** — browser com pastas + extract → RAG |
| 1 company / 3 roles | **Espaço Pessoal** + Empresas com **5 roles** |
| Sidebar MEI (pecas, criar, brand) | Sidebar OS — Estúdio, Acervo, Configurações |
| Lógica de agente em `apps/api/src/agents/` | **100% no `packages/agent-sdk`** — API só adapters |
| Frontend integrado cedo | **Plano 2 sem API** — fixtures funcionais; Plano 3 integra |

---

## O que depreca

### Produto e docs

| Item | Ação |
|------|------|
| `docs/prd/blister-master-prd.md` | Banner → `blister-os-prd.md` |
| `docs/prd/modules/brand-brain.md` | Banner deprecated → `workspace-settings.md` |
| Copy "Cérebro da Marca" na UI | Remover (contexto em Configurações) |
| MEI/post como narrativa principal | Arquivar em `docs/archive/` |
| `docs/decisions/mvp-features.md` | Movido para `docs/archive/` |
| `docs/decisions/sidebar-flows.md` | Arquivado — substituído por `blister-os-reference.md` |
| Pipeline / `PipelineOrchestrator` | Nunca implementar |
| Hub `ContentPiece` / `/dashboard/pecas` | Legado schema; novos fluxos usam `AgentRun` |
| `docs/ROADMAP.md` sprints MEI | Reescrito para planos blister-os |

### Agentes

| ID | Status |
|----|--------|
| `strategist` | Deprecated — substituído por `planning` (marketplace) |
| `copywriter` | Deprecated — substituído por `script` (marketplace) |
| `designer` | Deprecated — substituído por `thumbnail` + Edit/Post Styles |
| `post` | Deprecated — sem orquestração; usuário combina agentes manualmente |

### Código (remoção nos planos 02/03)

| Path | Plano |
|------|-------|
| `apps/web/.../brand/` | Remover no Plano 2 |
| Rotas `/dashboard/pecas`, copy MEI | Plano 2 i18n + rotas OS |
| `apps/api/src/agents/{id}/` lógica pesada | Migrar para SDK no Plano 3 |

---

## Consequências

### Positivas

- Produto diferenciado para mercado creator (TAM maior que MEI puro)
- Marketplace monetiza estilos e agentes extras
- SDK monolith facilita testes e novos agentes
- Frontend-first reduz retrabalho de API

### Negativas / custo

- Schema Prisma ainda carrega legado (BrandProfile, ContentPiece, Campaign) — migração gradual
- Docs e código divergem até Plano 2/3 completos
- Permissões `brand.*`, `piece.*` precisam evoluir para workspace OS

---

## Implementação

| Fase | Escopo |
|------|--------|
| Plano 1 | Docs, skills, rules, HTML proto — **agora** |
| Plano 2 | UI completa offline — fixtures |
| Plano 3 | PersonalSpace, CompanyMember, 5 roles, SDK, APIs, swap mocks |

---

## Referências

- PRD: [`blister-os-prd.md`](../prd/blister-os-prd.md)
- Planos: [`docs/plans/blister-os/`](../plans/blister-os/README.md)
- Proto: [`blister-os-reference.html`](../../blister-os-reference.html)
