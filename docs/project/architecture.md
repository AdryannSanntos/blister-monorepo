# Arquitetura — Blister

## Monorepo

```
apps/
  web/    Next.js 16 + React 19 — frontend
  api/    NestJS 11 — API REST, auth, Prisma, CASL, agentes, RAG
packages/
  authz/   Permissões CASL
  types/   Zod compartilhado
  configs/ TypeScript presets
```

pnpm workspaces + Turbo. Biome para lint/format.

## Stack

**Frontend:** Next.js 16, React 19, Tailwind v4, shadcn/ui, **RHF+Zod**, **TanStack Query/Table**, **nuqs**, **zustand**, **Playwright**, axios, next-themes (light default)

**Backend:** NestJS 11, Prisma + PostgreSQL + **pgvector**, better-auth, CASL, **Zod (sempre)**, Resend, S3-compatible storage

**IA:** AI runtime (adapters OpenAI/Anthropic/OpenRouter/Gemini), **Satori** HTML→PNG, embedding + rerank configuráveis

## Backend — domínios alvo (MVP)

```
apps/api/src/
  auth/ users/ platform/ audit/ email/ prisma/     ← existem hoje
  company/ brand/          ← Cérebro da Marca ✅
  campaigns/               ← campanhas + arquivos (pendente)
  agents/                  ← registry, runtime (isolado), strategist, copywriter, designer…
  rag/                     ← ingestion, indexing, retrieval
  credits/ ai-catalog/     ← créditos + catálogo IA
  storage/                 ← S3 presigned
```

Detalhe RAG: [`rag-architecture.md`](rag-architecture.md)  
Detalhe agentes: [`../agents/README.md`](../agents/README.md)

## Frontend — rotas alvo

```
/dashboard              ← home
/dashboard/brand        ← Cérebro da Marca ✅
/dashboard/campanhas    ← listagem (pendente)
/dashboard/campanhas/[id] ← workspace por agente (pendente)
/workspaces/admin       ← platform admin ✅
/auth/*                 ← login, signup, etc.
```

## Padrões de codificação

Ver `CLAUDE.md` Regra 17. Resumo:

| Camada | Obrigatório |
|--------|-------------|
| Validação | Zod em toda fronteira |
| Web — servidor | TanStack Query via hooks |
| Web — forms | RHF + zodResolver |
| Web — URL | nuqs (filtros, tabs, paginação) |
| Web — UI | Server Components por padrão; componentes em `core/modules/<modulo>/components/` |
| Web — global | zustand quando necessário |
| Qualidade | Playwright para UX crítica |

## Auth e sessão

- better-auth: apenas auth/sessão
- `AuthGuard` global; `@Public()` explícito para endpoints públicos
- `userId` de `req.currentUser.id` — nunca do body
- `userType` alvo: `NEGOCIO | ADMIN | USER` (migrar enum)

## Fluxo de execução de agente (isolado)

```
POST /api/agents/:agentId/run
  → AuthGuard → CreditsCheck → AgentRun (QUEUED)
  → Trigger agent-run-execute
  → WorkflowEngine (steps do agente) + RAG context pack
  → outputPayload → Revisão na run → Learning → RAG (AGENT_LEARNING)
```

Sem `PipelineOrchestrator`. Ver [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md).

## Request autenticado

```
Browser → AuthGuard → PermissionGuard → Controller → Service → Prisma
                                              ↓
                                         AuditLog (mutações críticas)
```

## Proxy

`apps/web/src/proxy.ts`: `/dashboard/*` exige sessão; `/auth/*` redireciona se logado.

Ver também: [`current-state.md`](current-state.md) para gap código vs alvo.
