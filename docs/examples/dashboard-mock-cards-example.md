# Dashboard Mock Cards Example

Este arquivo preserva trechos do dashboard mock anterior que foram removidos da dashboard principal quando a tela passou a usar dados reais de sessao, workspace, onboarding, membros e convites.

## Exemplo 1: KPI card mock

```tsx
function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaTone,
  hint,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: "success" | "warning" | "tertiary";
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card data-interactive className="min-h-[138px]">
      <CardContent className="flex flex-col gap-1.5 pb-4">
        <div className="flex flex-col gap-1.5">
          <Paragraph
            size="p6"
            tone="quaternary"
            className="uppercase tracking-[0.12em]"
          >
            {label}
          </Paragraph>
          <p className="text-[34px] leading-none font-medium tabular-nums tracking-[-0.025em] text-[var(--fg-primary)]">
            {value}
            {unit ? (
              <span className="ml-1 text-[16px] text-[var(--fg-tertiary)]">
                {unit}
              </span>
            ) : null}
          </p>
        </div>
      </CardContent>
      {(delta || hint || children) && (
        <CardFooter className="min-h-0 flex-col items-start gap-2 pt-0">
          {delta ? <p>{delta}</p> : null}
          {hint ? <Paragraph size="p6">{hint}</Paragraph> : null}
          {children}
        </CardFooter>
      )}
    </Card>
  );
}
```

## Exemplo 2: card de sugestão da Aurora

```tsx
<Card className="border-[color-mix(in_oklch,var(--accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] shadow-none">
  <CardContent className="flex flex-wrap items-center gap-3 py-3">
    <Sparkles className="size-4 shrink-0 text-[var(--accent)]" />
    <p className="flex-1 text-[13.5px] leading-5 text-[var(--fg-primary)]">
      <strong className="font-medium">Aurora suggests</strong> drafting next
      week&apos;s social calendar.
    </p>
    <div className="flex gap-2">
      <Button variant="ghost">Not now</Button>
      <Button>
        Open in Studio
        <ArrowUpRight className="size-3.5" />
      </Button>
    </div>
  </CardContent>
</Card>
```

## Exemplo 3: fila de aprovações mock

```tsx
<Card>
  <CardHeader className="min-h-16 content-center border-b border-[var(--line-subtle)] pb-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <CardTitle>Approval queue</CardTitle>
        <Badge variant="secondary">3 pending</Badge>
      </div>
      <Button variant="ghost">Open all</Button>
    </div>
  </CardHeader>
  <CardContent>
    <ul className="space-y-3">
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-medium text-[var(--fg-primary)]">
              LinkedIn carousel · Q4 launch
            </p>
            <p className="text-[11.5px] text-[var(--fg-tertiary)]">
              Aurora · 14:02
            </p>
          </div>
        </div>
      </li>
    </ul>
  </CardContent>
</Card>
```

Esses blocos continuam uteis como referencia visual ou de experimentacao, mas nao devem voltar para a dashboard principal sem integrar dados reais por hooks e `TanStack Query`.
