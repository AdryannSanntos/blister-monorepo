# Agents Skill — Workana AI

## Objetivo

Guiar implementação e refatoração de tudo que envolve **agentes** no produto: workspace dedicado, chat, builder de workflow, execuções e ciclo de vida de versões.

Leia esta skill antes de mexer em qualquer arquivo dentro de:

- `apps/web/src/core/modules/agents/**`
- `apps/web/src/components/agent-elements/**`
- `apps/api/src/agents/**`

## Conceitos chave

| Termo | Definição |
|-------|-----------|
| Agent | Entidade `companyAgent` no banco. Tem `status: draft \| active \| archived` e `activeVersionId`. |
| AgentVersion | Snapshot do `flowDefinition`. `status: draft \| published \| active \| archived`. |
| Thread | Conversa de chat dentro de um agente. |
| AgentRun | Execução assíncrona disparada por uma mensagem com intent de execução. |
| Step | Etapa atômica dentro de uma run (`intent_classification`, `llm_call`, `html_validation`, etc.). |

## Ciclo de vida obrigatório

```
draft → publish → activate
                     │
                     ▼
              agent.status = "active"
              agent.activeVersionId = version.id
```

Sem `activeVersionId`, **toda tentativa de criar `AgentRun` retorna 404** (`agent-runs.service.ts:33`).

### Regra UI

O botão "Publicar agente" em `agent-workflow-page.tsx` deve sempre fazer **save → publish → activate** em uma única ação. Labels adaptam por estado: `Publicar agente` (sem draft), `Ativar versão` (publicada não ativa), `Republicar` (já ativa).

Nunca exponha publish e activate como botões separados — o usuário não precisa entender essa diferença interna.

## Workspace de agente (`/dashboard/workspace/agents/[agentId]/*`)

Layout em duas colunas com sidebar floating à esquerda + conteúdo cardificado à direita. Rotas:

- `/chat` (e `?thread=`)
- `/workflow`
- `/executions`
- `/settings`

Tudo orquestrado por `AgentWorkspaceLayout` (`apps/web/src/core/modules/agents/pages/agent-workspace-layout.tsx`).

### Sidebar lateral (`AgentWorkspaceSidebar`)

- Usa `AppSidebar` com `variant="sidebar"` (envelopado em card rounded com sombra)
- Item "Voltar ao dashboard" no topo + `action` com botão `PanelLeftClose` para fechar
- Quando colapsada, `showToggle={!sidebarOpen}` expõe o botão de reabrir
- Grupos: navegação interna (Workflow, Execuções, Configurações) + grupo `CONVERSAS` com `+ Nova conversa` e lista de threads
- Threads renderizam com `action` (DropdownMenu de 3 pontos) — wrapper do action precisa de `pr-2` para não cortar contra a borda
- Renomear thread: input inline com `Enter`/`Escape`/`blur`
- Excluir thread: `ConfirmationDialog` modal
- **Bloqueio quando agente não ativo:** `handleNewThread` intercepta — se `agent.status !== "active"`, abre `AgentInactiveDialog` em vez de criar a thread

## Modal `AgentInactiveDialog`

Vive em `apps/web/src/core/modules/agents/components/agent-inactive-dialog.tsx`.

- **Sempre obrigatório** em qualquer página de chat quando `agent.status !== "active"`.
- Modo `blocking={true}`:
  - `showCloseButton={false}`
  - `onPointerDownOutside` e `onEscapeKeyDown` com `preventDefault`
  - Se algo conseguir disparar `onOpenChange(false)`, o componente redireciona via `router.push(${basePath}/workflow)`
- Conteúdo: card com `Sparkles`, dois cards lado a lado (Workflow + Configurações), ações que navegam para `/workflow` e `/settings`.

## Chat (`AgentChatPage`)

### Input

- `InputBar` de `@/components/agent-elements/input-bar`
- `disabled={!canExecute || !isAgentActive || isRunActive || sendMessage.isPending || editAndBranch.isPending}`
- Sugestões (`suggestions={{ items, className, itemClassName }}`) aparecem **somente em `showWelcome`**, com `flex-nowrap overflow-x-auto` e itens `shrink-0` (scroll horizontal, fora de envelope visual extra)
- Ícone de microfone permanece disabled (em breve)
- DropdownMenu de anexos no `leftActions`

### Mensagens

- `ChatMessageBubble` recebe `{ message, orgId, onEdit, onRegenerate }` — **sem mais `onOpenRun`**
- Mensagem do usuário usa `<UserMessage>` (agent-elements)
- Mensagem do agente: bubble com header (avatar + label) + `Markdown` + `ToolRenderer[]` para tool calls
- Quando uma run está ativa e ainda não chegou nenhum tool section, mostra `ToolRowBase` com `SpiralLoader` (`agent-elements`)
- **Timestamp + menu (3 pontos)**: container com `opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100`. Visíveis só no hover/focus, tanto na mensagem do usuário quanto na do agente.

### Espaçamento padronizado

| Local | Valor |
|-------|-------|
| Entre mensagens (`agent-chat-page.tsx` list container) | `gap-6` (24px) |
| Dentro da bubble (texto → execution card → footer) | `gap-4` (16px) |
| Tools dentro do bubble do agente | `space-y-4` (16px) |

Padrão: **24px entre mensagens, 16px entre elementos dentro de uma mensagem**.

### Título editável do thread

Botão com `Pencil` opaco que aparece no hover (`group-hover:opacity-100`), `cursor-pointer`. Clique → input inline com `Enter`/`Escape`.

### Execução inline

`ExecutionInlineCard` é **expandable e renderiza inline a `ExecutionTimeline`**. Não usa drawer. Lazy-fetch via `useAgentRun(orgId, expanded ? run.id : null)` quando o usuário expande. Mostra:

- Header com status, contador de steps concluídos/total, barra de progresso
- Pulse accent quando ativo
- ChevronDown rotaciona com `expanded`
- Conteúdo expandido: `ExecutionTimeline` ou loader, mais mensagem de erro quando aplicável

`RunDetailSheet` segue existindo para a listagem de execuções (`/executions`), não no chat.

### Hardening de datas e custos no detail sheet

Em `run-detail-sheet.tsx`:

- `formatRunDate` valida `Number.isNaN(date.getTime())` antes de chamar `date-fns/format`
- `creditDelta ?? 0` e `(technicalCost ?? 0).toFixed(4)` — backend pode retornar `null/undefined` em runs sem custos

Sempre que ler datas ou números do servidor, **fazer guard de invalid value**.

## Workflow Builder (`AgentWorkflowPage`)

### FlowCanvas

`apps/web/src/core/modules/agents/components/flow-builder/flow-canvas.tsx`. Construído sobre `@xyflow/react` (React Flow v12).

**Overrides obrigatórios no `globals.css`:**

```css
.react-flow {
  --xy-node-background-color-default: transparent;
  --xy-edge-stroke-default: var(--accent);
  --xy-handle-background-color-default: var(--accent);
  --xy-handle-border-color-default: var(--bg-raised);
  --xy-background-pattern-lines-color-default: transparent;
}
.react-flow__node { background: transparent !important; border: 0 !important; }
```

Sem isso, React Flow força `#fff` atrás dos nodes mesmo em dark mode.

**Background grid duplo:**

```tsx
<Background variant="lines" color="color-mix(in oklch, var(--fg-primary) 28%, transparent)" gap={24} lineWidth={1} />
<Background variant="lines" color="color-mix(in oklch, var(--fg-primary) 50%, transparent)" gap={120} lineWidth={1.4} id="grid-major" />
```

**Efeito de mouse:** gradiente radial accent 14% acompanhando o cursor, em camada `z-[1]` `pointer-events-none`.

### Nodes

`FlowBlockNode` em `flow-block-node.tsx`:

- Blocos terminais (`input`/`output`): `rounded-full`, tamanho `size-20`, fundo derivado de `--info` (entrada) / `--success` (saída) com `color-mix`
- Blocos normais: card horizontal `w-56`, padding `p-3`, `rounded-lg`
- Selecionado: `ring-4 ring-[var(--accent)]/40 + sombra accent`
- Handles: `--xy-handle-*` (override global)
- Dropdown menu controlado externamente via `menuOpen`/`onMenuOpenChange` — garante que **apenas um menu de node fica aberto por vez** (estado centralizado em `agent-workflow-page.tsx` como `openMenuNodeId`)
- Animação de entrada com `opacity` + `scale` em `useEffect(requestAnimationFrame)`

### Edges (`FlowDeleteEdge`)

- `<g>` envolvendo paths + botão de delete; `onMouseLeave` no `<g>` evita ciclo path↔botão
- Snap projetado na curva via `getPointAtLength` (80 amostras + refinamento ternário bracketed)
- Botão `18×18` rounded-full, segue o cursor mantendo-se SOBRE a linha

### Zoom controls (`FlowZoomControls`)

- `<Panel position="bottom-left">` para não colidir com a sidebar direita
- 3 botões `ghost` (Plus, Minus, Maximize2) usando tokens do design system → tema dark/light automático

### Menu de contexto radial (`RadialBlockPicker`)

- Disparado por `onContextMenu` (botão direito) no canvas
- Backdrop com blur+overlay, animação `zoom-in-50 fade-in`
- Disco com hub central mostrando label/categoria do bloco hovered
- 6 blocos dispostos em círculo via `Math.cos/sin`
- Hover: scale + glow accent
- Esc/click fora fecha
- Adiciona o bloco na posição exata do click (via `screenToFlowPosition`)

### WorkflowSidebar

`workflow-sidebar.tsx`. **Floating** (`absolute right-3 top-3 bottom-3`, rounded-xl, shadow-lg).

**Top-level tabs** (`variant="underline"`):
- Blocos (lista de blocos)
- Configuração (do node selecionado ou global)

Auto-switch para "config" quando um node é selecionado.

**Tabs de categoria** (dentro de "Blocos") — `TabsList` normal com `grid-cols-4 gap-1`. **Não customizar** o look das tabs — apenas o gap.

Categorias: `essentials`, `generation`, `interaction`, `validation` (de `block-types.ts`).

Blocos renderizam draggable com `WORKFLOW_BLOCK_DRAG_TYPE` (`"application/workflow-block"`) e animação `slide-in-from-bottom-2 fade-in-0` com `animationDelay` escalonado.

### Persistência (`handleSaveDraft`)

Backend strict schema só aceita:

```ts
flowDefinition: {
  config?: Record<string, unknown>,
  nodes: Array<{ id, type, config?: Record<string, unknown> }>
}
```

Frontend persiste **layout (`position`) e conexões (`successors`)** dentro de `config` de cada node, e workflow-level config (`name`, `objective`, `instructions`, `fallbackMessage`) em `flowDefinition.config`. Backend valida via `agentFlowDefinitionSchema` em `apps/api/src/agents/dto/agent-version.dto.ts`.

## Componentes agent-elements

Vivem em `apps/web/src/components/agent-elements/`. Use a skill `agent-elements` para detalhes. Lista relevante:

| Componente | Uso |
|------------|-----|
| `InputBar` | Composer principal do chat (anexos, atalhos, suggestions, infoBar) |
| `UserMessage` | Bubble da mensagem do usuário |
| `Markdown` | Renderer markdown padronizado |
| `ToolRenderer` | Renderiza tool parts (output do agente) |
| `ToolRowBase` | Base expandable para qualquer linha de ferramenta |
| `SpiralLoader` | Loader visual oficial para etapas em andamento |
| `TextShimmer` | Shimmer de texto para labels animados |

Antes de criar UI nova para chat/agente, verifique se existe um componente em `agent-elements`.

## Backend — pontos críticos

- `agents.service.ts`: `saveDraftVersion`, `publishVersion`, `activateVersion` — sempre escopados por `organizationId` via `getCompanyAgent` no início.
- `agent-runs.service.ts:33`: lança `NotFoundException('Agent does not have an active version')` se `agent.activeVersionId` for null. Frontend deve evitar essa chamada via `disabled` + modal bloqueante.
- `agent-version.dto.ts`: `agentFlowDefinitionSchema` aceita `config: jsonObjectSchema.optional()` no root. Cada `agentFlowNodeSchema` tem `config: jsonObjectSchema` (record aberto) — guarda layout e metadados sem perder validação do `type`.

## Testes obrigatórios

Toda alteração no fluxo de agentes precisa cobrir:

1. **DTO**: schema aceita o payload real do frontend (vide `agent-version.dto.spec.ts`).
2. **Service**: pelo menos um teste cobrindo save → publish → activate (vide `agents.service.spec.ts:end-to-end`).
3. **Chat service**: criar thread, enviar mensagem com intent execution, isolamento por org/usuário (vide `agent-chat.service.spec.ts`).

Rodar: `cd apps/api && npx jest src/agents`.

## Checklist

- [ ] `agent.status === "active"` verificado antes de qualquer operação de execução
- [ ] `AgentInactiveDialog` em modo `blocking` em toda página que requer agente ativo
- [ ] `disabled` no input do chat reflete `isAgentActive`
- [ ] Botão de publicar agente faz save+publish+activate em uma ação
- [ ] Frontend usa CSS vars do projeto — sem `dark:` utility
- [ ] React Flow overrides em `globals.css` aplicados
- [ ] Apenas um menu de node aberto por vez (`openMenuNodeId` centralizado)
- [ ] Datas/números do backend com guard (`Number.isNaN`/`?? 0`) antes de `format`/`toFixed`
- [ ] Execução exibida inline no chat — sem drawer
- [ ] Espaçamento padrão: 24px entre mensagens, 16px entre elementos da mensagem
- [ ] Tests cobrindo DTO + service + chat-service
