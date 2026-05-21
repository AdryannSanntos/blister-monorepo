# Desenho Atual da Fundacao do Monorepo

## Objetivo

Consolidar a base tecnica do Workana AI para suportar um produto multiempresa com IA, autenticacao, autorizacao e modulos de negocio evolutivos.

## Escopo Real Desta Fase

Esta fase cobre apenas a fundacao tecnica do produto:

- configuracao do monorepo
- shell frontend e backend
- pacotes compartilhados
- auth e organizacoes
- authz compartilhado
- contratos compartilhados
- documentacao viva em `/docs`

Esta fase ainda nao entrega:

- Brain funcional
- catalogo de skills funcional
- geracao de conteudo por IA
- aprovacoes de outputs
- landing pages
- automacoes

## Layout do Repositorio

```text
apps/
  web/
  api/
packages/
  authz/
  types/
  configs/
docs/
  context/
  decisions/
  prd/
  setup/
  skills/
```

## Responsabilidades por Area

- `apps/web`: shell de interface, auth client, query client e futuras features de produto
- `apps/api`: bootstrap HTTP, auth, acesso a banco e futuras integracoes de dominio
- `packages/authz`: permissoes, subjects, papeis padrao e ability factory
- `packages/types`: schemas e tipos compartilhados entre fronteiras
- `packages/configs`: presets de TypeScript
- `docs`: memoria operacional do projeto e skills de execucao para IA

## Estado Atual do Frontend

O frontend agora possui:

- `shadcn` instalado como base de componentes
- tokens globais em `apps/web/src/app/globals.css`
- componentes oficiais em `apps/web/src/core/shared/components/ui`
- rota `/design-system` como showcase vivo do sistema visual

Bibliotecas relevantes adicionadas a camada de UI:

- `radix-ui`
- `@base-ui/react`
- `class-variance-authority`
- `next-themes`
- `sonner`
- `vaul`

## Modelo Atual de Auth e Multiempresa

O modelo atual usa `better-auth` com:

- email/senha
- verificacao de email
- OAuth Google opcional

Decisao arquitetural aprovada em `2026-05-14`:

- `better-auth` deve ficar restrito a auth e sessao
- organizacoes, memberships, convites, roles e organizacao ativa devem migrar para dominio proprio da aplicacao
- emails transacionais devem usar `Resend`

Na pratica:

- um usuario pode pertencer a varias organizacoes
- uma organizacao representa o workspace da empresa
- a organizacao ativa deve ser a referencia principal para features futuras
- a organizacao ativa nao deve depender do modelo de organizacao do `better-auth`

## Modelo Atual de Autorizacao

Autorizacao e tratada por `CASL` via `packages/authz`.

Separacao intencional de responsabilidades:

- identidade e sessao: `better-auth`
- organizacao ativa e memberships: dominio proprio
- avaliacao de permissao: `CASL`
- persistencia de membros, convites, roles e onboarding: `Prisma`

Roles padrao obrigatorias por empresa:

- `owner`
- `admin`
- `member`

Regras aprovadas:

- a empresa pode criar novas roles
- um membro pode ter multiplas roles na mesma empresa
- overrides por usuario suportam `allow` e `deny`
- somente `owner` publica o onboarding inicial

Subjects atuais do catalogo:

- `Company`
- `Member`
- `Role`
- `Permission`
- `CompanyBrain`
- `Skill`
- `Output`

Importante: parte desses subjects ja existe no catalogo de authz, mas ainda nao possui persistencia de negocio correspondente no banco. A migracao do modelo atual deve remover o acoplamento com as roles/plugins do `better-auth`.

## Bibliotecas Preferenciais Ja Adotadas

- `zod`
- `react-hook-form`
- `@tanstack/react-query`
- `@tanstack/react-table`
- `recharts`
- `clsx`
- `tailwind-merge`
- `tailwind-variants`
- `nuqs`
- `zustand`
- `axios`
- `socket.io`
- `socket.io-client`
- `@aws-sdk/client-s3`
- `lucide-react`
- `radix-ui`
- `@base-ui/react`
- `class-variance-authority`
- `next-themes`
- `sonner`
- `vaul`

## Criterios de Saude da Fundacao

A base e considerada saudavel quando:

- o monorepo instala sem workarounds manuais
- web e api sobem localmente com configuracao previsivel
- Prisma gera cliente sem falhas
- auth funciona de forma consistente
- authz continua compartilhado entre apps
- documentacao descreve o estado real do codigo
