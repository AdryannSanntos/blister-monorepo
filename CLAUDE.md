# AI Company OS — Monorepo

## O que é este projeto

AI Company OS é uma plataforma SaaS multiempresa que transforma o contexto e os processos de uma empresa em automações inteligentes. O produto opera em ciclo de geração supervisionada: captura o contexto da empresa (Company Brain), executa Skills de geração com IA, produz Outputs revisados e aprovados, e expande para conteúdo, páginas, automações e integrações.

**Fase atual:** Fundação técnica. Auth, organizações, membership, roles e permissões estão implementados. Company Brain, Skills e Outputs ainda não foram persistidos.

---

## Estrutura do monorepo

```
apps/
  web/    Next.js 16 + React 19 — frontend principal
  api/    NestJS 11 — API REST, auth, Prisma, CASL
packages/
  authz/  Catálogo de permissões CASL, roles padrão, mapa de permissões
  types/  Schemas e tipos Zod compartilhados
  configs/ Presets TypeScript compartilhados
```

---

## Regras invioláveis

Estas regras se aplicam sem exceção a toda tarefa de código neste repositório.

### 1. Toda ação tem permissão

**Backend:** todo endpoint de mutação ou dado sensível deve ter `@RequirePermission(key)`.
**Frontend:** toda UI com ação de escrita, exclusão ou dado restrito deve ter `<PermissionGate permission="key">` ou verificação via `useAbility()`.

Não existe entrega de feature sem guards e checks de UI implementados.

### 2. userId nunca vem do body

`userId` vem **sempre** de `req.currentUser.id` (injetado pelo `AuthGuard`).
`orgId` vem de `req.params` — nunca do body.

### 3. Novos endpoints com guard ou @Public explícito

`AuthGuard` é global. Sem `@Public()`, todo endpoint requer autenticação automaticamente.
Endpoints intencionalmente públicos devem ter `@Public()` explícito — nunca depender de ausência de guard.

### 4. Nova permissão: packages/authz primeiro

Fluxo obrigatório:
1. Declarar em `packages/authz/src/index.ts` (`AppPermissionKey` + `permissionMap` + `getDefaultRolePermissions`)
2. Rodar seed de roles padrão
3. Usar `@RequirePermission('nova.chave')` no controller
4. Usar `<PermissionGate permission="nova.chave">` no frontend

### 5. Prisma é o único cliente de banco

Sem SQL raw avulso, sem outro ORM, sem acesso direto fora do `PrismaService`.
Nunca editar `apps/api/src/generated/prisma` manualmente.

### 6. better-auth trata apenas auth e sessão

`better-auth` cuida de: login, signup, verificação de email, reset de senha, sessão.
Organização ativa, convites, memberships, roles e permissões pertencem ao domínio da aplicação.
`useActiveOrganization()` — nunca assumir org a partir da sessão better-auth.

### 7. Roles de sistema são imutáveis

`owner`, `admin` e `member` não podem ser renomeados nem deletados.
Não é possível remover o último owner de uma organização.
Um membro pode ter múltiplas roles simultâneas.

---

## Skills disponíveis

Use `/backend`, `/frontend`, `/authz`, `/review` ou `/design` durante a sessão para carregar o contexto completo de cada área. Equivalentes como skills invocáveis: `company-os-backend`, `company-os-frontend`, `company-os-authz`, `company-os-review`, `company-os-design`.

| Slash Command | Skill | Quando usar |
|---------------|-------|-------------|
| `/backend` | company-os-backend | Trabalhar em apps/api — módulos NestJS, Prisma, guards, DTOs |
| `/frontend` | company-os-frontend | Trabalhar em apps/web — páginas, hooks, formulários, tabelas |
| `/authz` | company-os-authz | Implementar ou depurar permissões, roles e autorização |
| `/review` | company-os-review | Revisar código antes de entregar ou mergear |
| `/design` | company-os-design | Implementar ou revisar UI, tokens, componentes do design system |

---

## Stack resumida por domínio

### Tooling
- `pnpm` — package manager
- `Turborepo` — coordena dev/build/lint/typecheck
- `Biome` — formatter e linter
- `TypeScript strict` — padrão do monorepo

### Frontend (apps/web)
- Next.js 16, React 19, App Router
- Tailwind CSS v4 com tokens em `globals.css`
- shadcn/ui (style new-york, base radix) em `core/shared/components/ui/`
- react-hook-form + Zod (formulários)
- @tanstack/react-query (estado de servidor)
- @tanstack/react-table (tabelas operacionais)
- Recharts + ChartContainer (gráficos)
- nuqs (estado de URL/filtros)
- zustand (estado local de cliente, último recurso)
- axios (cliente HTTP)
- lucide-react (ícones)
- next-themes dark-default

### Backend (apps/api)
- NestJS 11 (HTTP, módulos, DI)
- Prisma (banco — único cliente permitido)
- better-auth (auth e sessão apenas)
- CASL via packages/authz (autorização)
- Zod (validação de DTOs)
- Resend (emails transacionais)
- socket.io (realtime, futuro)
- @aws-sdk/client-s3 (storage S3-compatible, futuro)

### Autorização (packages/authz)
- CASL @casl/ability
- AppPermissionKey: 19 chaves declaradas
- Roles padrão: owner (tudo), admin (sem delete/roles/onboarding.publish), member (read + skill)
- PermissionOverride: allow/deny por membro individual

---

## Catálogo de permissões atual

`company.read/update/delete` · `member.read/invite/update/remove` · `role.read/create/update/delete` · `permission.read` · `onboarding.publish` · `brain.read/update` · `skill.read/execute` · `output.read/review`

---

## Ordem de execução do produto (fases)

1. Auth (login/signup/email)
2. Seleção/criação de organização ativa
3. Onboarding de contexto da empresa
4. Publicação do Company Brain inicial (só owner)
5. Dashboard operacional
6. Caixa de entrada
7. Company Brain editável
8. Skills → Execução → Outputs
9. Aprovações e revisão
10. Content Studio, visuais, páginas, campanhas
11. Automações (após núcleo estável)
12. Integrações externas

**Estado atual:** Fases 1-2 implementadas. Fase 3 em progresso.
