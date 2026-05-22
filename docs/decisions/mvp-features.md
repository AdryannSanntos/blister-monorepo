# MVP — Workana AI

## Update 2026-05-22 — Agents V1 Contract

This document has historical sections. For Agents V1, when there is conflict, follow `docs/decisions/2026-05-22-agents-v1-contract.md`.

Mandatory overrides for Agents V1:

- Company agent catalog is custom-only in V1.
- Company chat always runs through internal context agent.
- Delegated execution returns response in company chat, with detailed execution in delegated agent history.
- Full-focus layout is mandatory for company chat and workflow editing routes.
- Execution concurrency: max 3 running per company, FIFO queue for overflow, 1 automatic retry in same run.
- Retrieval is permission-aware and must exclude credentials/secrets.

## Visão do produto

Workana AI é uma plataforma B2B que ajuda empresas a coordenar trabalho com freelancers, fornecedores e times remotos usando IA. O núcleo operacional são os **agentes**: toda funcionalidade de geração de conteúdo, imagem, copy ou adaptação é executada por um agente — seja um agente default do sistema ou um agente criado pela própria empresa.

---

## Funcionalidades MVP — Ordem de execução

### 1. Auth ✅ implementado

- Login com email/senha
- Signup com verificação de email
- Reset de senha
- Sessão via better-auth

---

### 2. Workspace / Company ✅ implementado

- Criação de empresa (slug, nome)
- Seleção de empresa ativa
- Onboarding inicial (wizard)

---

### 3. Convites ✅ implementado

- Convite por email com link único
- Entrada via link de convite
- Backend + frontend com testes de service/controller

---

### 4. Equipe, Roles e Permissões ✅ implementado

- Listagem de membros da empresa
- Roles: owner, admin, member (imutáveis)
- Criação de roles customizadas com permissões CASL
- Guards `@RequirePermission` no backend
- `<PermissionGate>` e `useAbility()` no frontend

---

### 5. Brain da empresa ✅ implementado (precisa endurecer)

- Wizard de onboarding com steps: básicos, produtos, público, posicionamento, processos, tom de voz, diferenciais
- Draft/publicação do brain (`OnboardingDraft`)
- **Pendente:** corrigir autorização (`userId` não deve vir do body), separar domínio `CompanyBrain` persistido do draft de onboarding

---

### 6. Design System da empresa ✅ implementado (MVP)

- Feature dedicada ao contexto visual da empresa
- Deve concentrar identidade, referências de marca, assets visuais e direcionamento estético
- Rota real em `/dashboard/workspace/design-system`
- Permissões explícitas `design-system.read` e `design-system.update`
- Banco como fonte de verdade, S3 para binários e `design-system.md` gerado
- Regeneração assíncrona do contexto visual para IA via Trigger.dev
- Parte do que antes seria lido como `assets` deixa de pertencer ao contexto operacional e passa para este domínio

---

### 7. Dashboard ✅ implementado (shell)

- Shell do dashboard com sidebar, layout e navegação
- Rotas protegidas por auth e por org ativa

---

### 8. Integrações ✅ shell implementado

- Tela de integrações com listagem de conectores disponíveis
- **Pendente:** OAuth real com Instagram, Facebook e outros; modelo `Connection` no banco

---

### 9. Agentes — default do sistema 🔴 não implementado (prioridade máxima)

Toda funcionalidade de geração com IA usa um agente. Agentes default do sistema:

- **Adapta**: adapta um conteúdo para outro formato, tom ou plataforma
- **Copy**: geração de textos publicitários, CTAs, headlines
- **Post**: monta um post completo (texto + sugestão de criativo)
- **Imagem**: gera imagem via provider (Flux, SDXL, gpt-image) com prompt assistido

Modelagem necessária:

```
Agent        (id, key, name, type, workflowId, defaultModel, costPerRun, isSystem)
Workflow     (id, agentId, steps[])   — DSL declarativo, não código por agente
AgentRun     (id, agentId, userId, companyId, input, output, status, creditsSpent, createdAt)
```

Pontos de atenção:
- Workflow declarativo (JSON/DSL) — um arquivo de config por agente, não código separado
- Cada step do workflow é rastreável (debug + cobrança)
- Primeiro step: classificador/planner que decide os steps seguintes
- Outputs estruturados (não texto solto) — frontend renderiza cards, imagens, variações
- Empresas podem criar agentes próprios além dos defaults

---

### 10. Chat com IA (multi-modelo) 🔴 não implementado

- Seleção de modelo por conversa (provider + model id)
- Histórico de conversas por usuário/empresa
- Streaming por SSE
- Brain da empresa injetado como system prompt opcional
- Função "adaptar output": pega saída do chat e aciona agente Adapta
- Consumo amarrado ao `CreditLedger`
- Abstrair provider por interface `AiProvider` (troca de modelo sem refatorar consumidores)

---

### 11. Créditos 🔴 não implementado

Ledger em dois níveis:

- **Empresa**: pool principal, recarregado por plano/compra
- **Usuário**: subconta opcional gerenciada pelo admin da empresa

Modelagem:

```
CreditLedger  (id, orgId, userId?, amount, kind, referenceId, referenceType, createdAt)
```

Regras:
- Append-only (saldo = SUM das linhas)
- Resolve: debita do usuário se tiver quota, senão da empresa
- Pré-débito reservado antes de cada chamada, liberado ou confirmado no fim
- Endpoint `GET /credits/balance` → saldos separados empresa/usuário
- Bloquear execução quando saldo < custo estimado

---

### 12. Histórico de execuções 🔴 não implementado

- Listagem de `AgentRun` por empresa/usuário
- Filtros: agente, status, período
- Detalhe da execução (input, output, steps, créditos gastos)
- Vinculado ao `CreditLedger`

---

### 13. Tela "Minhas Empresas" 🔴 não implementado

- Lista de todas as empresas que o usuário participa
- Troca de empresa ativa
- Ponto de entrada do Painel Admin (visível apenas para admins globais)

---

### 14. Painel Admin 🔴 não implementado

Restrito a admins globais (Workana AI). Funcionalidades:

- Gestão de usuários e empresas
- Métricas globais (uso de IA, créditos, usuários ativos)
- Logs de auditoria e eventos de domínio
- Gerenciar modelos habilitados, limites e custos de IA
- Notificações de sistema (broadcast por empresa / global / segmento)
- Guard dedicado `@AdminOnly()` — não reaproveita permissão de empresa

---

### 15. Permissões beta (feature flags) 🔴 não implementado

Dois níveis: usuário e empresa.

```
FeatureFlag       (key, description, default)
UserFeatureFlag   (userId, flagKey, enabled)
CompanyFeatureFlag(companyId, flagKey, enabled)
```

- Resolve: `userFlag ?? companyFlag ?? defaultOff`
- Endpoint `GET /me/features` → retorna efetivo (frontend não decide hierarquia)
- Admin UI para listar flags e ativar/desativar em massa
- Guard `@RequiresFeature('beta.x')` no backend

---

### 16. Empresa Admin (Workana AI) 🔴 não implementado

- Campo `isAdminCompany` no modelo `Organization`
- Features beta ativadas por padrão na empresa admin
- Admin global é role de usuário, não de membro de empresa — dimensões separadas
- Configuração da empresa admin dentro do Painel Admin

---

## Próximos passos imediatos

1. Endurecer autorização do Brain (remover `userId` do body, guard correto no onboarding/publish)
2. Criar domínio persistido `CompanyBrain` separado do draft de onboarding
3. Modelar e implementar `Agent` + `Workflow` + `AgentRun`
4. Implementar agentes default (Adapta, Copy, Post, Imagem)
5. Implementar `CreditLedger` vinculado às execuções
6. Chat com IA + streaming SSE
7. Histórico de execuções na UI

---

## O que foi removido

- **Brain Assets** como camada genérica isolada: não devem mais ser interpretados como produto próprio do MVP. O contexto operacional fica em `Contexto` e os assets visuais/de marca migram para a feature `Design System`.
