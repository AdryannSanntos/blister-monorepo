# Project Engineering Skill

## Objetivo

Skill base para qualquer tarefa neste monorepo. Estabelece as regras fundamentais que se aplicam a toda implementação, refatoração ou análise técnica.

## Quando Usar

- Qualquer tarefa de código
- Qualquer refactor
- Qualquer análise técnica
- Qualquer nova feature

## Entendimento do Projeto

- **AI Company OS** — plataforma SaaS multiempresa de automação inteligente
- **Fase atual:** fundação técnica implementada (auth, organizações, authz); Company Brain, Skills e Outputs ainda não persistidos
- O produto opera em ciclo: Company Brain → Skills → Outputs → Aprovações → Conteúdo → Automações

## Estrutura do Monorepo

```
apps/web     Next.js 16, React 19 — frontend principal
apps/api     NestJS 11 — API REST, auth, Prisma, CASL
packages/authz   catálogo de permissões, roles e mapa CASL
packages/types   schemas e tipos Zod compartilhados
packages/configs presets TypeScript
```

## Regra de Permissão Universal (inviolável)

**Toda ação do produto deve ter verificação de permissão — sem exceção.**

- **Backend:** todo endpoint de mutação ou dado sensível deve ter `@RequirePermission(key)` com chave válida de `AppPermissionKey`
- **Frontend:** toda UI com ação de escrita, exclusão ou dado restrito deve ter `<PermissionGate permission="key">` ou verificação via `useAbility()`
- Nenhuma feature nasce sem guards e checks de UI — são parte da definição de pronto de cada task

## Regras Invioláveis

- `userId` vem **sempre** de `req.currentUser.id` — nunca do body
- `orgId` vem de `req.params` — nunca do body
- Novos endpoints sem `@Public()` são bloqueados pelo `AuthGuard` automaticamente
- Nova permissão nasce em `packages/authz` antes de ser usada em qualquer lugar
- `Prisma` é o único cliente de banco — nunca editar `src/generated/prisma` manualmente
- `better-auth` trata apenas auth/sessão — org/membership/roles são domínio próprio
- Roles de sistema (`owner`, `admin`, `member`) são imutáveis

## Regras de Tooling

- `pnpm` — package manager oficial
- `Turborepo` — coordena dev/build/lint/typecheck
- `Biome` — formatter e linter oficial
- `TypeScript strict: true` — sem afrouxar

## Stack por domínio

### Frontend
- `Next.js 16` App Router · `React 19`
- `Tailwind CSS v4` com tokens em `globals.css`
- `shadcn/ui` em `apps/web/src/core/shared/components/ui/`
- `react-hook-form` + `Zod` — formulários
- `@tanstack/react-query` — estado de servidor
- `@tanstack/react-table` — tabelas operacionais
- `Recharts` — gráficos
- `nuqs` — estado de URL
- `zustand` — estado local (último recurso)
- `axios` — cliente HTTP
- `lucide-react` — ícones

### Backend
- `NestJS 11` — HTTP, módulos, DI
- `Prisma` — banco (único permitido)
- `better-auth` — auth e sessão apenas
- `CASL` via `packages/authz` — autorização
- `Zod` — validação de DTOs
- `Resend` — emails transacionais

### Autorização
- Catálogo em `packages/authz/src/index.ts`
- Compartilhado entre frontend e backend
- Motor: `@casl/ability`

## Estrutura Frontend (core/modules vs core/shared)

```
core/modules/<dominio>/
  pages/        componentes de página
  components/   componentes do módulo
  hooks/        hooks de domínio com React Query

core/shared/
  components/ui/    componentes shadcn
  components/       componentes genéricos (PermissionGate, etc.)
  utils/            api-client, auth-client, query-client
```

## Fluxo de Pensamento Recomendado

1. Identificar se a tarefa é web, api, pacote compartilhado ou revisão
2. Carregar skill específica da área (backend, frontend, authz, design)
3. Aplicar a biblioteca oficial do problema
4. Implementar a menor mudança correta
5. Verificar regra de permissão universal
6. Validar coerência com PRD, stack, design system e estrutura atual

## O Que Ainda Não É Padrão Implementado

- `Trigger.dev` ou `Inngest` — não adotados, não assumir disponíveis
- `socket.io` — aprovado para realtime, ainda não implementado
- `@aws-sdk/client-s3` — aprovado para storage, ainda não implementado
- Company Brain, Skill e Output — não persistidos ainda
