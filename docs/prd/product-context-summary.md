# Resumo de Contexto do Produto

## O Que o AI Company OS E

O AI Company OS e uma plataforma multiempresa para operacionalizar IA com contexto, governanca e reutilizacao. A visao final inclui Company Brain, Skills, Outputs, aprovacoes, conteudo, paginas e automacoes.

## O Que Este Repositorio Cobre Hoje

O repositorio ainda esta na fase de fundacao tecnica. O foco atual nao e entregar modulos finais de negocio, e sim a base necessaria para eles.

- `apps/web`: shell frontend em `Next.js 16`
- `apps/api`: shell backend em `NestJS 11`
- `packages/authz`: vocabulario compartilhado de permissoes e papeis
- `packages/types`: contratos compartilhados com `Zod`
- `packages/configs`: configuracoes compartilhadas de TypeScript
- `Prisma` com PostgreSQL
- `better-auth` montado na API, ainda em transicao do modelo de organizacoes do plugin para auth-only
- documentacao do projeto em `/docs`

## Restricoes Estruturais do Produto

- um usuario pode pertencer a varias empresas
- uma empresa pode ter varios usuarios
- autenticacao deve vir do `better-auth`
- organizacao ativa deve vir do dominio da aplicacao
- autorizacao deve vir de `CASL` e do catalogo compartilhado em `packages/authz`
- toda empresa nasce com `owner`, `admin` e `member`, podendo criar novas roles
- um membro pode ter multiplas roles e overrides por usuario na mesma empresa
- o catalogo de permissoes permanece controlado em codigo

## Definicao de Pronto Desta Fase

A fundacao desta fase e considerada consistente quando:

- `pnpm install` funciona no monorepo
- `web` e `api` conseguem subir localmente
- `lint`, `typecheck` e `build` funcionam
- o Prisma gera cliente com sucesso
- o `better-auth` esta montado na API
- os contratos compartilhados de authz e types podem ser reutilizados com seguranca nas proximas features
- o fluxo de entrada da empresa precisa evoluir para convites, organizacao ativa propria e onboarding publicado
