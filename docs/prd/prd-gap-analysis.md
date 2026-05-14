# Analise de Aderencia do PRD ao Monorepo

## Objetivo

Este documento cruza o PRD de negocio com o estado real do repositorio para evitar documentacao aspiracional sem lastro tecnico.

## O Que Esta Alinhado

- o produto e multiempresa e isso ja comeca a aparecer no schema e no bootstrap atual, embora a arquitetura final esteja migrando para dominio proprio
- o conceito de papeis e permissoes ja existe em `packages/authz`
- a separacao entre `web`, `api` e pacotes compartilhados sustenta o crescimento do produto
- a stack escolhida suporta bem Company Brain, Skills, Outputs e aprovacoes futuras

## Decisao Arquitetural Aprovada Depois da Fundacao

O modelo de organizacoes do plugin do `better-auth` nao sera a arquitetura final do produto.

Direcao aprovada:

- `better-auth` fica restrito a auth e sessao
- organizacoes, convites, memberships, roles, permissoes e organizacao ativa passam para dominio proprio
- `CASL` continua como motor de autorizacao
- `Resend` vira o servico padrao de email transacional

## O Que O PRD Assume, Mas o Codigo Ainda Nao Implementa

### Modulos de negocio

- Company Brain como entidade de dominio propria
- biblioteca de skills com CRUD e execucao
- outputs salvos com status de aprovacao
- Content Studio
- Landing Page Builder
- geracao visual em HTML
- automacoes recorrentes

### Infraestrutura de IA

- provider de LLM com camada propria de orquestracao
- estrategia de persistencia de contexto para execucoes
- versionamento de prompts, skills ou templates

### Infraestrutura operacional

- armazenamento S3/Spaces ja esta previsto por dependencia, mas ainda nao esta conectado a um fluxo funcional
- realtime com `socket.io` esta disponivel por stack, mas ainda nao esta aplicado a features de produto

## Diferencas Entre PRD Original e Projeto Real

### ShadCN UI

O repositorio atual ja adota `shadcn` como base oficial de componentes no frontend. A documentacao do projeto deve tratar `shadcn + Tailwind CSS` como a camada real de UI hoje.

### Trigger.dev ou Inngest

O PRD sugeria `Trigger.dev`, `Inngest` ou equivalente para automacoes. Nenhuma dessas opcoes esta instalada ainda. Portanto, automacoes seguem como direcao futura, nao como decisao implementada.

### DigitalOcean Spaces e S3-compatible

O PRD fala em armazenamento S3-compatible. O projeto ja tem `@aws-sdk/client-s3`, o que permite Spaces ou outro provider compativel, mas ainda nao existe servico de storage no codigo.

### Estado do banco

O schema atual e fortemente orientado ao modelo do `better-auth` e cobre `User`, `Session`, `Account`, `Organization`, `Member`, `Invitation`, `Team` e `TeamMember`. Ainda faltam tabelas de dominio para Company Brain, Skills, Outputs, Templates, Campaigns e afins.

Tambem faltam evolucoes para o novo modelo de authz por empresa, como:

- `Role`
- `RolePermission`
- `MembershipRole`
- `MembershipPermissionOverride`
- persistencia explicita da organizacao ativa

## Recomendacao Pratica

A sequencia recomendada para manter aderencia entre produto e implementacao e:

1. reduzir `better-auth` a auth-only
2. modelar organizacoes, roles, overrides e organizacao ativa no dominio proprio
3. consolidar convites, onboarding e publicacao do contexto inicial
4. modelar Company Brain e Outputs no banco
5. implementar skill execution com contratos claros
6. adicionar fluxo de aprovacao
7. evoluir para Content Studio e visual HTML
8. so depois abrir automacoes e integracoes externas

## Conclusao

O PRD continua valido como visao de produto. O ajuste necessario nao e mudar a direcao, e sim explicitar que o repositorio ainda esta construindo a camada fundacional que tornara esse PRD executavel de forma consistente.
