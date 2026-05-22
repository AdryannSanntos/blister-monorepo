# Workana AI — Monorepo

## O que é este projeto

Workana AI é uma camada de inteligência para empresas que contratam, coordenam e escalam trabalho com freelancers, fornecedores e times remotos. O produto organiza contexto, briefings, demandas, agentes de IA, créditos, equipe, permissões e integrações dentro de um workspace por empresa.

**Fase atual:** fundação técnica implementada. Auth, organizações, memberships, roles, permissões, convites, onboarding inicial, dashboard shell, assets e tela base de integrações existem. Brain persistido, agentes, créditos e histórico de execuções ainda precisam evoluir como domínios próprios.

---

## Estrutura do monorepo

```
apps/
  web/    Next.js 16 + React 19 — frontend principal
  api/    NestJS 11 — API REST, auth, Prisma, CASL
packages/
  authz/  Catálogo de permissões CASL, roles padrão, mapa de permissões
  types/  Schemas e tipos Zod compartilhados
  configs/ Presets TypeScript compartilhados
```

---

## Regras invioláveis

### 1. Toda ação tem permissão

**Backend:** todo endpoint de mutação ou dado sensível deve ter `@RequirePermission(key)`.
**Frontend:** toda UI com ação de escrita, exclusão ou dado restrito deve ter `<PermissionGate permission="key">` ou verificação via `useAbility()`.

Não existe entrega de feature sem guards e checks de UI implementados.

### 2. userId nunca vem do body

`userId` vem sempre de `req.currentUser.id`.
`orgId` vem de `req.params` — nunca do body.

### 3. Novos endpoints com guard ou @Public explícito

`AuthGuard` é global. Sem `@Public()`, todo endpoint requer autenticação automaticamente.
Endpoints intencionalmente públicos devem ter `@Public()` explícito.

### 4. Nova permissão: packages/authz primeiro

1. Declarar em `packages/authz/src/index.ts` (`AppPermissionKey`, `allPermissionKeys`, `permissionMap`, roles padrão)
2. Rodar seed de roles padrão quando aplicável
3. Usar `@RequirePermission('nova.chave')` no controller
4. Usar `<PermissionGate permission="nova.chave">` no frontend

### 5. Prisma é o único cliente de banco

Sem SQL raw avulso, sem outro ORM, sem acesso direto fora do `PrismaService`.
Nunca editar `apps/api/src/generated/prisma` manualmente.

### 6. better-auth trata apenas auth e sessão

`better-auth` cuida de login, signup, verificação de email, reset de senha e sessão.
Organização ativa, convites, memberships, roles, permissões, créditos e brain pertencem ao domínio da aplicação.
`useActiveOrganization()` — nunca assumir org a partir da sessão better-auth.

### 7. Roles de sistema são imutáveis

`owner`, `admin` e `member` não podem ser renomeados nem deletados.
Não é possível remover o último owner de uma organização.
Um membro pode ter múltiplas roles simultâneas.

### 8. Dados em tabela por padrão

Coleções de entidades de dados (membros, roles, convites, permissões, execuções, créditos, logs, integrações, assets, agentes) devem ser renderizadas em tabela usando o componente `<DataTable>` de `src/core/shared/components/ui/data-table.tsx`.

Exceções aceitas: pickers, controles de formulário, onboarding, showcases visuais e cards com hierarquia visual intrínseca.

**Toda tabela operacional deve nascer com os controles abaixo — não são opcionais:**

- **Sort:** ativar `enableSorting: true` (ou omitir — padrão é `true`) na `ColumnDef` de toda coluna com ordenação útil. Omitir apenas em colunas visuais, `actions` e `select`.
- **Configuração de colunas:** automático quando a coluna não tem `enableHiding: false`; o icon button `Columns3` aparece na toolbar direita sem configuração adicional.
- **Seleção:** passar `bulkActions` ou `exportOptions` em `<DataTable>` habilita automaticamente `enableRowSelection`, coluna de checkbox e select-all no header — os checkboxes ficam verticalmente alinhados (coluna `w-px` centrada).
- **Filtros:** passar a prop `filters` com `DataTableFilter[]`; cada filtro define `id`, `label` e `options` com predicados específicos do fluxo. O icon button `SlidersHorizontal` aparece na toolbar esquerda automaticamente.
- **Floating footer de seleção:** aparece automaticamente quando há linhas selecionadas e `footerActions` (bulk actions + export). É sticky na área de conteúdo (`sticky bottom-4`), não na viewport. Ações padrão: exportar CSV e exportar PDF (via `exportOptions`). Ações extras via `bulkActions` — sempre incluir excluir quando a permissão existir.

### 9. Simplicidade radical — a IA trabalha, o usuário guia

**Esta é uma regra crítica e inviolável de produto.**

O sistema deve ser operável por qualquer pessoa, inclusive quem nunca usou IA. Antes de criar qualquer fluxo ou tela, pergunte: *"a pessoa consegue usar isso sem ler um tutorial?"*

**Princípios obrigatórios:**

- **Zero formulários desnecessários.** Se a IA pode inferir a informação pelo contexto ou por conversa, não peça upfront. Formulários com mais de 2–3 campos para iniciar uma tarefa são um sinal vermelho.
- **Chat como interface padrão para qualquer geração.** Geração de imagem, copy, e-mail, briefing, post — tudo começa com o usuário escrevendo em linguagem natural. A IA faz perguntas se precisar de mais contexto. O resultado aparece direto no chat. O usuário refina por conversa.
- **Iteração no chat, não em formulários.** Após a IA gerar algo (imagem, texto, PDF), o usuário pede ajustes escrevendo. Nunca redirecionar para um formulário de edição.
- **Inputs só quando estritamente necessários.** Se um campo pode ser evitado (inferido, sugerido pela IA, ou perguntado no chat), ele não deve existir na UI.
- **Ações em 1 clique sempre que possível.** O usuário não deve navegar por múltiplas telas para completar uma tarefa rotineira.
- **A IA assume defaults inteligentes.** Ao criar um agente, iniciar uma execução ou configurar algo, a IA preenche o que sabe e expõe apenas o que é realmente decisão do usuário.

**Exemplo correto:** fluxo de gerar imagem = campo de texto livre ("descreva a imagem") + botão enviar → imagem aparece no chat → usuário pede ajustes no mesmo chat.

**Exemplo errado:** formulário com campos de estilo, resolução, formato, tom, referência de cor, etc. antes de gerar qualquer coisa.

Violar esta regra em qualquer nova tela ou componente é equivalente a violar a regra de permissões — bloqueia a entrega.

### 10. Animações são parte da experiência — nunca omitir

Todo componente interativo deve ter suas animações padrão funcionando: modals, selects, dropdowns, drawers, toasts, accordions, etc.

**Stack de animação:**
- Tailwind CSS v4 usa o pacote `tw-animate-css` (importado via `@import "tw-animate-css"` em `globals.css` — é CSS puro, não plugin JS)
- Utilities necessárias: `animate-in`, `animate-out`, `fade-in-*`, `fade-out-*`, `zoom-in-*`, `zoom-out-*`, `slide-in-from-*`, `slide-out-to-*`
- Animações de accordion/collapsible: definidas como `@keyframes` em `globals.css` e expostas como `--animate-*` CSS vars

Ao instalar ou recriar componentes shadcn/ui, verificar que `tw-animate-css` está presente e o `@plugin` está declarado. Sem o plugin, todas as animações de entrada/saída de overlays ficam silenciosamente desabilitadas.

### 11. Convenção de rotas: workspace vs. dashboard

```
/workspace/*  →  fora de qualquer empresa  (selecionar/criar workspace)
/dashboard/*  →  dentro de uma empresa     (requer org ativa)
/onboarding/* →  dentro de uma empresa     (requer org ativa)
/auth/*       →  autenticação              (redireciona se já tem sessão)
```

O proxy (`apps/web/src/proxy.ts`) aplica essas regras automaticamente via cookies:
- `better-auth.session_token` — presença indica sessão ativa
- `company-os-active-org` — presença indica empresa selecionada
- Ao entrar em `/workspace/*`, o proxy limpa a empresa ativa para garantir contexto fora de qualquer company

Regras de redirect:
- `/dashboard/*` ou `/onboarding/*` sem sessão → `/auth/login?next=<path>`
- `/dashboard/*` ou `/onboarding/*` com sessão mas sem org → `/workspace/select`
- `/workspace/*` sem sessão → `/auth/login?next=<path>`
- `/workspace/*` com sessão → navegação fora de company, sem `activeOrgId` persistido
- `/auth/*` com sessão → `/app` (que resolve org e redireciona)

Nunca usar `DashboardShell` em rotas `/workspace/*`, nem `WorkspaceShell` em rotas `/dashboard/*`.

---

## Produto e linguagem

- Nome do produto: **Workana AI**
- Foco: empresas que coordenam trabalho com freelancers, fornecedores e times remotos
- Termos internos de UI: Workspace, Company, Brain, Agentes, Créditos, Integrações
- Evitar linguagem genérica de chatbot; o produto é operacional, B2B e orientado a execução
- A camada interna de IA nunca deve expor ranking, confiança, metadados ocultos ou contexto derivado sem decisão explícita

---

## Stack resumida

### Frontend
- Next.js 16, React 19, App Router
- Tailwind CSS v4 com tokens em `globals.css`
- shadcn/ui em `core/shared/components/ui/`
- react-hook-form + Zod
- TanStack Query e TanStack Table
- Recharts, nuqs, zustand, axios, lucide-react
- next-themes com light default e dark disponível

### Backend
- NestJS 11
- Prisma + PostgreSQL
- better-auth para auth/sessão
- CASL via `packages/authz`
- Zod para DTOs
- Resend para emails transacionais
- socket.io e S3-compatible previstos para evolução

---

## Catálogo de permissões atual

`company.read/update/delete` · `member.read/invite/update/remove` · `role.read/create/update/delete` · `permission.read` · `onboarding.publish` · `brain.read/update` · `asset.read/create/update/archive/context.review` · `skill.read/execute` · `integration.read` · `output.read/review`

---

## Ordem de execução do produto

1. Auth
2. Criação/seleção de workspace
3. Convites
4. Onboarding curto da empresa
5. Brain inicial
6. Dashboard operacional
7. Equipe, roles e permissões
8. Assets e fontes do brain
9. Créditos por empresa
10. Agentes default
11. Histórico de execuções
12. Integrações
13. Templates de briefing
14. Automações e analytics

**Estado atual:** Auth, workspace, convites, roles/permissões, onboarding draft, dashboard shell, assets e shell de integrações já existem. Brain persistido, créditos, agentes e histórico real ainda faltam.
