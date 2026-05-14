# Design System Skill

## Objetivo

Guiar a IA quando a tarefa envolver interface, tokens visuais, componentes do design system ou a rota `/design-system`.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/skills/frontend-skill.md`
- `docs/design-system/README.md`
- `docs/design-system/foundations.md`
- `docs/design-system/components.md`
- `docs/design-system/patterns.md`
- `docs/design-system/usage-rules.md`

## Escopo

- `apps/web`
- `apps/web/src/app/globals.css`
- `apps/web/src/core/shared/components/ui`
- `apps/web/src/core/modules/design-system`
- rota `/design-system`

## Stack confirmada

- Tailwind CSS v4 com `@theme inline`
- shadcn/ui (style `new-york`, base `radix`, tokens `cssVariables: true`)
- Tipografia: `Geist`, `Geist Mono`, `Instrument Serif` (configuradas em `layout.tsx`)
- Ícones: `lucide-react`
- Theme: `next-themes` com `attribute="class"`, defaultTheme dark, sem system
- Forms: `react-hook-form` + `zod` via wrapper `Form`
- Tables: `@tanstack/react-table` via `DataTable`
- Charts: `recharts` via `Chart`

## Regras Obrigatorias

- reutilizar componentes de `core/shared/components/ui` antes de criar markup paralelo
- consumir tokens do `globals.css` antes de considerar cor raw
- respeitar dark/light parity (light via `.light`)
- manter fontes oficiais: `Geist`, `Geist Mono`, `Instrument Serif`
- usar `lucide-react` como biblioteca oficial de ícones
- formulários reais com `Form` (RHF + Zod) — `DsField` é só para showcase
- charts via `ChartContainer` + `ChartConfig` consumindo `--chart-1..8`
- tabelas operacionais via `DataTable` (TanStack); `Table` direto só para casos estáticos
- documentar nova variante ou padrão em `docs/design-system`

## Regras Visuais da Dashboard

- sidebar de dashboard ocupa exatamente a altura da viewport, adapta workspace/user ao estado fechado e deixa o toggle no header da tela
- busca principal fica centralizada no header em desktop; nao duplicar search dentro da sidebar
- header da dashboard fica sticky durante o scroll
- buttons usam tamanho padrao `md`; icon buttons e controles vizinhos devem ter a mesma altura visual
- controles acionáveis dentro de cards, como buttons e triggers de select/dropdown, devem preferir `ghost`; usar `outline` fora de cards
- tres ou mais acoes lado a lado devem virar `DropdownMenu` quando isso reduzir ruido visual
- cards nao usam glow; destaque deve vir de borda, fundo, estado ou conteudo
- o container raiz de `Card` nao deve receber padding estrutural; distribuir esse espacamento entre `CardHeader`, `CardContent` e `CardFooter`
- cards compostos usam divider entre header e content; header com divider centraliza verticalmente, nao horizontalmente
- cards com buttons no footer devem usar divider no proprio footer, altura compacta, padding consistente entre cards equivalentes e neutralizar o espaco estrutural extra do card
- KPI cards simples agrupam label + numero e deixam delta/hint/footer separado, sem forcar estrutura top/main/footer
- KPI cards tambem seguem a regra estrutural do `Card`: sem padding na raiz, com espacamento apenas nos slots internos usados
- cards com chart renderizam o grafico em superficie interna mais escura que o card, com borda discreta e radius consistente
- modais devem separar header, content e footer
- `Display` pode envolver o titulo principal inteiro da tela, incluindo nome do usuario, mas deve continuar raro
- evitar `font-semibold` como padrao; use no maximo `font-medium` para titulos, nomes e pontos criticos
- warning pode existir no sistema, mas nao deve ser usado como cor de texto dentro de cards
- avatares usam shape `circle` ou `square`; `AvatarImage` quando houver imagem; fallback com iniciais, borda e fundo sutil derivado do accent, sem gradiente, cor aleatoria ou fundo `primary` solido

## Componentes próprios do DS

Quando um componente que precisa não existir no shadcn upstream, criar em `ui/` com prefixo `ds-` se for específico do design system (ex: `ds-section`, `ds-stage`, `ds-field`) — nunca markup inline na página de showcase.

## O Que Evitar

- markup inline solto na página `/design-system` — tudo deve ser componente
- adicionar outra biblioteca de UI sem decisão registrada
- criar wrappers desnecessários quando o primitive existente resolve
- alterar a rota `/design-system` sem preservar seu papel de showcase vivo
- quebrar a estrutura `core/modules` e `core/shared`
- introduzir cor raw (`#xxx`, `oklch(...)`, `hsl(...)`) onde há token equivalente
- usar `dark:` utility ao invés de override via `.light` quando o sistema é dark-default
- recriar padroes de dashboard fora das regras documentadas em `docs/design-system/usage-rules.md`
