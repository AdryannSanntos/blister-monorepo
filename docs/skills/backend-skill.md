# Backend Skill

## Objetivo

Guiar a IA ao implementar, refatorar ou revisar codigo em `apps/api`.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/decisions/stack-decisions.md`

## Escopo

- modulos NestJS
- servicos
- bootstrap HTTP
- auth
- Prisma
- autorizacao
- futuras integracoes de realtime e storage

## Regras de Implementacao

### NestJS

- todo fluxo HTTP deve passar pela aplicacao Nest
- organizar codigo por modulos, providers e servicos claros
- evitar logica espalhada em arquivos de bootstrap sem necessidade

### Prisma

- toda persistencia deve usar `Prisma`
- alteracoes de dominio persistido devem começar pelo schema Prisma
- nao editar o client gerado manualmente

### Better Auth

- autenticacao continua centralizada no `better-auth`
- `better-auth` deve ficar restrito a auth, verificacao de email, reset de senha e sessao
- organizacoes, membership, convites, roles e organizacao ativa devem viver no dominio proprio da aplicacao
- nao criar solucao paralela para sessao, mas criar o dominio proprio de organizacoes conforme a arquitetura aprovada

### CASL e authz

- novas permissoes devem ser declaradas em `packages/authz`
- backend e frontend devem continuar compartilhando o mesmo catalogo
- a ability final deve considerar empresa ativa, multiplas roles por membro e overrides `allow`/`deny`

### Integracoes

- realtime deve usar `socket.io`
- storage compativel com S3 deve usar `@aws-sdk/client-s3`
- nao adicionar libs paralelas para esses mesmos problemas

## Atencoes de Dominio

- o schema atual cobre principalmente entidades de auth e organizacao
- Company Brain, Skill e Output ainda nao estao persistidos
- a modelagem de authz por empresa ainda precisa evoluir para suportar roles custom, multiplas roles por membro e overrides por usuario
- ao iniciar esses modulos, explicitar a fronteira entre auth foundation e dominio do produto

## Checklist de Entrega

- a implementacao respeita o ciclo do NestJS
- a persistencia esta centralizada no Prisma
- auth continua no `better-auth`
- permissoes continuam no pacote compartilhado
- a mudanca nao assume modulos de dominio que ainda nao existem sem antes modela-los corretamente
