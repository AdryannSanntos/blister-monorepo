# Frontend — Fluxo de Agentes

**Skill obrigatória:** `company-os-frontend` antes de qualquer implementação.

**Princípio central (regra 9 do CLAUDE.md):** cada tela deve ser operável por um leigo. Chat é a interface padrão para interagir com o agente. Formulários aparecem somente quando estritamente necessários.

**Backend disponível (todos os endpoints necessários já existem):**
- `GET/POST /organizations/:orgId/agents` — listar e criar agentes
- `GET/PATCH /organizations/:orgId/agents/:agentId` — detalhe e atualização
- `POST .../versions/draft` / `.../publish` / `.../activate` — versionamento
- `POST /organizations/:orgId/agents/:agentId/runs` — iniciar execução
- `GET /organizations/:orgId/agents/runs` / `.../runs/:runId` — histórico
- `GET/POST /organizations/:orgId/agents/:agentId/chat/threads` — threads
- `GET/POST .../threads/:threadId/messages` — mensagens
- `POST .../threads/:threadId/branch` / `.../regenerate` — edição e branch

---

## Estrutura de arquivos a criar

```
apps/web/src/
  app/dashboard/
    (shell)/                          ← route group com DashboardShell
      layout.tsx                      ← move DashboardShell pra cá
      workspace/
        brain/page.tsx                ← move existente
        context/page.tsx              ← move existente
        assets/page.tsx               ← move existente
        design-system/page.tsx        ← move existente
        team/page.tsx                 ← move existente
        permissions/page.tsx          ← move existente
        settings/page.tsx             ← move existente
        integrations/page.tsx         ← move existente
        agents/
          page.tsx                    ← catálogo de agentes
      account/
        settings/page.tsx             ← move existente
      invites/page.tsx                ← move existente
      notifications/page.tsx          ← move existente
      page.tsx                        ← move existente (dashboard home)

    (full-focus)/                     ← route group SEM DashboardShell
      layout.tsx                      ← só AuthGuard, sem shell
      workspace/
        agents/
          [agentId]/
            layout.tsx                ← FullFocusShell + AgentWorkspaceSidebar
            page.tsx                  ← redirect para /chat
            chat/page.tsx
            workflow/page.tsx
            executions/page.tsx
            settings/page.tsx
        chat/page.tsx                 ← chat da empresa (move para cá)

  core/modules/agents/
    hooks/
      use-agents.ts                   ← hooks reais (substituir stubs)
      use-agent-runs.ts               ← hooks reais (substituir stubs)
      use-agent-chat.ts               ← novo: threads, mensagens, branch
    pages/
      agents-page.tsx                 ← catálogo com DataTable
      agent-workspace-page.tsx        ← conteúdo da aba ativa (chat/workflow/etc)
    components/
      create-agent-dialog.tsx         ← dialog de criar agente (1 campo: nome)
      agent-workspace-sidebar.tsx     ← nav interna: Chat/Workflow/Execuções/Config
      chat/
        chat-input.tsx                ← campo de envio + bloqueio durante execução
        chat-message-bubble.tsx       ← bolha de mensagem (user/assistant)
        chat-branch-switcher.tsx      ← troca de branch após edição
        execution-inline-card.tsx     ← card de execução embutido no chat
        question-form-message.tsx     ← formulário inline (question_form block)
      executions/
        execution-timeline.tsx        ← timeline de steps de uma run
        run-detail-sheet.tsx          ← sheet lateral com detalhes da run
      workflow/
        flow-canvas.tsx               ← canvas do editor de workflow
        flow-block-node.tsx           ← nó de bloco draggable
        node-config-panel.tsx         ← painel de config do bloco selecionado
      settings/
        agent-settings-form.tsx       ← formulário de configurações do agente

  core/shared/layouts/
    full-focus-layout.tsx             ← layout base full-focus (h-svh, flex)
    full-focus-shell.tsx              ← shell com sidebar + área principal
```

---

## Task 1 — Estrutura de route groups (routing refactor)

**Objetivo:** separar rotas com DashboardShell (shell) das rotas full-focus (agente workspace, chat), sem quebrar nenhuma URL existente.

**Por que:** em Next.js App Router, `app/dashboard/layout.tsx` aplica DashboardShell para TODOS os filhos. Route groups `(shell)` e `(full-focus)` criam layouts separados sem alterar o URL.

- [ ] Criar `app/dashboard/(shell)/layout.tsx` com o conteúdo atual de `app/dashboard/layout.tsx`
- [ ] Mudar `app/dashboard/layout.tsx` para apenas `<AuthGuard>{children}</AuthGuard>` (sem DashboardShell)
- [ ] Mover todos os arquivos existentes de `app/dashboard/*` para `app/dashboard/(shell)/*`:
  - `workspace/brain/`, `workspace/context/`, `workspace/assets/`
  - `workspace/design-system/`, `workspace/team/`, `workspace/permissions/`
  - `workspace/settings/`, `workspace/integrations/`
  - `account/`, `invites/`, `notifications/`, `page.tsx`
- [ ] Criar `app/dashboard/(full-focus)/layout.tsx`:
  ```tsx
  export default function FullFocusLayout({ children }: { children: ReactNode }) {
    return <AuthGuard>{children}</AuthGuard>;
  }
  ```
- [ ] Verificar que todas as rotas existentes ainda funcionam sem erro 404

---

## Task 2 — Layout shared full-focus

**Objetivo:** componente reutilizável para chat da empresa e workspace do agente — ocupa h-svh, sidebar fixa à esquerda, área de conteúdo rolável à direita.

**Arquivo:** `src/core/shared/layouts/full-focus-layout.tsx`

- [ ] Implementar `FullFocusLayout`:
  ```tsx
  // Sidebar fixa (largura configurável) + área de conteúdo flex-1
  // h-svh, overflow-hidden no container, overflow-y-auto na área de conteúdo
  // Tokens: bg-[var(--bg-canvas)], bordas border-[var(--line-subtle)]
  export function FullFocusLayout({
    sidebar,
    children,
    sidebarWidth = 260,
  }: {
    sidebar: ReactNode;
    children: ReactNode;
    sidebarWidth?: number;
  }) { ... }
  ```
- [ ] Implementar `FullFocusShell` (wrapper com AuthGuard + FullFocusLayout para uso nos layouts das rotas):
  ```tsx
  // Inclui botão de voltar ao dashboard no topo da sidebar
  // Inclui estado de loading enquanto org não está disponível
  ```

---

## Task 3 — hooks reais: `use-agents.ts` e `use-agent-runs.ts`

**Objetivo:** substituir os stubs criados anteriormente por hooks reais com TanStack Query.

**Contrato de tipos (baseado no backend):**

```ts
// Agente
type Agent = {
  id: string; name: string; slug: string; description: string | null;
  status: 'draft' | 'active' | 'archived'; category: string;
  templateId: string | null; activeVersionId: string | null;
  createdAt: string; updatedAt: string;
  versions: AgentVersion[];
};

// Run
type AgentRun = {
  id: string; agentId: string; organizationId: string;
  status: 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
  queuePosition: number | null; inputPayload: unknown; outputPayload: unknown;
  errorMessage: string | null; creditDelta: number; technicalCost: number;
  createdByUserId: string; createdAt: string; updatedAt: string;
  steps: RunStep[];
};
```

- [ ] `useCompanyAgents(orgId)` — `GET /organizations/:orgId/agents`
- [ ] `useCompanyAgent(orgId, agentId)` — `GET /organizations/:orgId/agents/:agentId`
- [ ] `useCreateAgent(orgId)` — `POST /organizations/:orgId/agents`, invalida `['agents', orgId]`
- [ ] `useUpdateAgent(orgId, agentId)` — `PATCH`, invalida agente e lista
- [ ] `useArchiveAgent(orgId, agentId)` — PATCH com `{ status: 'archived' }`
- [ ] `useAgentRuns(orgId, filters?)` — `GET /organizations/:orgId/agents/runs`, polling a cada 3s quando há runs `queued` ou `running`
- [ ] `useAgentRun(orgId, runId)` — `GET .../runs/:runId`, polling a cada 2s quando status ativo
- [ ] `useCreateRun(orgId, agentId)` — `POST .../runs`
- [ ] `useSaveDraftVersion(orgId, agentId)` — `POST .../versions/draft`
- [ ] `usePublishVersion(orgId, agentId)` — `POST .../versions/:versionId/publish`
- [ ] `useActivateVersion(orgId, agentId)` — `POST .../versions/:versionId/activate`

---

## Task 4 — `use-agent-chat.ts`

**Objetivo:** hooks de chat por agente — threads, mensagens, envio, branch, regenerate.

```ts
type ChatThread = {
  id: string; title: string | null; agentId: string | null;
  parentThreadId: string | null; createdAt: string; updatedAt: string;
  _count: { messages: number };
};

type ChatMessage = {
  id: string; role: 'user' | 'assistant' | 'system'; content: string;
  metadata: unknown; agentRunId: string | null;
  editedFromMessageId: string | null; regeneratedFromMessageId: string | null;
  createdAt: string;
  agentRun?: {
    id: string; status: string; queuePosition: number | null;
    steps: Array<{ id: string; blockType: string; status: string; createdAt: string }>;
  } | null;
};
```

- [ ] `useAgentThreads(orgId, agentId)` — `GET .../chat/threads`, lista threads do agente para a sidebar
- [ ] `useAgentMessages(orgId, agentId, threadId)` — `GET .../threads/:threadId/messages`, polling a cada 2s quando última mensagem tem run ativo
- [ ] `useCreateThread(orgId, agentId)` — `POST .../chat/threads`, retorna thread criado
- [ ] `useSendMessage(orgId, agentId, threadId)` — `POST .../threads/:threadId/messages`
- [ ] `useEditAndBranch(orgId, agentId, threadId)` — `POST .../threads/:threadId/branch`, ao sucesso: navegar para nova thread branch
- [ ] `useRegenerateMessage(orgId, agentId, threadId)` — `POST .../threads/:threadId/regenerate`

---

## Task 5 — Catálogo de agentes (`agents-page.tsx`)

**Objetivo:** lista de agentes da empresa com DataTable. Ação primária: criar agente. Clicar em um agente navega para seu workspace.

**UX:** simplicidade — criar agente pede só o nome. Tudo mais é configurado depois no workspace.

**Arquivo:** `src/core/modules/agents/pages/agents-page.tsx`

- [ ] Usar `PageLayout` com `title="Agentes"`, `description="Seus agentes customizados"`, `actions={<CreateAgentButton />}`
- [ ] `DataTable` com colunas:
  - `name` (sortable, link para `/dashboard/workspace/agents/:id/chat`)
  - `status` (badge: draft=cinza, active=verde, archived=vermelho) (sortable)
  - `category` (sortable)
  - `updatedAt` formatado em `dd/MM/yyyy HH:mm` (sortable)
  - `actions` (dropdown: Abrir workspace, Arquivar)
- [ ] Filtros: status (`draft` / `active` / `archived`)
- [ ] Estado vazio: `EmptyState` com ícone Bot, título "Nenhum agente ainda", botão de criar
- [ ] Loading: 3 Skeletons

**Arquivo:** `src/core/modules/agents/components/create-agent-dialog.tsx`

- [ ] `Dialog` com apenas 1 campo: **Nome** (string, min 2, max 120) — sem slug, categoria, descrição no momento da criação. A IA pode sugerir depois.
- [ ] Ao confirmar: `useCreateAgent` → navegar para `/dashboard/workspace/agents/:newId/chat`
- [ ] Proteger botão de criar com `<PermissionGate permission="agent.create">`

---

## Task 6 — Workspace sidebar do agente (`agent-workspace-sidebar.tsx`)

**Objetivo:** sidebar interna do workspace do agente com navegação entre Chat / Workflow / Execuções / Configurações + lista de threads do agente.

**Arquivo:** `src/core/modules/agents/components/agent-workspace-sidebar.tsx`

- [ ] Header com nome do agente + badge de status (active=verde, draft=cinza)
- [ ] Link "← Voltar ao dashboard" no topo (fecha o full-focus)
- [ ] Nav interna com 4 items usando ícones:
  - `MessageCircle` → `/chat` (Chat)
  - `GitBranch` → `/workflow` (Workflow)
  - `History` → `/executions` (Execuções)
  - `Settings` → `/settings` (Configurações)
- [ ] Item ativo destacado com `bg-[var(--bg-raised)]` e borda esquerda `border-[var(--accent)]`
- [ ] Seção "Conversas" abaixo da nav: lista de threads com `useAgentThreads`, ao clicar navega para a thread e ativa a aba Chat
- [ ] Estado de execução em andamento: badge `Executando` pulsante no item de Chat quando há run ativo

---

## Task 7 — Chat do agente (aba Chat)

**Esta é a tela principal e deve receber o maior cuidado de UX.**

**Princípio:** o usuário escreve em linguagem natural, o agente responde. A IA decide se precisa rodar uma execução. O resultado aparece direto no chat. Refinamentos são feitos por conversa.

**Arquivo:** `src/core/modules/agents/pages/agent-workspace-page.tsx` (slot para a aba chat)

### Input de chat

- [ ] `chat-input.tsx` — textarea expansível (1 linha → máx 6 linhas auto-grow)
- [ ] Envio por `Enter` (sem Shift), quebra de linha por `Shift+Enter`
- [ ] **Bloqueio total do input** enquanto thread tem run `queued` ou `running` — exibir mensagem "Aguardando execução..." abaixo do campo
- [ ] Botão enviar com ícone `Send`, desabilitado quando vazio ou bloqueado
- [ ] Ao enviar: criar thread se não existe, enviar mensagem, polling automático

### Bolhas de mensagem

- [ ] `chat-message-bubble.tsx`:
  - Mensagens do usuário: alinhadas à direita, bg `var(--bg-raised)`
  - Mensagens do assistente: alinhadas à esquerda, sem background
  - Markdown renderizado nas mensagens do assistente
  - Hover em mensagem do usuário: exibir dropdown com "Editar" e "Copiar"
  - Hover em mensagem do assistente: exibir dropdown com "Copiar" e "Regenerar"
  - "Editar" em mensagem do usuário: abre o texto no input para re-envio como branch
  - Timestamp discreto abaixo de cada mensagem em `var(--fg-quaternary)`

### Execução embutida no chat

- [ ] `execution-inline-card.tsx` — quando uma mensagem dispara uma run:
  - Card compacto logo abaixo da mensagem do usuário
  - Status com ícone animado (queued=relógio, running=spinner, completed=check, error=X)
  - Posição na fila se `status === 'queued'`
  - Progress de steps: `"2 de 5 etapas"` com barra de progresso fina
  - Clique abre o `run-detail-sheet.tsx` lateral
  - Polling automático a cada 2s quando ativo

### Branch switcher

- [ ] `chat-branch-switcher.tsx` — quando a thread tem `parentThreadId`:
  - Banner discreto no topo: `"Branch da conversa original · Ver original"`
  - Ao clicar em "Ver original": navega para thread pai

### Seleção inicial de thread

- [ ] Ao entrar na aba Chat sem thread ativa: mostrar tela de boas-vindas com nome do agente, descrição e campo de envio já visível (sem precisar clicar em "Nova conversa")
- [ ] Sidebar lista threads — clicar carrega a thread

---

## Task 8 — Timeline de execução (`execution-timeline.tsx` + `run-detail-sheet.tsx`)

**Arquivo:** `src/core/modules/agents/components/executions/execution-timeline.tsx`

- [ ] Lista vertical de steps com ícone por `blockType`:
  - `intent_classification` → `Brain`
  - `context_retrieval` → `Database`
  - `llm_call` → `Sparkles`
  - `html_validation` → `FileCode2`
  - `output_storage` → `HardDrive`
  - `attempt` → `RefreshCw` (retry)
- [ ] Cada step: ícone de status (spinner=running, check=completed, X=error), label, duração em ms formatada, chevron para expandir metadata
- [ ] Step de retry: destacado com badge `Tentativa 2` em amarelo
- [ ] Animação de entrada para steps novos (via `animate-in slide-in-from-top-1`)
- [ ] Prop `defaultExpanded: boolean` — colapsado no chat, expandido na aba Execuções

**Arquivo:** `src/core/modules/agents/components/executions/run-detail-sheet.tsx`

- [ ] Sheet lateral `w-[480px]` com:
  - Header: status badge + nome do agente + data
  - Timeline completa (expandida)
  - Output: tabs com Texto / Arquivos (PDF, imagens) se existirem
  - Créditos consumidos e custo técnico
  - Botão "Compartilhar link" (soon=true por enquanto)

---

## Task 9 — Aba Execuções (`executions/page.tsx`)

**Objetivo:** histórico de todas as runs do agente com DataTable.

- [ ] `PageLayout` com `title="Execuções"` dentro do workspace full-focus
- [ ] `useAgentRuns(orgId, { agentId })` com filtro por agentId
- [ ] `DataTable` com colunas:
  - `status` (badge colorido) (sortable)
  - `createdAt` formatado (sortable)
  - `creditDelta` (sortable)
  - `steps` count (não sortable)
  - `actions` (dropdown: Ver detalhes, Reexecutar)
- [ ] Filtros: status (`queued` / `running` / `completed` / `error`)
- [ ] Clicar em uma linha: abre `run-detail-sheet.tsx`
- [ ] Polling a cada 3s quando há runs ativas
- [ ] Bulk action: nenhum (runs são imutáveis)

---

## Task 10 — Aba Workflow (`workflow/page.tsx`)

**Objetivo:** editor visual de blocos do workflow do agente. Foco em V1: visualização do flow com edição básica.

**Atenção UX:** o workflow não é exposto ao usuário final — é configuração de admin/owner do agente.

- [ ] `PermissionGate permission="agent.update"` envolvendo todo o editor
- [ ] Canvas com lista de blocos em sequência (V1: linear, sem drag complexo)
- [ ] Cada bloco: `flow-block-node.tsx` com ícone do tipo + label + botão de config
- [ ] Painel lateral `node-config-panel.tsx`: campos de configuração do bloco selecionado
- [ ] Toolbar: `Salvar rascunho` / `Publicar versão` / `Ativar versão`
- [ ] Badge de versão ativa no header (ex: `v3 · ativa`)
- [ ] Estado vazio: "Nenhum workflow configurado — adicione o primeiro bloco"

---

## Task 11 — Aba Configurações (`settings/page.tsx`)

**Objetivo:** configurações do agente. Mínimo necessário — sem excesso de campos.

**UX:** somente o que o usuário realmente precisa decidir. Nome, descrição e limites de execução.

- [ ] `PermissionGate permission="agent.update"` no botão de salvar
- [ ] `agent-settings-form.tsx` com react-hook-form + Zod:
  - `name` (string, min 2, max 120)
  - `description` (textarea, max 500, opcional)
  - Seção "Limites de execução" (collapsible, fechado por padrão):
    - `timeoutMs` (number, default 30000, min 5000)
    - `maxFilesPerExecution` (number, default 3, min 1, max 10)
- [ ] Zona de perigo (separada, collapsible): botão "Arquivar agente" com `ConfirmationDialog`
- [ ] `PermissionGate permission="agent.delete"` no botão de arquivar

---

## Task 12 — Rota index `[agentId]/page.tsx`

- [ ] Server component que faz redirect para `/dashboard/workspace/agents/:agentId/chat`

---

## Verificação final

- [ ] Nenhuma rota existente quebrada após o route group refactor
- [ ] Nenhuma tela sem `PermissionGate` em ação sensível
- [ ] Chat: input bloqueado durante run ativa
- [ ] Chat: animações de entrada de mensagens funcionando (`tw-animate-css`)
- [ ] Polling não ativo quando não há runs ativas (sem requisições desnecessárias)
- [ ] Criar agente: apenas 1 campo (nome)
- [ ] `pnpm --filter @company-os/web lint` passa
