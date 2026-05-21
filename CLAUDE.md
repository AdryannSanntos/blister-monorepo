# Workana AI — Monorepo

## O que é este projeto

Workana AI é uma camada de inteligência para empresas que contratam, coordenam e escalam trabalho com freelancers, fornecedores e times remotos. O produto organiza contexto, briefings, demandas, agentes de IA, créditos, equipe, permissões e integrações dentro de um workspace por empresa.

**Fase atual:** fundação técnica implementada. Auth, organizações, memberships, roles, permissões, convites, onboarding inicial, dashboard shell, assets e tela base de integrações existem. Brain persistido, agentes, créditos e histórico de execuções ainda precisam evoluir como domínios próprios.

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

### 1. Toda ação tem permissão

**Backend:** todo endpoint de mutação ou dado sensível deve ter `@RequirePermission(key)`.
**Frontend:** toda UI com ação de escrita, exclusão ou dado restrito deve ter `<PermissionGate permission="key">` ou verificação via `useAbility()`.

Não existe entrega de feature sem guards e checks de UI implementados.

### 2. userId nunca vem do body

`userId` vem sempre de `req.currentUser.id`.
`orgId` vem de `req.params` — nunca do body.

### 3. Novos endpoints com guard ou @Public explícito

`AuthGuard` é global. Sem `@Public()`, todo endpoint requer autenticação automaticamente.
Endpoints intencionalmente públicos devem ter `@Public()` explícito.

### 4. Nova permissão: packages/authz primeiro

1. Declarar em `packages/authz/src/index.ts` (`AppPermissionKey`, `allPermissionKeys`, `permissionMap`, roles padrão)
2. Rodar seed de roles padrão quando aplicável
3. Usar `@RequirePermission('nova.chave')` no controller
4. Usar `<PermissionGate permission="nova.chave">` no frontend

### 5. Prisma é o único cliente de banco

Sem SQL raw avulso, sem outro ORM, sem acesso direto fora do `PrismaService`.
Nunca editar `apps/api/src/generated/prisma` manualmente.

### 6. better-auth trata apenas auth e sessão

`better-auth` cuida de login, signup, verificação de email, reset de senha e sessão.
Organização ativa, convites, memberships, roles, permissões, créditos e brain pertencem ao domínio da aplicação.
`useActiveOrganization()` — nunca assumir org a partir da sessão better-auth.

### 7. Roles de sistema são imutáveis

`owner`, `admin` e `member` não podem ser renomeados nem deletados.
Não é possível remover o último owner de uma organização.
Um membro pode ter múltiplas roles simultâneas.

### 8. Dados em tabela por padrão

Coleções de entidades de dados (membros, roles, convites, permissões, execuções, créditos, logs, integrações, assets, agentes) devem ser renderizadas em tabela usando TanStack Table + shadcn `<Table>`.

Exceções aceitas: pickers, controles de formulário, onboarding, showcases visuais e cards com hierarquia visual intrínseca.

---

## Produto e linguagem

- Nome do produto: **Workana AI**
- Foco: empresas que coordenam trabalho com freelancers, fornecedores e times remotos
- Termos internos de UI: Workspace, Company, Brain, Agentes, Créditos, Integrações
- Evitar linguagem genérica de chatbot; o produto é operacional, B2B e orientado a execução
- A camada interna de IA nunca deve expor ranking, confiança, metadados ocultos ou contexto derivado sem decisão explícita

---

## Stack resumida

### Frontend
- Next.js 16, React 19, App Router
- Tailwind CSS v4 com tokens em `globals.css`
- shadcn/ui em `core/shared/components/ui/`
- react-hook-form + Zod
- TanStack Query e TanStack Table
- Recharts, nuqs, zustand, axios, lucide-react
- next-themes com light default e dark disponível

### Backend
- NestJS 11
- Prisma + PostgreSQL
- better-auth para auth/sessão
- CASL via `packages/authz`
- Zod para DTOs
- Resend para emails transacionais
- socket.io e S3-compatible previstos para evolução

---

## Catálogo de permissões atual

`company.read/update/delete` · `member.read/invite/update/remove` · `role.read/create/update/delete` · `permission.read` · `onboarding.publish` · `brain.read/update` · `asset.read/create/update/archive/context.review` · `skill.read/execute` · `integration.read` · `output.read/review`

---

## Ordem de execução do produto

1. Auth
2. Criação/seleção de workspace
3. Convites
4. Onboarding curto da empresa
5. Brain inicial
6. Dashboard operacional
7. Equipe, roles e permissões
8. Assets e fontes do brain
9. Créditos por empresa
10. Agentes default
11. Histórico de execuções
12. Integrações
13. Templates de briefing
14. Automações e analytics

**Estado atual:** Auth, workspace, convites, roles/permissões, onboarding draft, dashboard shell, assets e shell de integrações já existem. Brain persistido, créditos, agentes e histórico real ainda faltam.
