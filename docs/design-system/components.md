# Componentes — Workana AI

## Base Oficial

Todos os componentes base vivem em `apps/web/src/core/shared/components/ui` e devem ser importados via `@/core/shared/components/ui/...` ou caminho equivalente usado no módulo.

## Catálogo Base

### Tipografia

- `Display`
- `Heading`
- `Paragraph`
- `Kbd`

### Layout

- `AppSidebar`
- `Card`
- `Tabs`
- `Separator`
- `ScrollArea`
- `Breadcrumb`

### Formulários

- `Button`
- `Input`
- `PasswordInput`
- `Textarea`
- `Select`
- `Combobox`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `Slider`
- `TagInput`
- `Form` com RHF + Zod

### Dados

- `Table`
- `DataTable`
- `EmptyState`
- `Badge`
- `Avatar`
- `Progress`
- `ChartContainer`
- `Skeleton`

### Feedback e Overlays

- `Alert` — variantes `default`, `info` (inline note com borda esquerda), `accent`, `success`, `warning`, `destructive` (banners). Compor com `AlertTitle`, `AlertDescription` e `AlertAction` opcional.
- `Sonner` — toasts com superfície `bg-raised`, ícone em círculo semântico e tipografia p3/p4; não usar `richColors`.
- `Dialog`
- `Drawer`
- `Sheet`
- `Popover`
- `Tooltip`
- `DropdownMenu`
- `HoverCard`
- `Sonner`
- `AlertDialog`

## Componentes de Produto

Devem nascer em `core/modules/<dominio>/components` quando forem específicos:

- `AgentCard`
- `AgentRunRow`
- `BrainSummaryCard`
- `BrainSourceList`
- `CreditsMeter`
- `CreditsUsageTable`
- `MemberInviteDialog`
- `PermissionMatrix`
- `IntegrationConnectCard`
- `AssetDetailSheet`

### Domínio Agents (`core/modules/agents/components`)

- `AgentWorkspaceSidebar` — sidebar do workspace de agente. Usa `AppSidebar` com botão de fechar embutido no item "Voltar ao dashboard" (`action`) e `showToggle={!sidebarOpen}` para reabrir quando colapsada. Intercepta criação de nova thread quando o agente não está ativo.
- `AgentInactiveDialog` — modal de status quando `agent.status !== "active"`. Em modo `blocking`, suprime `showCloseButton`, `Esc`, click fora e redireciona para `/workflow` ao tentar fechar.
- `ChatMessageBubble` — bubble unificado de mensagem do chat. Renderiza `UserMessage` (agent-elements) para o usuário e card com `Markdown` + `ToolRenderer[]` para o agente. Timestamp e menu de 3 pontos só aparecem no hover/focus.
- `ExecutionInlineCard` — card de execução inline no chat. Expandable, lazy-fetcha o run completo via `useAgentRun` e renderiza `ExecutionTimeline` dentro do próprio card. Substitui o uso de drawer dentro do chat.
- `RunDetailSheet` — drawer detalhado de execução para `/executions` (não usar no chat). Tem guards de data inválida e custo `null`.

### Flow Builder (`core/modules/agents/components/flow-builder`)

- `FlowCanvas` — canvas com React Flow v12. Background grid duplo (24px/120px), gradient radial seguindo o cursor, zoom controls em `Panel position="bottom-left"`, context menu radial (`RadialBlockPicker`) no botão direito.
- `FlowBlockNode` — node de bloco. Variação circular para `input`/`output` (terminais) e card horizontal para os demais. Selected: `ring-4 ring-[var(--accent)]/40`. Dropdown menu controlado externamente (`menuOpen`/`onMenuOpenChange`) para garantir um único menu aberto.
- `FlowDeleteEdge` — edge customizado com botão de delete que segue o cursor sobre a curva via `getPointAtLength` + refinamento ternário. Wrapper `<g>` evita ciclo de mouseLeave entre path e botão.
- `WorkflowSidebar` — sidebar floating direita (`absolute right-3 top-3 bottom-3`). Top tabs underline (Blocos / Configuração) + tabs de categoria internas (gap apenas, sem custom).
- `RadialBlockPicker` — menu de contexto radial único, com hub central de label e blocos dispostos em círculo. Não usar `DropdownMenu` aqui — é uma experiência customizada propositalmente diferente.

### Agent Elements (`components/agent-elements`)

Bibliotecas de UI especializadas para chat/tool-calling. **Reutilize antes de criar UI nova de agente:**

- `InputBar` — composer principal (suggestions, anexos, infoBar, atalhos)
- `UserMessage` — bubble do usuário
- `Markdown` — renderer markdown padronizado do produto
- `ToolRenderer` — renderiza tool parts no bubble do agente
- `ToolRowBase` — base expandable de linha de tool
- `SpiralLoader`, `TextShimmer` — feedback visual oficial

## Variantes Relevantes

- Button: `default`, `flat`, `secondary`, `outline`, `ghost`, `destructive`, `link`
- Badge: `default`, `secondary`, `outline`, `success`, `warning`, `info`, `destructive`
- Card: default shadcn com composição por slots; variantes visuais devem usar tokens no caller
- Table: padrão para dados operacionais; `DataTable` quando houver sort/paginação
- EmptyState: padrão oficial para estados vazios de páginas, listas e tabelas; usar `TableEmptyState` dentro de tabelas

## Regras

- Reutilizar primitives antes de criar markup paralelo.
- `Card` raiz não recebe padding.
- `CardTitle` usa `font-medium`, nunca `font-semibold` amplo.
- `AvatarFallback` usa iniciais e superfície sutil.
- `Dialog` precisa de título e descrição.
- Status é `Badge`, não texto solto colorido.
- Ações sensíveis sempre ficam dentro de `PermissionGate`.
