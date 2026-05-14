# Decisoes de Stack

## Estrutura do Monorepo

- `apps/web`: frontend principal com `Next.js 16` e App Router
- `apps/api`: API principal com `NestJS 11`, auth, Prisma e futuras integracoes de realtime e storage
- `packages/authz`: catalogo compartilhado de acoes, subjects, permissoes e papeis padrao
- `packages/types`: schemas e tipos compartilhados com `Zod`
- `packages/configs`: presets compartilhados de TypeScript

## Decisoes de Ferramentas de Base

- `pnpm` e o package manager oficial do workspace
- `Turborepo` coordena `dev`, `build`, `lint` e `typecheck`
- `Biome` substitui combinacoes paralelas de formatter e linter
- `TypeScript` com `strict: true` e o padrao do monorepo

## Decisoes de Frontend

- `Next.js 16` e a shell web oficial
- `React 19` e a base de interface
- `Tailwind CSS 4` e a camada de estilizacao atual
- `shadcn` com base `radix` e a fundacao oficial dos componentes de UI
- `react-hook-form` com `Zod` e a stack padrao para formularios
- `@tanstack/react-query` e dono do estado de servidor
- `@tanstack/react-table` deve ser usado apenas em tabelas de alta densidade
- `Recharts` e a biblioteca padrao para graficos
- `clsx`, `tailwind-merge` e `tailwind-variants` formam a stack de composicao de classes
- `nuqs` e a opcao padrao para estado compartilhavel na URL
- `zustand` e permitido apenas para estado local de cliente que nao pertence ao cache do servidor nem a URL
- `axios` e o cliente HTTP padrao para chamadas imperativas
- os componentes oficiais do frontend vivem em `apps/web/src/core/shared/components/ui`
- os tokens globais do frontend vivem em `apps/web/src/app/globals.css`

## Decisoes de Backend

- `NestJS` controla HTTP, composicao de modulos, bootstrap da aplicacao e futuras gateways
- `Prisma` e o unico cliente de banco permitido no repositorio
- `better-auth` e a fonte de verdade apenas de autenticacao, verificacao de email, reset de senha e sessao
- `Resend` e o servico padrao para emails transacionais do produto
- organizacao ativa, convites, memberships, roles e permissoes pertencem ao dominio da aplicacao
- `CASL` e o motor de autorizacao compartilhado
- `socket.io` sera o transporte padrao para realtime entre web e api
- `@aws-sdk/client-s3` e a camada aprovada para storage compativel com S3

## Decisoes de Dominio e Governanca

- autenticacao e autorizacao nao devem ser misturadas
- organizacao ativa nao deve depender do `better-auth`
- o catalogo de permissoes fica em codigo dentro de `packages/authz`
- toda empresa nasce com as roles `owner`, `admin` e `member`
- a empresa pode criar roles adicionais com permissoes a la carte
- um membro pode ter multiplas roles na mesma empresa
- overrides por usuario devem suportar `allow` e `deny`
- tipos e schemas reutilizados entre apps devem sair de `packages/types`
- componentes ou utilitarios compartilhados entre apps nao devem ser duplicados sem necessidade clara

## Regra de Permissao Universal

**Toda acao do produto deve ter verificacao de permissao** — sem excecao.

- **Backend:** todo endpoint de mutacao ou dado sensivel deve ter um `@RequirePermission(key)` guard NestJS que resolve a ability CASL do membro na organizacao ativa antes de processar o request
- **Frontend:** toda UI com acao de escrita, exclusao ou dado restrito deve checar `can(action, subject)` antes de renderizar o controle ou executar a mutacao
- Nenhuma feature nasce sem permissoes implementadas — guards e checks de UI sao parte da definicao de pronto de cada task

## Observacoes Importantes do Estado Atual

- `better-auth` esta montado em `apps/api/src/auth/register-better-auth.ts`
- a implementacao atual ainda usa o plugin de organizacao do `better-auth`, mas a decisao aprovada e migrar para um dominio proprio de organizacoes
- o schema atual do Prisma precisa evoluir para suportar roles por empresa, `MembershipRole`, `RolePermission`, overrides por usuario e persistencia da organizacao ativa
- o frontend ja registra um `QueryClientProvider` global
- o frontend segue a separacao `core/shared` e `core/modules`
- o frontend agora usa `shadcn` como base de UI e expoe referencia viva em `/design-system`
- o PRD menciona automacao com `Trigger.dev` ou `Inngest`, mas nenhuma das duas ferramentas foi adicionada ainda
