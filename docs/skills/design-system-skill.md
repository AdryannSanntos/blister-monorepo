# Design System Skill

## Objetivo

Guiar a implementação ou revisão de UI, tokens, componentes ou a rota `/design-system` no AI Company OS.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/skills/frontend-skill.md`
- `docs/design-system/foundations.md`
- `docs/design-system/components.md`
- `docs/design-system/patterns.md`
- `docs/design-system/usage-rules.md`

## Stack Confirmada

- Tailwind CSS v4 com `@theme inline` em `apps/web/src/app/globals.css`
- shadcn/ui (style `new-york`, base `radix`, `cssVariables: true`)
- Fontes: `Geist Sans` (UI), `Geist Mono` (mono), `Instrument Serif` (Display editorial, raro — um por tela)
- Ícones: `lucide-react` — tamanho padrão 16; nav e botões `sm` usar 14
- Theme: `next-themes` `attribute="class"`, dark-default; light via `.light` — **nunca `dark:` utility**

## Tokens Obrigatórios

### Surfaces
```
--bg-canvas  --bg-base  --bg-raised  --bg-overlay  --bg-sunken  --bg-hover  --bg-active
```

### Texto
```
--fg-primary  --fg-secondary  --fg-tertiary  --fg-quaternary  --fg-on-accent
```

### Acento
```
--accent  --accent-hover  --accent-active  --accent-soft  --accent-soft-hi
```

### Semânticos
```
--success  --warning  --danger  --info
```

### Bordas
```
--line-subtle  --line-default  --line-strong  --ring-focus
```

### Charts — sempre via token
```
--chart-1 até --chart-8
```

### Radius
```
--r-xs 4  --r-sm 6  --r-md 8  --r-lg 12  --r-xl 16  --r-2xl 22  --r-full 999
```

### Motion
```
--dur-instant 80ms  --dur-fast 140ms  --dur-base 200ms  --dur-slow 320ms  --dur-slower 520ms
--ease-out  --ease-in-out  --ease-spring
```

## Tipografia

| Token | Tamanho | Uso |
|-------|---------|-----|
| p1 | 18/1.55 | feature copy, abertura |
| p2 | 16/1.55 | body em dialogs |
| p3 | 14/1.55 | body padrão de UI |
| p4 | 13/1.5 | helper, sidebar items |
| p5 | 12/1.45 | meta, table cells |
| p6 | 11/1.4 | caption, timestamps |

- Numerais em tabelas e dashboards: `tabular-nums`
- Peso máximo em títulos: `font-medium` — nunca `font-semibold` como padrão amplo

## Regras de Card

```tsx
// Container raiz sem padding — espaço nos slots internos
<Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
  <CardHeader className="p-6">
    <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">Título</CardTitle>
  </CardHeader>
  <CardContent className="px-6 pb-6 pt-0">...</CardContent>
</Card>
```

- Cards compostos: divider entre header e content
- Header com divider: centralização **vertical**, não horizontal
- Footer de ações: divider próprio, altura compacta, sem acumular gap estrutural
- KPI cards: agrupar label + número, footer separado — sem forçar estrutura header/content/footer
- Sem glow — destaque por borda, fundo, estado ou conteúdo
- Sem `warning` como cor de texto dentro de cards
- Títulos com `font-medium` no máximo

## Regras de Button e Controles

- Tamanho padrão `md` — dashboards sempre `md`
- Dentro de card → `variant="ghost"`; fora → `variant="outline"` permitido
- Icon buttons: mesma altura que buttons `md`
- Controles vizinhos: mesma altura visual
- Três ou mais ações → `DropdownMenu`

## Regras de Sidebar

- `fullHeight`: ocupa exatamente a viewport (`h-svh`)
- Toggle: no **header da dashboard**, não dentro da sidebar
- Busca: no **header da dashboard** — sem duplicar na sidebar
- Workspace switcher e user menu: compactam no estado collapsed

## Regras de Dashboard Shell

- Header: `sticky top-0 z-10` durante scroll
- Sidebar: `fullHeight`, `h-svh`
- Toggle: no header
- Busca: no header, centralizada em desktop

## Formulários

```tsx
// SEMPRE Form + RHF + Zod — nunca DsField em form real
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormDescription>Texto auxiliar opcional.</FormDescription>
        <FormMessage />
      </FormItem>
    )} />
  </form>
</Form>
```

`mode: 'onBlur'` — erros inline em `var(--destructive)`.

## Tabelas

```tsx
// Envolver com tokens corretos
<div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
  <Table>...</Table>
</div>
// Status como Badge com variante semântica
// IDs: font-mono tabular-nums
// DataTable (TanStack) para sort/filter/paginação; Table direto para estáticas
```

## Charts

```tsx
// Gráfico dentro de superfície mais escura que o card
<div className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] p-4">
  <ChartContainer config={chartConfig}>
    <AreaChart>
      <CartesianGrid vertical={false} stroke="var(--line-subtle)" />
    </AreaChart>
  </ChartContainer>
</div>
// Cores via var(--chart-1..8) — nunca raw
// shadow-glow reservado para momentos de IA — nunca como destaque padrão
```

## Avatar

```tsx
// Com imagem
<Avatar className="size-8">
  <AvatarImage src={url} alt={name} />
  <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
</Avatar>

// Sem imagem — iniciais com borda sutil, nunca fundo primary sólido
<Avatar className="size-9 ring-2 ring-[var(--accent-soft-hi)]">
  <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
</Avatar>
```

Shapes: `circle` (padrão) ou `square` (`shape="square"`). Sem gradientes nem cores aleatórias.

## Modais

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descrição (obrigatória para acessibilidade).</DialogDescription>
    </DialogHeader>
    {/* conteúdo */}
    <DialogFooter>
      <Button variant="ghost">Cancelar</Button>
      <Button type="submit">Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Padrões de AI

```tsx
// Pensando
<div className="ds-ai-pulse size-2 rounded-full bg-[var(--accent)]" />

// Concluído
<div className="ds-check-pop bg-[color-mix(in_oklch,var(--success)_16%,transparent)] p-2 rounded-full">
  <Check className="size-4 text-[var(--success)]" />
</div>

// Sugestão
<Alert variant="info">
  <Sparkles className="size-4" />
  <AlertTitle>Sugestão</AlertTitle>
  <AlertDescription>Texto com next action explícita.</AlertDescription>
</Alert>
```

## Estados Obrigatórios por Componente

- `hover`
- `focus-visible` com `ring-[var(--ring-focus)]`
- `disabled`: `opacity-45` + `pointer-events-none`
- `aria-invalid` quando aplicável
- Transição: `var(--dur-fast)` com `var(--ease-out)`

## Componentes Próprios do DS

Componentes que não existem no shadcn upstream:
- `ds-section` — cabeçalho padrão de seções de showcase (`eyebrow + title + description`)
- `ds-stage` — contêiner com grid de fundo para demos
- `ds-field` — label + helper para inputs simples **fora do `Form`** (RHF) — **não usar em formulários reais**

## O Que Evitar

- Cor raw (`#xxx`, `oklch(...)`) onde há token equivalente
- `dark:` utility — tokens são dark-default
- `font-semibold` como padrão
- Glow em cards
- `warning` como cor de texto dentro de cards
- Markup paralelo quando primitive shadcn resolve
- Nova biblioteca de UI sem decisão registrada

## Regra de Extensão

1. Verificar se variante cabe no componente atual
2. Criar variante em `cva` mantendo defaults
3. Atualizar rota `/design-system`
4. Atualizar `docs/design-system/`
