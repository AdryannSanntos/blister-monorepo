# Foundations

Base visual do AIBusiness OS. Tudo aqui é tokenizado em `apps/web/src/app/globals.css`.

## Brand

- Acento único: **OS-Iris** (`--accent` em OKLCH `0.58 0.24 265`)
- Display: Instrument Serif, usado raramente (um por tela), inclusive para saudacao/titulo principal completo quando a tela pedir tom editorial
- UI: Geist Sans
- Mono: Geist Mono
- Princípios: AI visível mas nunca espalhafatosa · latência é feature · um acento, uma voz

## Color

### Surfaces (dark default)

- `--bg-canvas` · fundo de página
- `--bg-base` · primeira camada de cards e sidebar
- `--bg-raised` · cards principais
- `--bg-overlay` · popover, dialog, drawer
- `--bg-sunken` · inputs e código
- `--bg-hover` · hover de linha e item
- `--bg-active` · selecionado/pressionado

### Foreground

- `--fg-primary` · texto principal
- `--fg-secondary` · texto secundário
- `--fg-tertiary` · ajuda, helper
- `--fg-quaternary` · meta, caption
- `--fg-on-accent` · texto sobre acento

### Accent

- `--accent`, `--accent-hover`, `--accent-active`
- `--accent-soft` (14% overlay), `--accent-soft-hi` (34%)

### Semânticos

- `--success` · concluído, saudável
- `--warning` · atenção, awaiting
- `--danger` · falha, destrutivo
- `--info` · neutro

### Charts

`--chart-1` até `--chart-8`. Usar via `var(--chart-N)` no recharts ou no `ChartConfig`.

## Typography

| Token | Tamanho / line-height | Uso |
| --- | --- | --- |
| p1 | 18 / 1.55 | feature copy, opening paragraphs |
| p2 | 16 / 1.55 | primary body em dialogs |
| p3 | 14 / 1.55 | default UI body |
| p4 | 13 / 1.5 | helper, sidebar items |
| p5 | 12 / 1.45 | meta, table cells |
| p6 | 11 / 1.4 | caption, timestamps |

Numerais sempre via `tabular-nums` em tabelas e dashboards.

## Spacing

Escala base 4 com paradas adicionais para densidade:

`0, 1px, 2, 4, 6, 8, 10, 12, 16, 24, 32, 40, 48, 64, 80, 96, 128`.

## Radius

`--r-xs` 4 · `--r-sm` 6 · `--r-md` 8 · `--r-lg` 12 · `--r-xl` 16 · `--r-2xl` 22 · `--r-full` 999

## Elevation

`--shadow-xs/sm/md/lg/xl` para hierarquia.
`--shadow-glow` reservado para momentos de IA e nunca como destaque padrao de cards.

## Borders

- `--line-subtle` · backgrounds e separadores discretos
- `--line-default` · contornos padrão
- `--line-strong` · contornos com mais peso (inputs, outlines)
- `--ring-focus` · ring de foco

## Icons

Lucide-react. Tamanho padrão 16. Inline com texto: `[&_svg]:size-4`. Em nav e botões `sm` usar 14.

## Motion

| Token | Duração |
| --- | --- |
| `--dur-instant` | 80ms |
| `--dur-fast` | 140ms |
| `--dur-base` | 200ms |
| `--dur-slow` | 320ms |
| `--dur-slower` | 520ms |

| Easing | Curva |
| --- | --- |
| `--ease-out` | (0.22, 1, 0.36, 1) |
| `--ease-in-out` | (0.65, 0, 0.35, 1) |
| `--ease-spring` | (0.34, 1.56, 0.64, 1) |

## Utilitários

- `.tabular-nums` · numerais tabulares
- `.ds-grid-stage` · grid de fundo para demos no design system
- `.ds-ai-pulse` · pulse de IA pensando
- `.ds-check-pop` · pop de checkmark
- `.ds-shimmer` · skeleton shimmer

## Light theme

Aplica via classe `.light` (next-themes `attribute="class"`). Mantém paridade completa de tokens.
