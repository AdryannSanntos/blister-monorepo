# PRD - Auth, Organizacoes e Onboarding Foundation

## 1. Objetivo

Definir o produto e a arquitetura da primeira experiencia real de entrada do Workana AI, cobrindo autenticacao, workspace multiempresa, convites, autorizacao por empresa e onboarding inicial com publicacao do primeiro Brain.

## 2. Contexto

O repositorio atual ja possui fundacao tecnica de `web`, `api`, `Prisma`, `better-auth` e `packages/authz`, mas parte da modelagem ainda segue o plugin de organizacao do `better-auth`. A decisao atual do produto e separar responsabilidades:

- `better-auth` fica restrito a identidade e sessao
- organizacoes, roles, permissoes, convites e organizacao ativa viram dominio proprio
- `CASL` continua como motor de autorizacao
- `Resend` passa a ser o servico padrao de email transacional

## 3. Problema

Sem essa separacao, o produto fica preso a um modelo de organizacao e permissao que nao representa a necessidade real do Workana AI:

- cada empresa precisa de `roles` proprias
- um membro pode acumular multiplas funcoes
- excecoes por usuario precisam existir por empresa
- a organizacao ativa precisa ser resolvida pelo proprio produto
- o onboarding inicial precisa ser governado pelo dominio da empresa, nao pela camada de auth

## 4. Escopo do PRD

Entram neste PRD:

- cadastro
- login
- verificacao de email
- esqueci a senha / reset de senha
- criacao de workspace
- convites por empresa
- selecao da organizacao ativa
- roles padrao e custom por empresa
- permissões por role
- overrides `allow` e `deny` por usuario
- onboarding inicial da empresa
- publicacao da primeira versao do Brain

Nao entram neste PRD:

- login social no primeiro recorte
- teams avancados
- automacoes
- Brain editavel completo apos o onboarding
- catalogo de skills funcional

## 5. Regras de Produto Fechadas

### 5.1 Auth

- `better-auth` cuida apenas de autenticacao e sessao
- verificacao de email e reset de senha seguem no `better-auth`
- emails de auth usam `Resend`

### 5.2 Organizacao ativa

- organizacao ativa pertence ao dominio da aplicacao
- ela nao deve ser a fonte de verdade da sessao do `better-auth`
- toda autorizacao e todo redirecionamento de negocio dependem dela

### 5.3 Roles e permissoes por empresa

- toda empresa nasce com `owner`, `admin` e `member`
- a empresa pode criar novas roles
- um membro pode ter multiplas roles na mesma empresa
- overrides por usuario suportam `allow` e `deny`
- `CASL` calcula a ability final com base em empresa ativa + roles + overrides

### 5.4 Convites

- convite e dominio proprio do produto
- o email de convite usa `Resend`
- se o usuario nao tiver conta, o fluxo e:
  1. abrir convite
  2. criar conta
  3. autenticar
  4. entrar na empresa correta

### 5.5 Onboarding

- onboarding inicial e obrigatorio para o primeiro `owner`
- so `owner` publica a primeira versao do contexto
- o onboarding termina com a publicacao inicial do Brain

## 6. Fluxo Principal do Usuario

1. usuario cria conta ou entra
2. sistema resolve convites, memberships e organizacao ativa no dominio proprio
3. se nao tiver empresa, cria workspace
4. se tiver convite aberto, conclui entrada via convite
5. se tiver mais de uma empresa, escolhe a ativa
6. se a empresa ativa ainda nao tiver Brain publicado, vai para onboarding
7. `owner` publica o contexto inicial
8. usuario entra no dashboard

## 7. Fluxos Funcionais

### 7.1 Cadastro

- nome
- email
- senha
- verificacao de email

### 7.2 Login

- email
- senha
- redirecionamento orientado pelo dominio do produto

### 7.3 Reset de senha

- solicitar reset
- receber email via `Resend`
- redefinir senha

### 7.4 Criar workspace

- nome da empresa
- slug
- bootstrap de roles padrao
- bootstrap do membership `owner`

### 7.5 Convite

- enviar convite com role inicial
- aceitar convite autenticado ou criando conta
- definir empresa do convite como ativa

### 7.6 Selecao de empresa ativa

- listar empresas do usuario
- definir contexto atual do workspace

### 7.7 Onboarding inicial

Etapas:

1. boas-vindas
2. dados basicos da empresa
3. posicionamento e proposta de valor
4. produtos e servicos
5. publico-alvo
6. tom de voz e comunicacao
7. diferenciais e FAQ
8. processos e regras internas
9. revisao e publicacao

## 8. Requisitos Estruturais Obrigatorios

- `Prisma` continua sendo o unico acesso ao banco
- `CASL` continua sendo o motor de autorizacao
- o catalogo de permissoes permanece em codigo
- `better-auth` nao volta a ser fonte de verdade para organizacoes, cargos ou empresa ativa
- `Resend` e o servico padrao para emails transacionais do produto

## 9. Criterio de Pronto

Esta fundacao e considerada pronta quando:

- auth funciona ponta a ponta com verificacao de email e reset
- empresa ativa e resolvida sem depender do plugin de organizacao do `better-auth`
- toda empresa nasce com `owner`, `admin` e `member`
- roles custom e overrides por usuario funcionam por empresa
- convite leva o usuario certo para a empresa certa
- o onboarding inicial salva, retoma e publica a primeira versao do contexto
- o dashboard so fica acessivel depois da publicacao inicial
