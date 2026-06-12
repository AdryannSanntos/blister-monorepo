# Roadmap — Blister OS

> **Versão:** 2.0 · **Data:** 2026-06-12  
> **Fonte:** [`docs/prd/blister-os-prd.md`](prd/blister-os-prd.md) · [`docs/plans/blister-os/`](plans/blister-os/)

---

## Visão

Migrar de codebase MEI/post-first para **Blister OS** em três planos sequenciais. Não há sprints de pipeline, peças ou Cérebro da Marca.

```
Plano 1 Docs ✅  →  Plano 2 Frontend (offline)  →  Plano 3 Backend + integração
```

Regras: [`docs/plans/blister-os/00-execution-rules.md`](plans/blister-os/00-execution-rules.md)

---

## Plano 1 — Correção + Docs ✅ (2026-06-12)

- [x] PRD OS + ADR pivot
- [x] CLAUDE.md, skills, Cursor rules
- [x] `blister-os-reference.md` + HTML proto updates
- [x] Arquivar legado MEI (mvp-features, sidebar-flows)
- [x] ROADMAP reescrito

**Próximo:** iniciar Plano 2 quando checklist Plano 1 completo.

---

## Plano 2 — Frontend OS (sem API)

> Spec: [`docs/plans/blister-os/02-frontend.md`](plans/blister-os/02-frontend.md)

**Regra absoluta:** zero integração HTTP de produto — fixtures funcionais.

| Área | Entregável |
|------|------------|
| Shell | Sidebar = NAV reference; workspace switcher mock |
| Rotas | Todas rotas do mapa OS existem |
| Home | Cards Estúdio + atividade |
| Wizards | Editor de Vídeo + Gerador de Cortes (proto completo) |
| Marketplace | Listagem, detalhe, resgate → Biblioteca |
| Library | Itens owned; filtros por tipo |
| Projects | Lista + empty states |
| Files | Browser pastas + upload simulado |
| Settings | Substitui brand — contexto editável local |
| i18n | Copy video-first; sem "Cérebro da Marca" |
| E2E | Playwright smoke rotas |

**Remover/deprecar UI:** `/dashboard/brand`, `/dashboard/pecas`, copy MEI.

---

## Plano 3 — Backend + SDK + Integração

> Spec: [`docs/plans/blister-os/03-backend.md`](plans/blister-os/03-backend.md)

| Fase | Entregável |
|------|------------|
| 3.1 Workspace | PersonalSpace, CompanyMember, 5 roles |
| 3.2 Settings | WorkspaceSettings API; migra BrandProfile |
| 3.3 Files | Folders, upload, extract → RAG |
| 3.4 Marketplace | Items, redeem, library |
| 3.5 Projects | CRUD workspace projects |
| 3.6 SDK | Monolith agents: `research`, `cuts`, `video_editor` + marketplace |
| 3.7 Integração | Trocar fixtures por TanStack Query hooks |

Contrato frontend: seção **Contrato com o Frontend** no Plano 3.

---

## Legado já no código (não expandir)

| Item | Status |
|------|--------|
| Auth, credits, storage, ai-catalog | Mantém — adaptar escopo workspace |
| company/brand modules | Migra → workspace (Plano 3) |
| PipelineOrchestrator | **Nunca** implementar |
| ContentPiece hub / `/pecas` | Legado — novos fluxos AgentRun |
| Agentes strategist/copywriter/designer/post | Deprecated |

---

## Fase pós-MVP OS

| Item | Dependência |
|------|-------------|
| Recarga Stripe | Plano 3 credits estável |
| Integrações YouTube/Drive | Files + RAG |
| Agent `distribution` | Marketplace + channels |
| Equipe avançada | 5 roles estável |
| Publicação direct | Fase 3 produto |

---

## Referências

- Estado código: [`docs/project/current-state.md`](project/current-state.md)
- ADR: [`docs/decisions/2026-06-12-blister-os-pivot.md`](decisions/2026-06-12-blister-os-pivot.md)
- Design: [`docs/design-system/blister-os-reference.md`](design-system/blister-os-reference.md)

**Descartado deste roadmap:** pipeline MEI, Sprint 4 orchestrator, módulo peças, Cérebro da Marca, narrativa MEI TTFC post PNG.
