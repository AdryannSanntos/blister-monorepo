# Auth, Organizacoes e Onboarding Foundation Implementation Plan

> **Para agentes de implementacao:** usar uma execucao orientada por tarefas pequenas, validando docs e arquitetura a cada etapa. Este plano descreve a migracao de `better-auth` para auth-only e a construcao do dominio proprio de organizacoes, autorizacao e onboarding.

**Goal:** entregar a base completa de entrada no produto com `login`, `cadastro`, `esqueci a senha`, `convites`, `organizacao ativa`, `roles/permissoes` por empresa e `onboarding` com publicacao inicial do Company Brain.

**Architecture:** `better-auth` cuida apenas de identidade e sessao. `Prisma` modela organizacoes, memberships, convites, roles, permissoes, overrides e onboarding. `CASL` monta a ability final por empresa ativa. `Resend` envia os emails transacionais de auth e convite.

**Tech Stack:** `Next.js 16`, `NestJS 11`, `Prisma`, `better-auth`, `CASL`, `Resend`, `react-hook-form`, `Zod`, `TanStack Query`, `shadcn`.

---

## Escopo

1. Desacoplar organizacoes do `better-auth`.
2. Criar o dominio proprio de empresa ativa, memberships, roles e convites.
3. Refatorar `packages/authz` para depender apenas de `CASL` e do catalogo do produto.
4. Implementar convites com `Resend`.
5. Implementar onboarding inicial com rascunho, retomada e publicacao.
6. Atualizar docs e skills do projeto para refletir a nova arquitetura.

## Decisoes Fechadas

- `better-auth` e auth-only.
- organizacao ativa pertence ao dominio da aplicacao.
- organizacoes, cargos, permissoes, convites e membership usam `Prisma`.
- autorizacao usa `CASL` por empresa ativa.
- toda empresa nasce com `owner`, `admin` e `member`.
- a empresa pode criar novas roles.
- um membro pode ter multiplas roles na mesma empresa.
- overrides por usuario suportam `allow` e `deny`.
- somente `owner` publica o onboarding inicial.
- convite para usuario sem conta segue `aceitar convite -> criar conta -> entrar na empresa`.
- emails transacionais usam `Resend`.

## Epicos

### Epico 1: Refatoracao da Fundacao de Auth

**Objetivo:** reduzir `better-auth` a identidade, sessao, verificacao de email e reset de senha.

**Entregas:**

- remover plugin de organizacao da API
- remover `organizationClient()` do frontend
- manter `signUp`, `signIn`, `signOut`, `emailVerification`, `forgotPassword`, `resetPassword`
- integrar `Resend` para verificação e reset

**Critério de pronto:** nenhum fluxo de organizacao depende mais do plugin de organizacao do `better-auth`.

### Epico 2: Dominio de Organizacoes e Autorizacao

**Objetivo:** criar a modelagem propria de workspace multiempresa.

**Entregas:**

- modelar `Organization`
- modelar `Membership`
- modelar `Role`
- modelar `RolePermission`
- modelar `MembershipRole`
- modelar `MembershipPermissionOverride`
- modelar `Invitation`
- modelar persistencia da organizacao ativa

**Critério de pronto:** empresa ativa, cargos e permissões já podem ser resolvidos sem `better-auth`.

### Epico 3: Refactor de `packages/authz`

**Objetivo:** tornar `packages/authz` a fonte real de policies compartilhadas.

**Entregas:**

- remover dependencia de helpers de organizacao do `better-auth`
- manter catalogo central de permissoes
- definir presets padrao de `owner`, `admin` e `member`
- criar builder de ability baseado em `roles + overrides`

**Critério de pronto:** backend e frontend compartilham a mesma semantica de permissao sem dependencia do ecossistema de roles do `better-auth`.

### Epico 4: Convites e Entrada por Empresa

**Objetivo:** suportar entrada por convite, criacao de workspace e selecao de empresa ativa.

**Entregas:**

- criar workspace
- aceitar convite
- listar convites pendentes
- listar empresas do usuario
- selecionar empresa ativa
- enviar convite por `Resend`

**Critério de pronto:** usuario com ou sem conta entra na empresa correta e cai no contexto certo.

### Epico 5: Onboarding Inicial e Publicacao do Contexto

**Objetivo:** capturar o contexto da empresa e publicar a primeira versao oficial do Company Brain.

**Entregas:**

- wizard em etapas curtas
- salvamento parcial por empresa
- retomada do onboarding
- revisao final
- publicacao por `owner`

**Critério de pronto:** dashboard so fica acessivel depois da publicacao inicial.

## Ordem Recomendada de Execucao

1. refatorar auth para auth-only
2. refatorar schema Prisma para o dominio proprio de organizacoes
3. refatorar `packages/authz`
4. integrar `Resend`
5. implementar APIs de organizacao ativa, workspace, memberships e convites
6. implementar fluxos web de auth
7. implementar fluxo de workspace e convite
8. implementar onboarding com publicacao
9. fechar guards e redirecionamentos do primeiro acesso
10. revisar e atualizar docs/skills

## Criterios de Aceite

- o usuario consegue criar conta e verificar email
- o usuario consegue pedir reset de senha e redefinir acesso
- o usuario sem empresa consegue criar workspace
- toda empresa nova nasce com `owner`, `admin` e `member`
- o usuario pode receber convite por email via `Resend`
- o usuario sem conta consegue entrar via convite e criar conta no fluxo
- o usuario com varias empresas consegue definir empresa ativa
- um membro pode ter multiplas roles por empresa
- overrides `allow` e `deny` afetam a ability final
- somente `owner` publica o Company Brain inicial
- o sistema redireciona corretamente para auth, workspace, convite, seletor de empresa, onboarding ou dashboard

## Documentacao Obrigatoria na Execucao

Cada etapa deve manter consistencia com:

- `docs/decisions/stack-decisions.md`
- `docs/context/2026-05-13-monorepo-foundation-design.md`
- `docs/prd/product-context-summary.md`
- `docs/prd/ai-company-os-prd.md`
- `docs/prd/prd-gap-analysis.md`
- `docs/decisions/execution-order.md`
- `docs/skills/project-engineering-skill.md`
- `docs/skills/backend-skill.md`
- `docs/skills/frontend-skill.md`
- `docs/skills/code-review-skill.md`
