# PRD - AI Company OS

## 1. Resumo Executivo

O AI Company OS e uma plataforma B2B para implementar IA de forma estruturada dentro de empresas. A proposta nao e entregar apenas prompts ou uma interface de chat, mas criar uma camada operacional com contexto persistente, regras, autenticacao organizacional, autorizacao, skills reutilizaveis e fluxos aprovaveis.

No estado atual deste repositorio, o produto esta na fase de fundacao tecnica. A visao de negocio ja esta clara, mas os modulos centrais de Company Brain, Skills, Content Studio, geracao visual, landing pages e automacoes ainda nao foram implementados como features completas.

## 2. Visao do Produto

O produto deve permitir que cada empresa configure seu contexto uma vez e reutilize esse contexto em toda a operacao assistida por IA.

Proposta central:

- centralizar o contexto da empresa
- padronizar o uso de IA por workspace
- transformar rotinas em skills reutilizaveis
- registrar historico, aprovacoes e aprendizados
- preparar a base para automacoes com supervisao humana

## 3. Problema

Empresas adotam IA de forma fragmentada:

- contexto disperso entre pessoas e ferramentas
- variacao de tom de voz e marca
- retrabalho para explicar a empresa repetidamente
- ausencia de historico operacional
- fluxos manuais para conteudo, campanhas e materiais comerciais
- automacoes desconectadas da realidade do negocio

## 4. Oportunidade

Existe espaco para uma plataforma que una:

- memoria organizacional
- autenticacao e estrutura multiempresa
- autorizacao por papeis
- execucao de skills
- outputs rastreaveis
- futura camada de automacoes

O diferencial nao esta em gerar texto isolado, e sim em operacionalizar IA com contexto, consistencia e governanca.

## 5. Publico-Alvo

Publicos prioritarios:

- pequenas e medias empresas que precisam de produtividade com governanca
- agencias que operam varios clientes e precisam de workspaces separados
- empresas B2B de servicos que precisam de propostas, paginas e campanhas
- negocios locais com alta demanda recorrente de conteudo e presencia digital

Publico inicial recomendado para go-to-market:

- agencias
- pequenas empresas orientadas a conteudo
- operacoes B2B que dependem de materiais comerciais recorrentes

## 6. Posicionamento

Posicionamento recomendado:

"Uma plataforma que implementa um cerebro de IA personalizado na empresa, com contexto, autenticacao organizacional, permissao por papeis, skills e automacoes para acelerar marketing, vendas e operacoes."

## 7. Pilares de Produto

### 7.1 Company Brain

Memoria operacional da empresa com:

- posicionamento
- servicos e produtos
- publico-alvo
- tom de voz
- regras de comunicacao
- diferenciais
- perguntas frequentes
- processos internos
- historico de decisoes

### 7.2 Repositorio de Skills

Biblioteca de tarefas reutilizaveis, por exemplo:

- criar post
- criar carrossel
- criar story
- criar landing page
- criar proposta comercial
- resumir reuniao
- gerar checklist interno

### 7.3 Content Studio

Area para gerar conteudos a partir do contexto da empresa, com foco em consistencia de marca e velocidade.

### 7.4 Geracao Visual em HTML

Camada para transformar conteudos aprovados em pecas visuais renderizaveis para feed, story, carrossel e criativos.

### 7.5 Landing Page Builder

Geracao assistida de paginas de campanha, captacao ou venda com base em oferta, publico e CTA.

### 7.6 Central de Aprovacoes e Historico

Todo output precisa poder ser salvo, revisado, aprovado, rejeitado e consultado depois.

### 7.7 Central de Automacoes

Fluxos recorrentes com aprovacao humana por padrao, principalmente no inicio.

## 8. Escopo do Produto vs Estado Atual do Repositorio

Esta secao existe para manter o PRD aderente ao projeto real.

O que ja existe na base tecnica:

- monorepo com `apps/web`, `apps/api` e pacotes compartilhados
- frontend em `Next.js 16` com `React 19`, `Tailwind CSS` e `TanStack Query`
- backend em `NestJS 11`
- autenticacao com `better-auth`
- estrutura multiempresa em transicao do plugin de organizacao do `better-auth` para dominio proprio da aplicacao
- autorizacao compartilhada em `packages/authz` com `CASL`
- schemas compartilhados em `packages/types` com `Zod`
- Prisma configurado com PostgreSQL

O que ainda nao existe como modulo de produto:

- Company Brain persistido em tabelas proprias
- CRUD de skills de negocio
- execucao real de skills com LLM
- Content Studio funcional
- geracao visual HTML
- landing pages geradas
- fila de aprovacoes de outputs
- automacoes recorrentes
- integracoes externas operacionais

## 9. Escopo do MVP de Negocio

O MVP de negocio continua valido, mas precisa ser entendido como proxima etapa sobre a fundacao atual.

Entram no MVP de negocio:

- cadastro e login
- criacao de workspace/organizacao
- convite para workspace existente
- onboarding inicial da empresa
- Company Brain editavel
- lista inicial de skills prontas
- execucao de skills com IA
- historico de outputs
- aprovacao de outputs
- Content Studio basico
- preview visual inicial para alguns formatos
- landing page simples em rascunho

Nao entram no MVP de negocio:

- publicacao automatica completa em redes sociais
- CRM completo
- WhatsApp automatizado
- analytics avancado
- marketplace de skills
- app mobile
- integracoes corporativas complexas

## 10. Escopo do MVP Tecnico Atual

O repositorio de hoje esta focado em validar a fundacao necessaria para suportar o MVP de negocio depois.

Entregas desta fase:

- shell web
- shell api
- autenticacao
- organizacoes em migracao para dominio proprio
- papeis padrao
- catalogo inicial de permissoes
- pacotes compartilhados
- documentacao tecnica e de produto

## 11. Fluxos Prioritarios de Futuro

Fluxos de negocio a implementar nas proximas fases:

1. Primeiro acesso e criacao da empresa
2. Onboarding do contexto da empresa
3. Execucao de skill com base no contexto
4. Revisao e aprovacao de output
5. Reaproveitamento de output em formato visual
6. Evolucao para landing pages e automacoes

## 12. Requisitos Estruturais Obrigatorios

Para que o produto escale corretamente, as seguintes regras devem continuar verdadeiras:

- autenticacao deve permanecer centralizada no `better-auth`
- organizacao ativa deve representar o workspace atual da empresa e pertencer ao dominio da aplicacao
- autorizacao deve permanecer compartilhada entre frontend e backend
- catalogo de permissoes deve continuar definido em codigo
- validacao de borda deve usar `Zod`
- banco deve continuar acessado apenas via `Prisma`
- emails transacionais devem usar `Resend`
- cada empresa deve nascer com `owner`, `admin` e `member`, podendo criar novas roles
- overrides por usuario devem suportar `allow` e `deny`

## 13. Monetizacao

Modelo recomendado:

- setup inicial pago
- mensalidade recorrente por empresa
- tier para agencias com multiplos clientes
- servicos adicionais para skills personalizadas, setup e consultoria

## 14. Roadmap Recomendado

### Fase 1 - Fundacao tecnica

Entregue parcialmente neste repositorio:

- monorepo
- auth
- organizacoes
- authz
- stack base

### Fase 2 - MVP de operacao

- Company Brain
- onboarding
- skills iniciais
- outputs e aprovacoes

### Fase 3 - Conteudo e visual

- Content Studio
- geracao visual HTML
- exportacao

### Fase 4 - Paginas e campanhas

- landing pages simples
- templates e reutilizacao

### Fase 5 - Automacoes seguras

- execucoes agendadas
- aprovacoes humanas
- lembretes e relatorios

### Fase 6 - Integracoes externas

- canais de publicacao
- sincronizacoes
- conectores operacionais

## 15. Riscos

- tentar construir produto demais antes de consolidar Company Brain e Skills
- misturar autenticacao com autorizacao fora dos contratos atuais
- manter organizacoes e roles acopladas ao `better-auth` e bloquear a evolucao do dominio proprio
- criar features de IA sem contexto persistido
- introduzir bibliotecas paralelas para problemas que a stack ja cobre
- avancar para automacao total antes de consolidar aprovacao humana

## 16. Metricas de Sucesso

Metricas de produto:

- empresas que completam onboarding
- empresas que geram primeiro output
- quantidade de outputs aprovados
- frequencia semanal de uso
- quantidade de skills executadas
- conversao de setup para mensalidade

Metricas de fundacao tecnica:

- install, lint, typecheck e build funcionando
- auth operacional
- organizacoes operacionais
- contratos compartilhados entre apps estaveis

## 17. Frase Guia

"A IA da sua empresa, treinada com seu contexto, sua marca, seus processos e suas tarefas mais importantes."
