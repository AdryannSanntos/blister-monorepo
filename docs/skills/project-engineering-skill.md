# Project Engineering Skill — Blister

> Fonte de verdade: [`docs/prd/blister-master-prd.md`](../prd/blister-master-prd.md) · [`CLAUDE.md`](../../CLAUDE.md)

## Objetivo

Skill base para qualquer tarefa neste monorepo. Estabelece regras de produto, arquitetura, permissões e implementação.

## Entendimento do Projeto

- **Blister** é marketing com IA para MEIs, pequenos negócios e autônomos no Brasil.
- O usuário descreve o que precisa (*"post sobre lançamento do bolo de cenoura"*) e recebe pacote completo: imagem PNG, legenda e hashtags — com identidade da marca.
- Moat: **Cérebro da Marca** + **RAG** + **auto-melhoramento** por feedback (sem fine-tuning no MVP).
- Estado atual: auth/RBAC/platform admin implementados; domínio Blister IA (empresa, campanhas, agentes, RAG, créditos) a implementar.

## Estrutura

```
apps/web          Next.js 16 + React 19
apps/api          NestJS 11 + Prisma + pgvector + CASL
packages/authz    permissões, roles e ability CASL
packages/types    schemas/tipos Zod compartilhados
packages/configs  presets TypeScript
```

## Regras Invioláveis

- Toda mutação ou leitura sensível no backend precisa de `@RequirePermission(key)`.
- Toda ação de escrita/exclusão ou dado restrito no frontend precisa de `PermissionGate` ou `useAbility()`.
- `userId` vem sempre de `req.currentUser.id`, nunca do body.
- IDs de recurso vêm de `req.params`, nunca do body.
- Endpoints públicos precisam de `@Public()` explícito.
- Nova permissão nasce em `packages/authz` antes de ser usada.
- Prisma é o único cliente de banco.
- `better-auth` trata apenas auth/sessão.
- Roles de sistema `owner`, `admin`, `member` são imutáveis.
- 1 company per user in MVP (`companyId`).

## Regras de codificação

| Área | Regra |
|------|-------|
| Validação | **Zod sempre** — backend, frontend, `packages/types`, outputs de IA |
| Servidor (web) | **TanStack Query** via hooks de domínio |
| Formulários | **RHF + zodResolver** sempre |
| URL state | **nuqs** para filtros, tabs, paginação |
| Componentes | `core/modules/<modulo>/components/` ou `core/shared/` |
| Renderização | Server Components por padrão; Server Actions quando couber |
| Estado global UI | **zustand** quando necessário |
| UX | **Playwright** para fluxos críticos e regressão |

## Agentes e RAG (MVP)

- 3 agentes plugáveis: Estrategista, Copywriter, Designer (`apps/api/src/agents/<nome>/`).
- Workflow multi-step por agente na mesma `AgentRun` (pause/resume/fail).
- RAG dedicado em `apps/api/src/rag/`: estruturado → pgvector → rerank.
- Campanhas opcionais — enriquecem contexto quando existem.
- HTML→PNG via Satori no MVP.
- Créditos: US$ 20 free tier único por empresa; bloqueio sem saldo.

## Produto e Linguagem

- Marca: **Blister**
- Termos UI: Criar post, Campanha, Cérebro da Marca, Peça, Créditos, Aprovar
- **Não** expor jargão de IA ao usuário (agente, prompt, LLM)
- Simplicidade radical: máx. 2 campos para campanha; 1 frase para gerar post

## Stack

### Frontend
- Next.js 16, React 19, App Router — **Server Components por padrão**
- Tailwind CSS v4, shadcn/ui, **RHF + Zod**, **TanStack Query/Table**, **nuqs**, **zustand**, **Playwright**
- next-themes (light default)

### Backend
- NestJS 11, Prisma + PostgreSQL + pgvector
- better-auth, CASL, Zod, Resend
- S3-compatível para assets gerados

## Ordem de leitura

1. `CLAUDE.md`
2. `docs/prd/blister-master-prd.md`
3. Skill específica da tarefa (frontend, backend, agents, design-system)
4. `docs/project/architecture.md`

## Legado

`docs/archive/` e `docs/superpowers/` = Workana AI / TikTok Shop — referência histórica apenas.
