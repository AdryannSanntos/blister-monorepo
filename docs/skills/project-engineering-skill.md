# Project Engineering Skill

## Objetivo

Ser a skill base para qualquer IA que for trabalhar neste monorepo.

## Quando Usar

- qualquer tarefa de codigo
- qualquer refactor
- qualquer analise tecnica
- qualquer nova feature

## Entendimento Obrigatorio do Projeto

- este repositorio ainda esta na fase de fundacao tecnica do AI Company OS
- o produto final descrito no PRD ainda nao esta implementado
- a base atual sustenta auth, organizacoes, authz, tipos compartilhados e estrutura de apps

## Estrutura do Monorepo

- `apps/web`: frontend em `Next.js 16` e `React 19`
- `apps/api`: backend em `NestJS 11`
- `packages/authz`: permissoes e papeis compartilhados
- `packages/types`: schemas e tipos compartilhados com `Zod`
- `packages/configs`: configuracoes compartilhadas

## Regras Gerais de Execucao

- nao introduzir uma nova biblioteca se a stack atual ja resolve o problema
- manter mudancas pequenas e aderentes a estrutura existente
- nao duplicar contratos compartilhados que ja pertencem a `packages/authz` ou `packages/types`
- documentar divergencias entre PRD e implementacao real em vez de esconder essas lacunas

## Regras Obrigatorias de Tooling

- `pnpm` e o package manager oficial
- `Turborepo` coordena os fluxos do workspace
- `Biome` e o formatter e linter oficial
- `TypeScript` deve permanecer estrito

## Regras Obrigatorias de Bibliotecas

### Validacao e contratos

- usar `Zod` para validacao de borda
- quando houver schema, inferir tipos a partir dele

### Auth e autorizacao

- `better-auth` e a fonte de verdade apenas para autenticacao, verificacao de email, reset de senha e sessao
- `CASL` e a fonte de verdade para autorizacao
- organizacoes, memberships, convites, roles, permissões e organizacao ativa pertencem ao dominio da aplicacao
- novas permissoes devem nascer em `packages/authz`
- emails transacionais devem usar `Resend`

### Banco

- `Prisma` e o unico cliente de banco permitido
- nunca editar manualmente `apps/api/src/generated/prisma`

### HTTP e dados

- `axios` e o cliente HTTP padrao
- estado de servidor no frontend pertence ao `TanStack Query`
- estado compartilhavel por URL pertence ao `nuqs`
- estado local de cliente que nao cabe em cache nem URL pode usar `zustand`

### UI

- `Tailwind CSS v4` é a camada de estilo, com `@theme inline` em `apps/web/src/app/globals.css`
- `clsx`, `tailwind-merge` (via `cn()`) e `class-variance-authority` são a stack de composição de classes
- `lucide-react` é a biblioteca padrão de ícones
- `shadcn/ui` está instalado e é a base oficial de componentes no frontend (style `new-york`, base `radix`)
- os componentes oficiais de UI vivem em `apps/web/src/core/shared/components/ui`
- os tokens globais vivem em `apps/web/src/app/globals.css` e o design system tem rota viva em `/design-system`
- formulários: `Form` (RHF + Zod) · tabelas: `DataTable` (TanStack) · charts: `Chart` (recharts)
- theming: `next-themes` `attribute="class"`, light via `.light`
- padroes visuais obrigatorios de dashboard, cards, sidebars, charts, buttons, modais e avatares vivem em `docs/design-system/usage-rules.md` e devem ser aplicados antes de criar novo markup

### Realtime e storage

- `socket.io` e `socket.io-client` sao a stack oficial de realtime
- `@aws-sdk/client-s3` e a camada oficial para storage compativel com S3

## O Que Ainda Nao E Padrao Implementado

- `Trigger.dev` ou `Inngest` ainda nao foram adotados
- nao assumir essas ferramentas como disponiveis sem adiciona-las ao projeto

## Fluxo Recomendado de Pensamento

1. identificar se a tarefa e web, api, shared package ou review
2. carregar o contexto real do projeto envolvido
3. aplicar a biblioteca oficial do problema
4. implementar a menor mudanca correta
5. validar coerencia com PRD, stack, design system e estrutura atual
