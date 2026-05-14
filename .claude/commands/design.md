# Skill de Design System — AI Company OS

Aplique as regras abaixo ao implementar ou revisar qualquer UI neste projeto.

---

## Stack confirmada

- Tailwind CSS v4 com `@theme inline` em `apps/web/src/app/globals.css`
- shadcn/ui (style `new-york`, base `radix`)
- Fontes: `Geist Sans` (UI), `Geist Mono` (mono), `Instrument Serif` (Display editorial, raro)
- Ícones: `lucide-react` — tamanho padrão 16
- Theme: `next-themes` dark-default, `.light` para claro — **nunca `dark:` utility**
- Componentes em `apps/web/src/core/shared/components/ui/`

---

## Tokens obrigatórios (nunca cor raw)

**Surfaces:** `--bg-canvas`, `--bg-base`, `--bg-raised`, `--bg-overlay`, `--bg-sunken`, `--bg-hover`, `--bg-active`

**Texto:** `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--fg-quaternary`, `--fg-on-accent`

**Acento/semântico:** `--accent`, `--accent-soft`, `--accent-soft-hi`, `--success`, `--warning`, `--danger`

**Bordas:** `--line-subtle`, `--line-default`, `--line-strong`, `--ring-focus`

**Radius:** `--r-xs` 4 · `--r-sm` 6 · `--r-md` 8 · `--r-lg` 12 · `--r-xl` 16 · `--r-full` 999

**Motion:** `--dur-instant` 80ms · `--dur-fast` 140ms · `--dur-base` 200ms · `--dur-slow` 320ms

---

## Cards

```tsx
// Correto: sem padding na raiz
<Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
  <CardHeader className="p-6">
    <CardTitle className="text-[16px] font-medium">Título</CardTitle>
  </CardHeader>
  <CardContent className="px-6 pb-6 pt-0">...</CardContent>
</Card>

// Cards compostos: divider entre header e content
// Header com divider: centralização vertical (não horizontal por padrão)
// Footer de ações: divider, altura compacta, não acumular gap
// KPI cards: agrupar label + número, footer separado
// Sem glow — destaque por borda, fundo, estado ou conteúdo
// Sem warning como cor de texto dentro de cards
// Peso máximo em títulos: font-medium
```

---

## Buttons e controles

```tsx
// Dentro de card → ghost
<Button variant="ghost">Ação</Button>

// Fora de card → outline
<Button variant="outline">Ação</Button>

// Três ou mais ações → DropdownMenu com MoreHorizontal
```

- Tamanho padrão `md` em todos os dashboards
- Icon buttons: mesma altura que buttons `md`
- Controles vizinhos: mesma altura visual

---

## Sidebar

- `fullHeight`: `h-svh`, sem overflow extra
- Toggle: no **header da dashboard**, não dentro da sidebar
- Busca: no **header da dashboard** — não duplicar na sidebar
- Workspace switcher e user menu: compactam corretamente quando collapsed

---

## Formulários

```tsx
// Sempre Form + RHF + Zod — nunca DsField em form real
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem>
        <FormLabel>Nome</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />
      </FormItem>
    )} />
  </form>
</Form>
```

---

## Tabelas

```tsx
// Envolver em container com tokens corretos
<div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
  <Table>...</Table>
</div>
// Status como Badge com variante semântica
// IDs: font-mono tabular-nums
```

---

## Charts

```tsx
// Gráfico dentro de superfície interna mais escura que o card
<div className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] p-4">
  <ChartContainer config={chartConfig}>
    <AreaChart>
      <CartesianGrid vertical={false} stroke="var(--line-subtle)" />
    </AreaChart>
  </ChartContainer>
</div>
// Cores via var(--chart-1) até var(--chart-8) — nunca raw
```

---

## Avatar

```tsx
// Com imagem
<Avatar><AvatarImage src={url} /><AvatarFallback>{initials}</AvatarFallback></Avatar>

// Sem imagem — iniciais + borda sutil, nunca fundo primary sólido
<Avatar className="ring-2 ring-[var(--accent-soft-hi)]">
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
```

---

## Modais

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
      <DialogDescription>Descrição obrigatória para acessibilidade.</DialogDescription>
    </DialogHeader>
    {/* conteúdo */}
    <DialogFooter>
      <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      <Button type="submit">Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## O que evitar

- Cor raw (`#xxx`, `oklch(...)`) onde há token
- `dark:` utility
- `font-semibold` como padrão
- Glow em cards
- `warning` como cor de texto em cards
- Markup paralelo quando primitive shadcn resolve
- Nova biblioteca de UI sem decisão registrada

---

## Regra de extensão

1. Verificar se variante cabe no componente atual
2. Criar variante em `cva` mantendo defaults
3. Atualizar rota `/design-system`
4. Atualizar `docs/design-system/`
