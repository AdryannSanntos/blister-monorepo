# Plano 1 — Correção do projeto + Docs + Arquivos

> **Pré-requisito:** nenhum  
> **Próximo:** [02 Frontend](./02-frontend.md)  
> **Regras:** [00-execution-rules.md](./00-execution-rules.md)

## Objetivo

Alinhar **todo o repositório conceitualmente** ao Blister OS antes de código de produto. Nenhuma divergência entre PRD, skills, regras Cursor e planos 02/03.

**Não inclui:** implementação de telas (Plano 2) nem APIs/agentes (Plano 3). Pode incluir **ajustes mínimos** no proto HTML e movimentação/arquivamento de arquivos.

**Nota para o Plano 2:** documentar que a UI será construída **sem integração** — dados fake funcionais até o Plano 3 (ver [00-execution-rules](./00-execution-rules.md)).

---

## Escopo

| Inclui | Não inclui |
|--------|------------|
| PRD, ADR, docs vivos, ROADMAP | Schema Prisma |
| Skills + `.claude/commands` | Módulos NestJS novos |
| Regras `.cursor/rules` | Componentes React de feature |
| Arquivar legado Workana/MEI | Agent SDK refactor |
| `blister-os-reference.md` + atualizar HTML proto | E2E de telas novas |

---

## Fase 1.1 — PRD e decisões

### Criar

- [`docs/prd/blister-os-prd.md`](../../prd/blister-os-prd.md) — visão Blister OS completa (user-first, video-first, marketplace, settings, files, créditos)
- [`docs/decisions/2026-06-12-blister-os-pivot.md`](../../decisions/2026-06-12-blister-os-pivot.md) — mantém vs muda vs depreca
- [`docs/marketplace/README.md`](../../marketplace/README.md)
- [`docs/project/workspace-context.md`](../../project/workspace-context.md) — Settings + Files + extract
- [`docs/prd/modules/workspace-settings.md`](../../prd/modules/workspace-settings.md) — substitui brand-brain
- [`docs/prd/modules/files.md`](../../prd/modules/files.md)

### Marcar legado

- [`docs/prd/blister-master-prd.md`](../../prd/blister-master-prd.md) — banner → `blister-os-prd.md`
- [`docs/prd/modules/brand-brain.md`](../../prd/modules/brand-brain.md) — deprecated

---

## Fase 1.2 — Docs vivos

| Arquivo | Ação |
|---------|------|
| [`CLAUDE.md`](../../../CLAUDE.md) | Blister OS, ordem planos 01→02→03, linguagem UI |
| [`docs/project/current-state.md`](../../project/current-state.md) | Snapshot pós-pivot + gaps |
| [`docs/project/vision.md`](../../project/vision.md) | SO de conteúdo, operação contínua |
| [`docs/project/user-flows.md`](../../project/user-flows.md) | Jornadas alinhadas ao reference |
| [`docs/project/authorization.md`](../../project/authorization.md) | Espaço Pessoal + 5 roles/empresa |
| [`docs/project/architecture.md`](../../project/architecture.md) | User-first + SDK boundary |
| [`docs/ROADMAP.md`](../../ROADMAP.md) | Reescrever; referenciar `docs/plans/blister-os/` |
| [`docs/README.md`](../../README.md) | Hierarquia: PRD OS → execution-rules → planos |
| [`docs/agents/README.md`](../../agents/README.md) | 3 default + marketplace |
| [`docs/agents/workflow-engine.md`](../../agents/workflow-engine.md) | Kernel no SDK |

### Specs de agentes (`docs/agents/`)

| Pasta | Tier |
|-------|------|
| `research/`, `cuts/`, `video-editor/` | default |
| `planning/`, `script/`, `thumbnail/` | marketplace |
| `distribution/` | marketplace (fase posterior) |
| `strategist/`, `copywriter/`, `designer/`, `post/` | banner deprecated |

---

## Fase 1.3 — Design reference

### Criar

- [`docs/design-system/blister-os-reference.md`](../../design-system/blister-os-reference.md)
  - Inventário de telas (`data-screen-label` do HTML)
  - Mapa `#/route` → Next.js
  - Lista de componentes (`PageHeader`, `StatCard`, `StyleThumb`, `BlisterStepper`, …)
  - Sidebar `NAV` groups

### Atualizar proto

- [`blister-os-reference.html`](../../../blister-os-reference.html)
  - Adicionar `research` no grupo Estúdio (ou Início)
  - Evoluir `#/uploads` → file browser com pastas (breadcrumb, grid/list)
  - Alinhar IDs: `video_editor`, `cuts`, `planning`, `script` nos dados mock
  - Remover referências soltas a "Cérebro da Marca" fora de Settings card

---

## Fase 1.4 — Skills e mirrors IA

Reescrever [`docs/skills/`](../../skills/):

| Skill | Foco Plano 1 |
|-------|----------------|
| `project-engineering-skill.md` | Blister OS + link planos blister-os |
| `frontend-skill.md` | Reference HTML + Plano 2; **zero integração**, dados fake funcionais |
| `backend-skill.md` | SDK monolith + Plano 3 |
| `agents-skill.md` | Agentes no SDK apenas |
| `design-system-skill.md` | Reference → Tailwind/shadcn |
| `code-review-skill.md` | Checklist alinhado OS |

Espelhar: [`.claude/commands/context.md`](../../../.claude/commands/context.md), [`.opencode/agents/context.md`](../../../.opencode/agents/context.md)

Atualizar: [`docs/skills/README.md`](../../skills/README.md), [`docs/project/dev-skills.md`](../../project/dev-skills.md)

---

## Fase 1.5 — Regras Cursor

| Arquivo | Conteúdo |
|---------|----------|
| [`.cursor/rules/blister-os-product.mdc`](../../../.cursor/rules/blister-os-product.mdc) | Reference obrigatório; sem Brain; video-first; Plano 2 sem API |
| [`.cursor/rules/agent-sdk-monolith.mdc`](../../../.cursor/rules/agent-sdk-monolith.mdc) | Agentes só no SDK |

Manter: `english-code-only.mdc`, `typography-components.mdc`

---

## Fase 1.6 — Arquivar legado

| Arquivo | Ação |
|---------|------|
| `docs/decisions/mvp-features.md` | → `docs/archive/` |
| `docs/decisions/sidebar-flows.md` | reescrever ou arquivar |
| `docs/design-system/usage-rules.md` | remover "Workana AI" |
| Confirmar banner em `docs/superpowers/`, `docs/archive/` |

### Código — apenas documentar deprecação (implementar remoção no 02/03)

- `apps/web/.../brand/` → remover no Plano 2
- Rotas `/dashboard/pecas`, copy MEI/post → Plano 2 i18n
- `docs/ROADMAP.md` pipeline orchestrator → removido neste plano

---

## Fase 1.7 — Índice de planos

- Este diretório [`docs/plans/blister-os/`](./README.md) como entrada em `docs/README.md`
- Atualizar [`.cursor/plans/blister_os_migration_e0a9114a.plan.md`](../../../.cursor/plans/blister_os_migration_e0a9114a.plan.md) → redirect para README blister-os

---

## Checklist de conclusão (Plano 1)

- [ ] `blister-os-prd.md` é fonte #1 em CLAUDE.md
- [ ] ADR 2026-06-12 publicado
- [ ] 6 skills + mirrors alinhados
- [ ] `blister-os-reference.md` + HTML proto atualizado
- [ ] ROADMAP sem pipeline/pecas/MEI
- [ ] Regras `blister-os-product` + `agent-sdk-monolith` criadas
- [ ] `workspace-context.md` + `marketplace/README.md` existem
- [ ] Nenhum doc "vivo" promete Cérebro da Marca como módulo separado

---

## Entregáveis para o Plano 2

O Plano 2 pode começar quando existir:

1. Mapa de rotas em `blister-os-reference.md`
2. Copy e estrutura NAV no HTML proto
3. PRD com Settings, Files, Marketplace, agentes default/marketplace
4. i18n keys documentadas (lista em `02-frontend.md` apêndice)
