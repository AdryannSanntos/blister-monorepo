# Desenvolvimento Local

## Pre-requisitos

- Node.js `>=22.0.0`
- `pnpm@10.11.0`
- PostgreSQL acessivel pela API

## Instalar Dependencias

```bash
pnpm install
```

## Scripts Principais do Monorepo

Na raiz:

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm format`

## Subir as Aplicacoes Separadamente

Frontend:

```bash
pnpm --filter @company-os/web dev
```

API em porta diferente do web:

```bash
PORT=3001 pnpm --filter @company-os/api start:dev
```

`pnpm dev` usa Turborepo, mas `web` e `api` conflitam se ambos rodarem com a porta padrao `3000`.

## Variaveis de Ambiente Esperadas

- `DATABASE_URL`: conexao PostgreSQL usada pelo Prisma
- `BETTER_AUTH_SECRET`: segredo obrigatorio fora de testes descartaveis
- `BETTER_AUTH_URL`: URL base da API, por exemplo `http://localhost:3001`
- `CORS_ORIGIN`: lista separada por virgula dos origins permitidos para o frontend
- `NEXT_PUBLIC_API_URL`: URL publica da API consumida pelo frontend
- `RESEND_API_KEY`: chave da conta `Resend` para emails transacionais
- `RESEND_FROM_EMAIL`: remetente padrao para verificacao de email, reset de senha e convites
- `GOOGLE_CLIENT_ID`: opcional ate habilitar login Google
- `GOOGLE_CLIENT_SECRET`: opcional ate habilitar login Google

## Observacoes Reais do Projeto

- o Prisma gera cliente em `apps/api/src/generated/prisma`
- essa pasta deve ser tratada como gerada, nao como codigo manual
- o schema atual do Prisma esta em `apps/api/prisma/schema.prisma`
- o bootstrap da API aplica prefixo global `api`
- o `better-auth` e montado em `/api/auth`
- a decisao aprovada e manter `better-auth` como auth-only e migrar organizacoes/convites/permissoes para dominio proprio

## Lacunas Atuais

- os scripts `db:up`, `db:down` e `db:logs` existem na raiz, mas `docker-compose.yml` nao esta commitado
- o repositorio ainda nao possui `.env.example`
- o PRD de negocio esta a frente da implementacao real; varios modulos ainda nao existem no codigo
- o envio de emails por `Resend` ainda precisa ser integrado na implementacao real

## Fluxo Recomendado

1. Instalar dependencias na raiz.
2. Garantir um PostgreSQL acessivel para `DATABASE_URL`.
3. Subir a API em `3001`.
4. Subir o frontend em `3000`.
5. Rodar `pnpm lint` e `pnpm typecheck` antes de iniciar novas features.
