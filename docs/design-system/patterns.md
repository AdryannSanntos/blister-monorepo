# Patterns

Padrões de composição do AIBusiness OS. Aplicar antes de inventar markup novo.

## AI patterns

### Thinking
- Pulse `ds-ai-pulse` em dot de acento (`bg-[var(--accent)]`)
- Indicar bloco/etapa: "Block 4 of 7 — Pricing section"
- Mostrar elapsed e custo estimado

### Done
- `ds-check-pop` em ícone `Check`
- Background `color-mix(in oklch, var(--success) 16%, transparent)`
- Texto em `var(--success)`

### Approval requested
- Card com cost, tokens, latency em `tabular-nums`
- Botões `flat` (publish) + `ghost` (skip)

### Suggestion
- Alert `info` com ícone `Sparkles` ou `WandSparkles`
- Sempre com next action explícita

### Cost · Tokens · Latency
- Sempre `tabular-nums`
- Cost em USD com 4 decimais quando < $1
- Latency em `s` até 60s, depois `m s`

## Form pattern

- `Form` (RHF) + `zodResolver`
- `FormField` por campo
- `FormItem > FormLabel + FormControl + FormDescription + FormMessage`
- `mode: 'onBlur'`
- Erros inline em `var(--destructive)`

## Empty state pattern

- Card com `CardHeader` (título + descrição)
- `CardFooter` com 2 botões: primary (descrever / criar) + outline (template / browse)
- Ensinar o que fazer, não apenas mostrar vazio

## Loading pattern

- `Skeleton` com `ds-shimmer`
- Mesma altura do conteúdo real
- Tabelas: linhas com mesma altura da row real

## Notification hierarchy

1. Toast (sonner) · ações concluídas, transientes
2. Banner (Alert) · informação fixa no contexto
3. Inline note · ao lado do elemento que descreve

Nunca usar toast para erros bloqueantes — usar `Dialog` ou inline message.

## Navigation pattern

- Sidebar primária com `SidebarProvider`
- Workspace switcher no header da sidebar
- Command menu (⌘K) sempre acessível
- Breadcrumb apenas em telas com profundidade > 2

## Composition shell

- `<SidebarProvider>` → `<Sidebar>` + `<SidebarInset>`
- Header sticky dentro do scroll da tela, com toggle da sidebar no proprio header
- Busca principal centralizada no header em desktop
- Sidebar com altura exata da viewport, sem busca duplicada quando o header ja tiver search
- Workspace switcher e menu do usuario devem compactar corretamente quando a sidebar estiver fechada
- Conteúdo em grid de cards

## Dashboard cards

- Cards compostos usam header/content/footer quando ha informacao suficiente
- O container raiz do card nao recebe padding estrutural; o respiro vive nos slots `CardHeader`, `CardContent` e `CardFooter`
- Cards compostos usam divider entre header e content; alinhar o header verticalmente, nao centralizar horizontalmente por padrao
- Controles acionáveis em cards, como buttons e triggers de select/dropdown, preferem `ghost`; `outline` fica para acoes fora do contexto do card
- Quando houver buttons no footer, o footer usa divider proprio, altura compacta e padding consistente entre cards, sem virar uma faixa alta demais nem acumular gap do card com padding do footer
- KPI cards simples agrupam label + numero e deixam delta, hint ou contexto em area secundaria/footer
- KPI cards seguem a mesma regra estrutural: sem padding na raiz, com espacamento apenas em `CardContent` e `CardFooter`
- Evitar `font-semibold`; titulos e nomes importantes usam no maximo `font-medium`
- Evitar glow em cards; destaque vem de borda, fundo, estado ou conteudo
- Tres ou mais acoes lado a lado viram `DropdownMenu`
- Modais originados por cards separam header, content e footer

## Tabelas operacionais

- `DataTable` (TanStack) para listas com sort/filter/pagination
- `Table` direto quando for estática
- Status sempre como `Badge` com variante semântica
- IDs em `font-mono tabular-nums`

## Charts

- `ChartContainer` + `ChartConfig` para series tipadas
- Cores via `var(--chart-N)`, nunca raw
- Grafico dentro de superficie interna mais escura que o card, com radius e borda discreta
- Para área: gradient com `stopOpacity` 0.4 → 0 alinhado ao acento
- Grid horizontal apenas, `stroke="var(--line-subtle)"`
