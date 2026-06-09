# Frontend — Fluxo de Chat da Empresa

**Skill obrigatória:** `company-os-frontend` antes de qualquer implementação.

**Princípio central (regra 9 do CLAUDE.md):** o chat da empresa é a interface mais simples do produto. O usuário escreve qualquer coisa em linguagem natural. A IA entende, busca contexto da empresa, responde ou delega para o agente certo. Sem escolha de agente, sem configuração upfront, sem inputs extras.

**Contrato (decisão 2026-05-22):**
- Chat geral sempre roda via agente de contexto interno da empresa.
- Se a mensagem exige execução e há agentes customizados, delega automaticamente.
- Resultado da delegação aparece no mesmo chat (não abre outro fluxo).
- Layout full-focus — não usa DashboardShell.

**Backend disponível:**
- `POST /organizations/:orgId/company-chat/messages` → envia mensagem, cria thread se não existir ✅
- `GET /organizations/:orgId/company-chat/threads` → lista threads ✅
- `GET /organizations/:orgId/company-chat/threads/:threadId/messages` → mensagens com run embutida ✅

---

## Estrutura de arquivos a criar

```
apps/web/src/
  app/dashboard/(full-focus)/workspace/chat/
    page.tsx                          ← server component, importa CompanyChatPage

  core/modules/company-chat/
    hooks/
      use-company-chat.ts             ← queries e mutations do chat da empresa
    pages/
      company-chat-page.tsx           ← página full-focus completa
    components/
      company-chat-sidebar.tsx        ← sidebar: conversas + atividade em andamento + atalhos
      company-chat-input.tsx          ← campo de envio com bloqueio durante execução ativa
      company-chat-message-bubble.tsx ← bolha adaptada para contexto da empresa
      delegation-card.tsx             ← card que aparece quando chat delega para um agente
      create-agent-suggestion-card.tsx ← card sugerindo criar agente (fallback_mode=context_agent)
```

---

## Task 1 — `use-company-chat.ts`

**Contrato de tipos:**

```ts
type CompanyChatThread = {
  id: string;
  title: string | null;
  scope: 'company_chat';
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

type CompanyChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: unknown;
  agentRunId: string | null;
  createdAt: string;
  agentRun?: {
    id: string; status: string; queuePosition: number | null;
    steps: Array<{ id: string; blockType: string; status: string; createdAt: string }>;
  } | null;
};

// Resposta do POST /company-chat/messages
type CompanyChatResult = {
  threadId: string;
  message: { id: string; content: string; role: string };
  delegatedToAgentId?: string;
  delegatedExecutionId?: string;
  fallbackMode?: 'context_agent';
  cards: Array<{ type: string; metadata?: Record<string, unknown> }>;
  responseTarget: 'company_chat';
  contextSources: Array<{ sourceLabel: string; snippet: string; score: number }>;
};
```

- [ ] `useCompanyThreads(orgId)` — `GET /organizations/:orgId/company-chat/threads`
  - Lista threads da empresa para a sidebar, ordenadas por `updatedAt` desc
  - `enabled: Boolean(orgId)`

- [ ] `useCompanyMessages(orgId, threadId)` — `GET .../threads/:threadId/messages`
  - `enabled: Boolean(orgId) && Boolean(threadId)`
  - Polling a cada 2s quando última mensagem tem `agentRun` com status `queued` ou `running`
  - Parar polling quando run completa ou erro

- [ ] `useSendCompanyMessage(orgId)` — `POST /organizations/:orgId/company-chat/messages`
  - Payload: `{ content: string, threadId?: string }`
  - `onSuccess`: invalidar `['company-threads', orgId]` e `['company-messages', orgId, threadId]`
  - Retorna `CompanyChatResult` — o `threadId` da resposta é usado para polling

---

## Task 2 — `company-chat-sidebar.tsx`

**Objetivo:** sidebar lateral do chat da empresa com 3 seções: nova conversa, conversas recentes, atividade em andamento.

**Layout da sidebar:**
```
┌─────────────────────────────┐
│  ← Dashboard                │  (link de volta)
│  Chat da empresa            │  (título)
├─────────────────────────────┤
│  + Nova conversa            │  (botão primário)
├─────────────────────────────┤
│  EM ANDAMENTO               │  (seção — aparece só se houver runs ativas)
│  ○ Gerando briefing         │  (item com spinner)
│  ○ Criando imagem...        │
├─────────────────────────────┤
│  RECENTES                   │
│  Briefing para campanha     │  (threads recentes)
│  Análise de mercado         │
│  ...                        │
└─────────────────────────────┘
```

- [ ] Link "← Dashboard" no topo com `href="/dashboard"` e ícone `ArrowLeft`
- [ ] Título `"Chat"` em `text-[15px] font-semibold text-[var(--fg-primary)]`
- [ ] Botão `"+ Nova conversa"` — ao clicar: limpar thread ativa do estado local, focar no input
- [ ] Seção "Em andamento" (visível somente quando `threads` têm mensagens com runs ativas):
  - Cada item: ícone spinner animado + título da thread truncado + "em andamento"
  - Clicar: navega para a thread
- [ ] Seção "Recentes": lista de threads ordenadas por `updatedAt`, clicar carrega a thread
- [ ] Thread ativa: destacada com `bg-[var(--bg-raised)]` e borda esquerda `border-[var(--accent)]`
- [ ] Estado vazio (sem threads): nada exibido, apenas o botão de nova conversa

---

## Task 3 — `company-chat-input.tsx`

**Objetivo:** campo de texto simples, potente e com feedback claro de estado.

- [ ] Textarea expansível: 1 linha → máx 5 linhas com auto-grow
- [ ] Placeholder: `"Pergunte qualquer coisa sobre sua empresa…"`
- [ ] `Enter` envia, `Shift+Enter` quebra linha
- [ ] Botão enviar com ícone `Send`, `size="icon"`, à direita do campo
- [ ] **Bloqueio total durante execução ativa:**
  - Campo desabilitado (`disabled`)
  - Placeholder muda para `"Aguardando resposta…"`
  - Spinner discreto no lugar do botão de enviar
  - Animação `animate-pulse` no campo para indicar atividade
- [ ] Ao enviar: chamar `useSendCompanyMessage`, passar `threadId` se thread ativa
- [ ] Estado de erro do envio: `toast.error("Erro ao enviar mensagem")` via sonner

---

## Task 4 — `company-chat-message-bubble.tsx`

**Objetivo:** exibir mensagens do chat da empresa com contexto de delegação e fontes.

- [ ] Mensagens do usuário: alinhadas à direita, `bg-[var(--bg-raised)]`, `rounded-[var(--r-lg)]`
- [ ] Mensagens do assistente: alinhadas à esquerda, sem background, Markdown renderizado
- [ ] Hover em mensagem do assistente: botão "Copiar" discreto (`opacity-0 group-hover:opacity-100`)
- [ ] Timestamp em `text-[11px] text-[var(--fg-quaternary)]` abaixo de cada mensagem
- [ ] Animação de entrada: `animate-in slide-in-from-bottom-2 fade-in` para novas mensagens

---

## Task 5 — `delegation-card.tsx`

**Objetivo:** quando o chat delega para um agente (`delegatedToAgentId` na resposta), exibir um card informativo e acompanhar o status da run delegada.

```
┌──────────────────────────────────────────────────────┐
│  🤖 Delegado para: Agente de Briefing                │
│  ○ Executando... (etapa 2 de 4)                      │
│  ▶ Ver detalhes da execução →                        │
└──────────────────────────────────────────────────────┘
```

- [ ] Card com `border border-[var(--line-default)] rounded-[var(--r-md)] p-4 bg-[var(--bg-raised)]`
- [ ] Ícone `Bot` + nome do agente delegado (buscar de `useCompanyAgents` pelo ID)
- [ ] Status da run embutida:
  - `queued`: "Na fila (posição X)" com ícone relógio
  - `running`: "Executando… (etapa N de M)" com spinner animado + barra de progresso fina
  - `completed`: "Concluído ✓" em verde
  - `error`: "Erro na execução" em vermelho com botão "Ver detalhes"
- [ ] Link "Ver execução →" que navega para `/dashboard/workspace/agents/:agentId/executions` com o run destacado
- [ ] Polling via `useAgentRun(orgId, runId)` a cada 2s quando status ativo

---

## Task 6 — `create-agent-suggestion-card.tsx`

**Objetivo:** quando não há agentes customizados (`fallbackMode === 'context_agent'`), sugerir criar um agente.

```
┌──────────────────────────────────────────────────────┐
│  💡 Você ainda não tem agentes customizados          │
│  Crie um agente especializado para automatizar        │
│  tarefas recorrentes da sua empresa.                 │
│  [Criar meu primeiro agente →]                       │
└──────────────────────────────────────────────────────┘
```

- [ ] Card com `border border-[var(--line-default)] rounded-[var(--r-md)] p-4`
- [ ] Ícone `Lightbulb` + título + descrição em 2 linhas
- [ ] Botão "Criar meu primeiro agente →" → navega para `/dashboard/workspace/agents` e abre o dialog de criar
- [ ] Exibir apenas uma vez por sessão (não repetir em cada mensagem da conversa)
- [ ] `PermissionGate permission="agent.create"` no botão (esconder se não tiver permissão, exibir só texto)

---

## Task 7 — `company-chat-page.tsx`

**Objetivo:** página full-focus do chat da empresa. Integra sidebar + área de mensagens + input.

**Layout:**
```
┌────────────┬────────────────────────────────────────┐
│  Sidebar   │  [Header: thread ativa ou "Nova conv"]  │
│  260px     │                                         │
│            │  [mensagens]                            │
│            │                                         │
│            │  [DelegationCard se delegado]           │
│            │                                         │
│            │  [ChatInput fixo no rodapé]             │
└────────────┴────────────────────────────────────────┘
```

- [ ] Usar `FullFocusLayout` com `sidebar={<CompanyChatSidebar />}`
- [ ] Estado local: `threadId` (string | null) — começa `null`, é setado após envio ou seleção de thread
- [ ] Área de mensagens:
  - Scroll automático para baixo quando nova mensagem chega (`useEffect` + `ref.scrollIntoView`)
  - `useCompanyMessages(orgId, threadId)` só quando `threadId` não é null
  - Loading de mensagens: 3 skeleton bubbles
- [ ] Tela inicial (sem thread): área central com:
  - Logo/ícone da empresa (Avatar com iniciais)
  - `"Olá, {nome}. Como posso ajudar a empresa hoje?"`
  - Campo de input já visível — a primeira mensagem cria a thread automaticamente
- [ ] Após primeira mensagem: `threadId` recebe valor do `CompanyChatResult.threadId`
- [ ] Cards de resultado embutidos logo após a mensagem do assistente correspondente:
  - `DelegationCard` quando `delegatedToAgentId` presente
  - `CreateAgentSuggestionCard` quando `fallbackMode === 'context_agent'`
- [ ] Polling de mensagens ativo somente quando há run ativa na thread

---

## Task 8 — Rota `app/dashboard/(full-focus)/workspace/chat/page.tsx`

- [ ] Server component simples:
  ```tsx
  import { CompanyChatPage } from 'src/core/modules/company-chat/pages/company-chat-page';
  export default function Page() { return <CompanyChatPage />; }
  ```
- [ ] Esta rota está no route group `(full-focus)` — sem DashboardShell

---

## Verificação final

- [ ] Rota `/dashboard/workspace/chat` resolve corretamente no route group `(full-focus)`
- [ ] Input bloqueado durante execução ativa (run `queued` ou `running` na thread)
- [ ] Nova conversa: primeiro input cria thread automaticamente (sem dialog upfront)
- [ ] Card de delegação com polling atualiza status da run em tempo real
- [ ] Card de sugestão de agente aparece no máximo uma vez por sessão
- [ ] Scroll automático para última mensagem ao receber resposta
- [ ] Animações de entrada de mensagens funcionando (`tw-animate-css`)
- [ ] `PermissionGate permission="agent.execute"` — página mostra `EmptyState` se sem permissão
- [ ] `pnpm --filter @company-os/web lint` passa
