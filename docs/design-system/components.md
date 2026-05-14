# Componentes do Design System

## Base oficial

Todos os componentes base vivem em:

- `apps/web/src/core/shared/components/ui`

Importar via alias `@/core/shared/components/ui/...`.

## Componentes shadcn instalados

### Primitivos

- `alert` · variantes `default`, `destructive`, `success`, `warning`, `info`
- `avatar` · usar com `AvatarImage` quando houver imagem e `AvatarFallback` com iniciais quando nao houver; shapes oficiais `circle` e `square`; fallback com borda e fundo sutil derivado do accent, nunca `primary` solido
- `badge` · variantes `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`, `success`, `warning`, `info`
- `button` · variantes `default`, `flat`, `outline`, `secondary`, `ghost`, `destructive`, `link` · tamanho padrao `md`; tamanhos `xs`, `sm`, `md`, `default` (alias legado), `lg`, `xl`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
- `card` · com `CardHeader`, `CardContent`, `CardFooter`, `CardAction`
- `checkbox`
- `combobox` · base UI primitive, searchable
- `command` · cmdk com `CommandDialog`, `CommandInput`, `CommandList`, etc
- `dialog`
- `drawer` · vaul
- `dropdown-menu` · suporta `DropdownMenuSub`
- `input`
- `input-group` · prefix/suffix com `InputGroupAddon`, `InputGroupButton`
- `label`
- `popover`
- `progress`
- `radio-group`
- `select`
- `separator`
- `sheet`
- `sidebar` · com `SidebarProvider`, `SidebarInset`, `SidebarMenuBadge`
- `skeleton`
- `sonner` · toasts
- `switch`
- `table`
- `tabs`
- `textarea`
- `toggle`
- `toggle-group`
- `tooltip`

### Acrescentados na expansão

- `accordion` · com keyframes `accordion-down/up`
- `breadcrumb`
- `calendar` · react-day-picker v10
- `chart` · recharts wrapper, consome `--chart-1..8`
- `collapsible`
- `data-table` · TanStack Table, sortable e paginated (custom em `ui/data-table.tsx`)
- `form` · react-hook-form + zod (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`)
- `hover-card`
- `input-otp`
- `kbd` · também `KbdGroup`
- `pagination`
- `scroll-area`
- `slider`

### Primitivos próprios do design system

Não existem no shadcn upstream — criados para servir a página `/design-system` e telas internas que mostram tokens, sem reimplementar layout solto na página:

- `ds-section` · cabeçalho padrão `eyebrow + title + description` para seções de showcase ou docs internas
- `ds-stage` · contêiner com grid de fundo (`ds-grid-stage`) para enquadrar demonstrações
- `ds-field` · label + helper para inputs simples fora do `Form` (RHF)

## Regras de uso

- importar via `@/core/shared/components/ui/...`
- reutilizar primitives antes de criar markup paralelo
- overlays devem ter título e descrição quando aplicável
- `Avatar` deve manter `AvatarFallback`
- `TabsTrigger` deve ficar dentro de `TabsList`
- `Card` deve preferir `CardHeader`, `CardContent` e `CardFooter`
- o container raiz de `Card` nao deve carregar padding; o espacamento estrutural pertence a `CardHeader`, `CardContent` e `CardFooter`
- `Button` sem `size` deve renderizar como `md`; em dashboards, todos os buttons devem ser `md`, exceto casos especificos documentados no proprio contexto
- controles acionáveis dentro de cards, como `Button`, trigger de select e trigger de dropdown, devem preferir `variant="ghost"`; `variant="outline"` deve ser usado fora de cards
- controles lado a lado, como `Button` com `Button` ou `Input` com `Button`, devem manter a mesma altura visual
- icon buttons devem ter a mesma altura dos buttons `md`; use `size="icon"` ou `size="md"` com largura fixa equivalente
- headers de cards com divider devem centralizar o conteudo verticalmente
- `Card` deve evitar excesso de padding no topo; comece pelo padding padrao e so aumente quando a hierarquia pedir
- `Card` deve ser organizado em tres partes visuais quando houver conteudo suficiente: top/header, main/content e footer/actions
- KPI cards simples com numero nao precisam da estrutura header/content/footer; agrupar label + numero, deixar delta/hint/footer separado e priorizar altura compacta com padding vertical suficiente
- KPI cards tambem nao devem adicionar padding na raiz do `Card`; o espacamento deve viver apenas nos slots internos usados
- cards com conteudo composto devem usar divider entre header e content
- cards com actions no footer devem usar divider no proprio footer, altura compacta, mesmo `px` e mesmo `py` entre cards equivalentes, e neutralizar espaco estrutural extra do card; nao somar gap da composicao com padding do footer
- cards com chart devem renderizar o grafico dentro de uma superficie interna mais escura que o card, com borda discreta e radius consistente
- `CardTitle` e titulos de cards devem ter escala maior e consistente; peso maximo `font-medium`, nunca `font-semibold` por padrao
- cards nao devem usar glow; destaque por borda, fundo ou conteudo, nao por `shadow-glow`
- warning pode existir no projeto, mas nao deve ser usado em texto dentro de cards; use texto padrao, success ou error/danger conforme o caso
- quando houver muitos buttons lado a lado, preferir um menu de acoes com `DropdownMenu`
- sidebars de dashboard devem ocupar exatamente a altura da viewport e adaptar todo conteudo ao estado fechado
- sidebars de dashboard nao devem conter busca quando o header da tela ja tiver busca principal
- toggle de sidebar da dashboard deve viver no header da dashboard, nao dentro da sidebar
- busca principal do header da dashboard deve ficar centralizada no eixo horizontal em desktop
- header da dashboard deve ficar sticky dentro do scroll da tela
- `Display` pode envolver o titulo principal inteiro da tela, incluindo nome de usuario em saudacoes; continuar limitado a um uso editorial raro por tela
- modais devem separar claramente header, content e footer
- `AvatarImage` deve ser exibido quando houver imagem; sem imagem, usar fallback com iniciais, borda e fundo sutil derivado do accent, sem fundo primary solido nem cores aleatorias
- formulários reais devem usar `Form` (RHF + Zod) e não `DsField` solto

## Estados obrigatórios por componente

- `hover`
- `focus-visible` com `ring-[var(--ring-focus)]`
- `disabled` com `opacity-45` e `pointer-events-none`
- `aria-invalid` quando aplicável
- transição de `var(--dur-fast)` com `var(--ease-out)`

## Regra de extensão

1. verificar se a variante cabe no componente atual
2. criar variante oficial em `cva` mantendo defaults
3. atualizar `/design-system`
4. atualizar esta documentação
