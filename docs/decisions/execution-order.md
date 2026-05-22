# Ordem de Execução — Workana AI

## Update 2026-05-22 — Agents Scope Lock

When this file conflicts with the latest agents scope, follow `docs/decisions/2026-05-22-agents-v1-contract.md`.

Locked priorities for current Agents V1 execution:

1. Layered context retrieval (structured + pgvector + rerank) with permission-aware filtering.
2. Company chat via internal context agent with delegation support.
3. Full-focus routes for company chat and single-agent workspace.
4. Queue and execution governance (3 concurrent per company, FIFO, 1 retry).

## Diretriz

O produto deve primeiro garantir acesso, workspace e contexto da empresa. Depois evolui para Brain, equipe, governança, créditos, agentes e execução operacional. Integrações e automações entram após o núcleo estar estável.

## Ordem Atual

1. Auth: login, signup, verificação de email e reset de senha
2. Criação ou seleção de workspace/company
3. Convites por email e entrada por link único
4. Onboarding curto da empresa
5. Brain inicial a partir do onboarding
6. Dashboard operacional
7. Equipe, roles e permissões
8. Design System da empresa e artifacts de contexto para IA
9. Chat com IA (multi-modelo)
10. Agentes default do sistema (adapta, copy, geração de imagem, geração de post)
11. Créditos por empresa e por usuário
12. Conexões com plataformas externas (Instagram, Facebook, etc.)
13. Tela de "Minhas Empresas"
14. Painel admin
15. Permissões beta (usuário e empresa)
16. Empresa admin (Workana AI) e rollout de features beta

## Estado de Implementação

- Auth: implementado como fundação
- Workspace/company: criação da empresa e onboarding inicial implementados
- Convites: implementado com backend/frontend e testes de service/controller
- Roles/permissões: implementado para usuários (CASL, guards e PermissionGate); permissões de empresa ainda não existem
- Onboarding: implementado como draft/publicação inicial, precisa endurecer autorização
- Dashboard shell: implementado
- Design System: implementado como domínio visual separado de Contexto, com permissões próprias, storage S3 e artifact `design-system.md`

## Próximos Domínios Prioritários

1. Corrigir autorização do onboarding e publicar Brain sem `userId` no body
2. Criar domínio persistido de Brain/CompanyBrain
3. Criar domínio de créditos por empresa e por usuário (`CreditLedger`)
4. Criar agentes default e histórico de execuções (`Agent`, `AgentRun`)
5. Conectar assets, Design System e onboarding ao Brain persistido

---

## Novos Domínios

### 8. Chat com IA (multi-modelo)

Interface de conversa com suporte a múltiplos modelos, selecionáveis pelo usuário.

- Seleção de modelo por conversa (provider + model id)
- Histórico de conversas por usuário/empresa
- Função de **copiar e adaptar**: pegar uma saída e jogar num fluxo de adaptação (estilo "adapta") rodado por agente
- Consumo amarrado ao `CreditLedger` (cada chamada debita conforme modelo e custo)
- Logs de uso por usuário/empresa/modelo, expostos no painel admin

Pontos de atenção:

- Abstrair provider por trás de uma interface única (`AiProvider`) para trocar modelos sem refatorar consumidores
- Streaming por SSE
- Anexar contexto do Brain da empresa como system prompt opcional

### 9. Agentes default do sistema

Cada agente é uma funcionalidade do sistema rodando seu próprio **workflow**. Os defaults iniciais:

- **Adapta** (com agentes): pega um conteúdo existente e adapta para outro formato/tom/plataforma
- **Copy**: geração de textos publicitários, CTAs, headlines
- **Geração de post**: monta um post completo (texto + sugestão de criativo)
- **Geração de imagem**: chama provider de imagem (ex.: Flux, SDXL, gpt-image) com prompt assistido

Modelagem:

```
Agent (id, key, name, type, workflowId, defaultModel, costPerRun)
Workflow (id, agentId, steps[]) — sequência de chamadas (LLM, imagem, validação, etc.)
AgentRun (id, agentId, userId, companyId, input, output, status, creditsSpent, createdAt)
```

Pontos de atenção:

- Workflow precisa ser declarativo (JSON/DSL) — não codar fluxo por agente em arquivos separados
- Cada step do workflow vira uma chamada rastreável (útil pra debug e cobrança)
- Agentes "entendem a necessidade" antes de executar: primeiro step costuma ser um classificador/planner que decide os steps seguintes
- Reuso do mesmo `AiProvider` do chat
- Output do agente precisa ser **estruturado** (não texto solto) para o frontend renderizar cards, imagens, variações

### 10. Créditos por empresa e por usuário

`CreditLedger` em dois níveis:

- **Empresa**: pool principal, recarregado por plano/compra
- **Usuário**: subconta opcional (admin da empresa pode dar quota individual a um membro)

Resolução de débito: tenta debitar do usuário primeiro (se tiver quota individual), senão da empresa.

Pontos de atenção:

- Ledger imutável (append-only): cada débito/crédito é uma linha, saldo é `SUM`
- Cada chamada de chat ou `AgentRun` gera uma entrada com referência ao recurso consumido
- Conversão de custo do provider → "crédito Workana" feita no momento do débito (cotação fixa por modelo na config)
- Endpoint `GET /credits/balance` retornando saldos de empresa e de usuário separados
- Bloquear chamada quando saldo < custo estimado do step (pré-débito reservado, libera no fim)

### 11. Conexões com plataformas externas

Conectores OAuth com plataformas para publicar/ler conteúdo:

- Instagram
- Facebook
- (outras vão entrando conforme demanda)

Modelagem:

```
Connection (id, companyId, provider, externalAccountId, accessToken, refreshToken, expiresAt, scopes[])
```

Pontos de atenção:

- Tokens criptografados em repouso (não guardar em plain text)
- Refresh automático antes de expirar (job ou lazy no uso)
- Conexão é da empresa, não do usuário — se o membro sair, conexão permanece
- Cada agente que publica declara que provider precisa, e a UI bloqueia execução se a conexão não existir/está expirada

### 12. Tela de "Minhas Empresas"

Tela onde o usuário vê todas as empresas que participa e troca de contexto. É também o ponto de entrada do painel admin (item exibido condicionalmente para quem tem permissão de admin global).

### 13. Painel Admin

Acessível a partir da tela de empresas, restrito a admins globais (Workana AI). Funcionalidades:

- Ver todos os usuários
- Ver detalhe de cada usuário (empresas, permissões, uso, último login)
- Ver todas as empresas
- Ver métricas globais (uso de IA, créditos, usuários ativos, conversões)
- Gerenciar uso da IA no projeto (limites globais, modelos habilitados, custos)
- Ver logs (auditoria de ações sensíveis)
- Ver eventos (eventos de domínio do sistema)
- Gerenciar notificações do sistema enviadas por admins (broadcast por empresa / global / segmento)
- Configurar a empresa admin (Workana AI)

Pontos de atenção:

- Toda rota admin atrás de guard dedicado (`@AdminOnly()`) — não reaproveitar permissão de empresa
- Logs e eventos vêm de tabelas dedicadas (`AuditLog`, `DomainEvent`) com paginação cursor-based
- Métricas em endpoint próprio com cache curto (Redis) para não estourar custo de query
- Notificações de sistema: separar `SystemNotification` (criada por admin) de notificações de produto

### 14. Permissões Beta

Sistema de feature flags com **dois níveis**: usuário e empresa.

- Permissão de usuário: liberada individualmente, sobrepõe a da empresa quando presente
- Permissão de empresa: aplica para todos os membros, **somente admins globais podem configurar**
- Resolver final: `userFlag ?? companyFlag ?? defaultOff`

Modelo sugerido:

```
FeatureFlag (key, description, default)
UserFeatureFlag (userId, flagKey, enabled)
CompanyFeatureFlag (companyId, flagKey, enabled)
```

Pontos de atenção:

- Endpoint único `GET /me/features` resolvendo a união e retornando o efetivo (frontend não decide hierarquia)
- Cache por sessão no frontend, invalidar ao trocar de empresa
- Admin precisa de UI para listar flags, ver quem tem ativo e ativar/desativar em massa
- Guard `@RequiresFeature('beta.x')` no backend para proteger rotas beta
- **Permissões de empresa são uma capacidade nova** — hoje só existem permissões de usuário; introduzir o conceito junto com este domínio

### 15. Empresa Admin (Workana AI) e rollout de features beta

A empresa admin é a Workana AI e tem acesso nativo a funcionalidades beta para teste interno. A liberação dessas features para outras empresas/usuários é feita via o sistema de permissões beta (item 14).

- Empresa admin marcada com flag `isAdminCompany` no domínio de Company
- Membros da empresa admin **não** são automaticamente admins globais — admin global é uma role separada (papel de usuário, não de membro de empresa)
- Features beta lançam primeiro com flag `enabled: true` na empresa admin, depois rolam por empresa conforme decisão de produto

Pontos de atenção:

- Não acoplar "ser da empresa Workana AI" com "ter acesso admin" — são dimensões diferentes
- Configuração da empresa admin fica dentro do painel admin (item 13)
