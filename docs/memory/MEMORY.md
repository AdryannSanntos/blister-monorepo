# Memória de Mudanças Frontend — Workana AI

> Registro das funcionalidades adicionadas/alteradas no frontend, por sessão de trabalho.
> Formato: data · funcionalidade · fluxo afetado · como funciona.

---

<!-- As entradas serão adicionadas abaixo conforme as mudanças forem feitas -->

---

## 2026-05-29 — Melhorias na sidebar do workspace de agente

**Arquivos:** `apps/web/src/core/modules/dashboard/components/sidebar-triggers.tsx`, `apps/web/src/core/modules/agents/components/agent-workspace-sidebar.tsx`

### Acesso ao admin de plataforma no menu do usuário
- **Fluxo:** sidebar do dashboard e sidebar do workspace de agente → menu do usuário
- **Como funciona:** `UserTrigger` agora consulta `usePlatformRoleAccess()`. Quando o usuário possui `platform_owner` ou `platform_admin`, aparece a ação `Admin de plataforma` no topo do menu, navegando para `/workspaces/admin`.

### Header do agente virou seletor de agentes
- **Fluxo:** workspace de agente → header da sidebar
- **Como funciona:** o card do agente no topo da sidebar agora abre um `DropdownMenu` no mesmo padrão visual do seletor da sidebar principal. A lista mostra os agentes não arquivados disponíveis na organização. Ao trocar de agente, a navegação mantém a seção atual do workspace (`/chat`, `/workflow`, `/executions` ou `/settings`) e remove dependência da thread atual ao entrar no novo agente.

## 2026-05-29 — Sidebar do workspace de agente

**Arquivo:** `apps/web/src/core/modules/agents/components/agent-workspace-sidebar.tsx`

### Item "Insights" adicionado
- **Fluxo:** workspace de agente → sidebar → grupo do agente
- **Como funciona:** item estático com `BarChart2` (lucide-react) e `soon: true` — aparece como "Em breve" acima de Workflow no grupo nomeado com o nome do agente.

### "Nova conversa" movida para o grupo do agente
- **Fluxo:** workspace de agente → sidebar → grupo do agente
- **Como funciona:** o item "Nova conversa" foi removido do grupo CONVERSAS e colocado como 4º item do grupo do agente (após Configurações). Mantém a mesma lógica de `handleNewThread`.

### Limite de 3 conversas + "Ver mais"
- **Fluxo:** workspace de agente → sidebar → grupo CONVERSAS
- **Como funciona:** estado `showAllThreads` (default `false`). Enquanto `false`, exibe no máximo 3 threads (`threadItems.slice(0, 3)`). Quando `threadItems.length > 3`, aparece item extra com `ChevronDown`/`ChevronUp` e label `+N conversas` / `Ver menos`. Clicar alterna o estado.

---

## 2026-05-29 — Redesign das mensagens do chat de agente

**Arquivos:** `chat-message-bubble.tsx`, `user-message.tsx`, `globals.css`

### Agent bubble = mesmo visual que user bubble
- **Fluxo:** workspace de agente → chat → mensagens do agente
- **Como funciona:** removido o card com header (Bot icon + título "Agente" + subtítulo "Resposta gerada"). O bubble do agente agora usa `rounded-an-message bg-an-user-message-bg px-5 py-3 text-sm` — visualmente idêntico ao bubble do usuário, diferenciado apenas pelo alinhamento (esquerda para agente, direita para usuário). Conteúdo interno (Markdown, ToolRenderer, SpiralLoader) permanece igual. `ExecutionInlineCard` continua fora do bubble.

### Max 80% para ambas as mensagens
- **Fluxo:** workspace de agente → chat → mensagens
- **Como funciona:** outer wrapper de ambas as mensagens agora usa `max-w-[80%]`. O `ms-[70px] max-w-[calc(95%-40px)]` que existia no `user-message.tsx` foi removido e substituído por `w-full` — isso eliminava o espaço disponível para o texto, causando quebra de linha antes do necessário.

### Buttons de ação mais próximos da mensagem
- **Fluxo:** workspace de agente → chat → hover de mensagem
- **Como funciona:** o footer (timestamp + botões Copiar/Mais) usa `-mt-1.5` para se aproximar do elemento acima, reduzindo o gap efetivo de 12px para ~7px. Os botões continuam com `opacity-0 group-hover:opacity-100`.

### Animações de entrada das mensagens e conteúdo
- **Fluxo:** workspace de agente → chat → toda mensagem nova
- **Como funciona:** keyframes adicionados em `globals.css`:
  - `ds-chat-message-user-in`: slide de +14px X + scale 0.97→1 + fade (0.22s, ease-out) — mensagem do usuário entra da direita
  - `ds-chat-message-agent-in`: slide de -14px X + scale 0.97→1 + fade (0.22s, ease-out) — mensagem do agente entra da esquerda
  - `ds-chat-content-reveal`: fade + translateY(3px→0) (0.18s, ease-out) — conteúdo do bubble revela ao ser gerado
  - O stagger delay existente (`Math.min(index * 45, 180)ms`) aplica via `animation-fill-mode: both`, mantendo mensagens invisíveis até o delay expirar.

### "Nova conversa" protegida: não cria thread em chat vazio
- **Fluxo:** workspace de agente → sidebar → handleNewThread
- **Como funciona:** se `activeThreadId` for null/undefined (usuário já está em tela de chat sem thread ativa), dispara `toast.info("Você já está em uma nova conversa.")` e retorna sem criar thread. A criação só acontece quando há uma thread ativa selecionada.
