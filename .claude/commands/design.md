# Skill de Design System — Blister

Aplique as regras abaixo ao implementar ou revisar qualquer UI neste projeto.
Referência completa em `docs/design-system/` e regras de UI no `CLAUDE.md` (Regras 8–11).

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

### Padrão de estilização de campos de formulário

Todos os campos (Input, Textarea, Select, InputGroup) seguem este contrato visual:

| Propriedade | Token / valor |
|---|---|
| height md | `--field-h-md` 34px — sm 28px · lg 44px |
| radius | `--r-md` 8px — sm usa `--r-sm` 6px |
| border padrão | `--line-strong` 1px solid |
| background padrão | `--bg-sunken` |
| text / size | `--fg-primary` · 13.5px · Geist 400 |
| placeholder | `--fg-quaternary` — mesma fonte, sem itálico |
| label | 12px / 500 · `--fg-secondary` · 4px gap abaixo |
| helper / erro | 11.5px / 400 · 6px gap abaixo do campo |
| padding-x | `--space-6` 12px — sm 10px · lg 14px |
| ícone interno | 14px · stroke-1.5 · `--fg-tertiary` |

#### Estados obrigatórios

```
01 · IDLE       border --line-strong · bg --bg-sunken · placeholder visível
02 · HOVER      border blend 60% para --fg-quaternary · 140ms ease-out
03 · FOCUS      border --accent · bg --bg-base · ring 3px --accent-soft · caret --accent
04 · FILLED     border --line-strong · valor em --fg-primary
05 · READ-ONLY  bg --bg-sunken/50 · border --line-subtle · cursor-default
06 · DISABLED   opacity-50 · cursor-not-allowed · helper explicando por quê
07 · LOADING    skeleton 60×16px no affix direito · campo permanece editável
08 · ERROR      border --danger · ring 3px --danger-soft · helper substituído por erro
09 · FOCUS+ERR  mantém --danger · anel --danger-soft (sem duplo ring)
10 · SUCCESS    checkmark trailing fades in 1.6s · border volta ao neutro
```

Regras:
- `aria-invalid` ativa automaticamente o estado de erro via classes CSS — nunca adicionar borda de erro manualmente
- Read-only (`readOnly`): hover e focus-ring de acento NÃO são suprimidos, pois o campo é selecionável
- Loading: o campo continua editável enquanto o skeleton aparece no affix
- Success é transiente — não pintar o campo de verde, apenas checkmark no affix com fade-out
- Nunca placeholder em itálico ou com peso diferente
- Campos numéricos: `tabular-nums` via `font-variant-numeric`

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
