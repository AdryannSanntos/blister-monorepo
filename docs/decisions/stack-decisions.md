# Decisões de Stack — Blister

## Monorepo

- `apps/web`: Next.js 16, React 19, App Router
- `apps/api`: NestJS 11, Prisma, CASL, agentes, RAG, créditos
- `packages/authz`, `types`, `configs`

## Ferramentas

- pnpm + Turborepo + Biome + TypeScript strict
- Prisma client em `apps/api/src/generated/prisma` — nunca editar manualmente

## Frontend

Tailwind v4, shadcn/ui, RHF+Zod, TanStack Query/Table, **nuqs**, **zustand**, **Playwright**, axios, next-themes (light default), `tw-animate-css`

### Padrões frontend obrigatórios

- **Server Components** por padrão; client só quando necessário
- **TanStack Query** para todo estado de servidor
- **nuqs** para filtros, tabs e paginação na URL
- **RHF + Zod** em todo formulário
- Componentes de feature em `core/modules/<modulo>/components/`
- **Playwright** para validação de UX em fluxos críticos

## Backend

- NestJS + Prisma + PostgreSQL + **pgvector**
- better-auth (auth/sessão only)
- CASL via `packages/authz`
- **Zod sempre** — DTOs, query, params, outputs de IA
- `@aws-sdk/client-s3` storage
- **Satori** HTML→PNG (MVP); Puppeteer reserva Fase 2

## IA

- Adapters: OpenAI, Anthropic, OpenRouter, Gemini (via `ai-catalog/`)
- Embeddings + rerank configuráveis pelo admin
- Agentes: pasta plugável + workflow engine
- RAG: domínio dedicado `rag/`
- Learning: RAG + AgentMemory — sem fine-tuning MVP

## Governança

- Produto: **Blister** — marketing IA para MEIs
- 1 negócio por usuário (MVP)
- Toda ação com permissão explícita
- Admin configura créditos, modelos, pipelines — nada hardcoded

## Estado atual

Implementado: auth, RBAC, platform admin shell, dashboard shell.

Pendente: marca, campanhas, agentes, RAG, créditos, geração.

Ver [`docs/project/current-state.md`](../project/current-state.md).
