# Project Engineering Skill — Workana AI

## Objetivo

Skill base para qualquer tarefa neste monorepo. Estabelece regras de produto, arquitetura, permissões e implementação.

## Entendimento do Projeto

- **Workana AI** é uma camada de inteligência para empresas que coordenam freelancers, fornecedores e times remotos.
- O produto organiza Workspace, Company, Brain, Agentes, Créditos, Equipe, Permissões, Assets e Integrações.
- Estado atual: fundação técnica implementada; Brain persistido, créditos, agentes e histórico real ainda pendentes.

## Estrutura

```
apps/web          Next.js 16 + React 19
apps/api          NestJS 11 + Prisma + CASL
packages/authz    permissões, roles e ability CASL
packages/types    schemas/tipos Zod compartilhados
packages/configs  presets TypeScript
```

## Regras Invioláveis

- Toda mutação ou leitura sensível no backend precisa de `@RequirePermission(key)`.
- Toda ação de escrita/exclusão ou dado restrito no frontend precisa de `PermissionGate` ou `useAbility()`.
- `userId` vem sempre de `req.currentUser.id`, nunca do body.
- `orgId` vem de `req.params`, nunca do body.
- Endpoints públicos precisam de `@Public()` explícito.
- Nova permissão nasce em `packages/authz` antes de ser usada.
- Prisma é o único cliente de banco.
- `better-auth` trata apenas auth/sessão.
- Roles de sistema `owner`, `admin`, `member` são imutáveis.

## Regras Especificas de Agentes V1

- Workflow e versionamento sempre por agente, nunca por usuario.
- Chat geral sempre passa por agente de contexto interno.
- Delegacao para agente especializado mantem resposta no chat geral e registra detalhe no historico do agente delegado.
- Edicao de mensagem no chat cria branch novo de conversa.
- Conversa ativa bloqueia input enquanto execucao ativa estiver em andamento.
- Fila de execucao por empresa: maximo 3 simultaneas, overflow FIFO.
- Retry automatico maximo de 1 tentativa na mesma run/timeline.
- Retrieval de contexto deve ser permission-aware e sem segredos/credenciais.
- Arquivos gerados usam storage S3-compativel com referencias no payload da run.

## Produto e Linguagem

- Usar **Workana AI** como marca.
- Usar Brain, Agentes, Créditos, Workspace, Company e Integrações como termos de UI.
- Evitar linguagem genérica de chatbot.
- Nunca expor ranking, confiança, metadados ocultos ou contexto derivado da IA sem decisão explícita.
- Toda feature deve considerar como os dados serão usados por usuários e por agentes de IA.

## Stack

### Frontend
- Next.js 16, React 19, App Router
- Tailwind CSS v4 com tokens em `globals.css`
- shadcn/ui em `core/shared/components/ui`
- react-hook-form + Zod
- TanStack Query e TanStack Table
- Recharts, nuqs, zustand, axios, lucide-react

### Backend
- NestJS 11
- Prisma + PostgreSQL
- better-auth para auth/sessão
- CASL via `packages/authz`
- Zod para DTOs
- Resend para emails transacionais

## Fluxo Recomendado

1. Identificar domínio: web, api, authz, types, docs ou design system.
2. Ler `CLAUDE.md` e a skill específica da área.
3. Fazer a menor mudança correta.
4. Verificar autorização backend/frontend.
5. Validar coerência com `docs/prd/workana-ai-master.md`.
6. Rodar `pnpm typecheck` e testes aplicáveis.

## Ainda Não Implementado Como Domínio Real

- Brain persistido/versionado
- Créditos por empresa
- Agentes customizados e agente interno de contexto
- Histórico de execuções
- Integrações reais
- Automações e analytics
