# Project Engineering Skill — Blister OS

> Fonte: [`docs/prd/blister-os-prd.md`](../prd/blister-os-prd.md) · [`CLAUDE.md`](../../CLAUDE.md) · [`docs/plans/blister-os/`](../plans/blister-os/)

## Objetivo

Skill base para qualquer tarefa neste monorepo pós-pivot OS.

## Produto

- **Blister OS** — SO de conteúdo video-first (creators, mentores, agências)
- Espaço Pessoal + Empresas (5 roles)
- Contexto: **Configurações + Arquivos** — sem módulo Brand Brain
- Marketplace + Biblioteca; Projetos como workspace
- Agentes default: `research`, `cuts`, `video_editor`

## Planos de execução

```
Plano 1 Docs → Plano 2 Frontend (zero API) → Plano 3 Backend
```

Regras: [`00-execution-rules.md`](../plans/blister-os/00-execution-rules.md)

## Estrutura

```
apps/web              Next.js 16 + React 19
apps/api              NestJS — HTTP + adapters only for agents
packages/agent-sdk    100% agent + workflow logic
packages/authz        CASL
packages/types        Zod shared
```

## Regras invioláveis

- `@RequirePermission` / `<PermissionGate>`
- `userId` de `req.currentUser.id`
- Nova permissão → `packages/authz` primeiro
- Prisma único cliente DB
- better-auth = sessão apenas
- Agentes isolados — sem pipeline
- SDK monolith — ver `.cursor/rules/agent-sdk-monolith.mdc`

## Codificação

Zod · TanStack Query · RHF · nuqs · Server Components · `core/modules/<feature>/` · zustand (UI) · Playwright

## Plano 2

Zero integração API de produto — fixtures funcionais.

## Ordem de leitura

1. `blister-os-prd.md`
2. `CLAUDE.md`
3. Plano ativo (01/02/03)
4. Skill de domínio

## Legado

`blister-master-prd.md`, Brand Brain, agentes strategist/copywriter/designer/post — **deprecated**. `docs/archive/` não é contrato.
