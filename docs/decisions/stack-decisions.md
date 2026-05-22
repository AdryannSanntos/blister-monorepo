# Decisões de Stack — Workana AI

## Estrutura do Monorepo

- `apps/web`: frontend principal com `Next.js 16`, `React 19` e App Router
- `apps/api`: API principal com `NestJS 11`, auth, Prisma, CASL e futuras integrações realtime/storage
- `packages/authz`: catálogo compartilhado de ações, subjects, permissões e roles padrão
- `packages/types`: schemas e tipos Zod compartilhados
- `packages/configs`: presets TypeScript compartilhados

## Ferramentas de Base

- `pnpm` é o package manager oficial
- `Turborepo` coordena `dev`, `build`, `lint`, `test` e `typecheck`
- `Biome` é formatter/linter oficial
- `TypeScript strict` é obrigatório
- `Prisma` gera cliente em `apps/api/src/generated/prisma`, que nunca deve ser editado manualmente

## Frontend

- `Next.js 16` e `React 19` são a base da aplicação web
- `Tailwind CSS 4` usa tokens em `apps/web/src/app/globals.css`
- `shadcn/ui` em `apps/web/src/core/shared/components/ui` é a fundação dos componentes
- `react-hook-form` + `Zod` é o padrão de formulários
- `@tanstack/react-query` é dono do estado de servidor
- `@tanstack/react-table` é padrão para coleções de dados
- `Recharts` é a biblioteca padrão de gráficos
- `nuqs` é usado para estado compartilhável por URL
- `zustand` só é permitido para estado local de cliente que não pertence ao cache do servidor nem à URL
- `axios` é o cliente HTTP padrão
- `lucide-react` é a biblioteca de ícones
- `next-themes` usa light default com dark disponível
- `@xyflow/react` está aprovado para o builder visual de agentes

### Decisão: canvas especializado para agent builder

- motivo: o builder visual de agentes precisa de handles, edges, pan/zoom, seleção, extensibilidade para minimap e estado de grafo real
- restrição: toda primitive visual do canvas deve ser encapsulada e estilizada com os tokens do Workana AI
- risco aceito: a dependência adiciona peso de bundle, mitigado por carregamento apenas nas rotas do builder

## Backend

- `NestJS` controla HTTP, módulos e DI
- `Prisma` é o único cliente de banco permitido
- `better-auth` cuida apenas de login, signup, verificação de email, reset de senha e sessão
- Organizações, memberships, convites, roles, permissões, créditos e brain pertencem ao domínio da aplicação
- `CASL` é o motor de autorização via `packages/authz`
- `Zod` valida DTOs antes do service
- `Resend` é o serviço padrão para emails transacionais
- `socket.io` está aprovado para realtime futuro
- `@aws-sdk/client-s3` está aprovado para storage compatível com S3

## Domínio e Governança

- O produto se chama **Workana AI**
- O foco é B2B operacional para empresas que coordenam freelancers e times remotos
- O usuário pode participar de várias companies/workspaces
- A organização ativa é domínio próprio, não sessão do better-auth
- Toda empresa nasce com roles `owner`, `admin` e `member`
- Roles de sistema são imutáveis
- Um membro pode ter múltiplas roles e overrides individuais `allow`/`deny`
- Toda ação de produto tem permissão explícita no backend e frontend

## Estado Atual

Implementado: auth, organizações, memberships, roles/permissões, convites, onboarding draft, dashboard shell, assets e tela base de integrações.

Ainda pendente como domínio real: Brain persistido/versionado, créditos, agentes customizados, agente interno de contexto, histórico de execuções, automações, analytics e integrações reais.
