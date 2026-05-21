# Status da Fundacao do Monorepo

## Objetivo Deste Documento

Registrar o que ja foi consolidado na fundacao do Workana AI e o que ainda falta para o repositorio sustentar o MVP de negocio descrito no PRD.

## O Que Ja Existe

### Workspace e toolchain

- `pnpm-workspace.yaml` com `apps/*` e `packages/*`
- `turbo.json` com pipelines de `dev`, `build`, `lint` e `typecheck`
- `biome.json` como formatter e linter principal
- `tsconfig.base.json` compartilhado

### Aplicacoes e pacotes

- `apps/web` com `Next.js 16`, `React 19`, `Tailwind CSS` e utilitarios base
- `apps/api` com `NestJS 11`, Prisma e bootstrap de auth
- `packages/authz` com papeis, permissoes e ability factory
- `packages/types` com schemas e tipos compartilhados
- `packages/configs` com presets de TypeScript

### Auth e multiempresa

- `better-auth` montado na API
- plugin de organizacao habilitado
- papeis padrao `owner`, `admin` e `member`
- schema Prisma cobrindo usuarios, sessoes, organizacoes, membros, convites e times

## O Que Ainda Falta

### Infra local

- commitar `docker-compose.yml`
- commitar `.env.example`
- documentar valores minimos para cada app com exemplos praticos

### Dominio do produto

- tabelas de `CompanyBrain`, `Skill`, `Output`, `Template` e similares
- servicos de negocio para Brain
- fluxo real de execucao de skills
- aprovacao de outputs
- templates e execucao operacional
- geracao visual HTML
- landing pages
- automacoes

### Integracoes

- servico de storage baseado em `@aws-sdk/client-s3`
- adaptador de realtime com `socket.io`
- camada propria para provider de LLM

## Ordem Recomendada de Evolucao

1. fechar setup local e ambiente
2. modelar entidades de dominio do produto no Prisma
3. implementar Brain e execucoes
4. implementar skills e execucao
5. adicionar aprovacao e historico
6. evoluir para conteudo visual, paginas e automacoes

## Criterio de Conclusao da Fase Atual

A fundacao desta fase fica realmente pronta quando:

- o ambiente local e reproduzivel por outro dev
- auth e organizacoes funcionam de ponta a ponta
- `lint`, `typecheck` e `build` passam com previsibilidade
- os pacotes compartilhados estao estaveis para virar base das proximas features
