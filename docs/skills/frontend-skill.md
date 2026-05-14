# Frontend Skill

## Objetivo

Guiar a IA ao implementar, refatorar ou revisar codigo em `apps/web`.

## Ler Antes

- `docs/skills/project-engineering-skill.md`
- `docs/decisions/stack-decisions.md`

## Escopo

- paginas App Router
- componentes React
- estados de interface
- formularios
- tabelas
- graficos
- integracao com auth client

## Estrutura Obrigatoria do Frontend

- rotas em `apps/web/src/app`
- componentes e paginas de dominio em `apps/web/src/core/modules`
- compartilhados em `apps/web/src/core/shared`

## Regras de Implementacao

### Next.js e React

- respeitar App Router
- usar component client apenas quando necessario
- preservar composicao simples e clara
- evitar abstrair cedo demais

### Dados e estado

- priorizar hooks de dominio para encapsular acesso a dados, derivacoes e regras de interface compartilhadas
- dados de servidor devem usar `@tanstack/react-query`
- componentes e paginas nao devem disparar requisicoes HTTP diretamente quando um hook puder representar esse contrato
- filtros e estado compartilhavel devem usar `nuqs`
- estado local temporario pode usar `zustand`, mas apenas quando `useState` nao resolver

### Formularios

- formularios devem usar `react-hook-form`
- validacao deve usar `Zod` via resolver quando houver entrada relevante
- evitar validacao manual dispersa

### Estilo e UI

- usar `Tailwind CSS v4` como primeira opção, tokens em `apps/web/src/app/globals.css`
- usar `class-variance-authority` (cva) em componentes com variantes reais
- usar `clsx` e `tailwind-merge` via `cn()` para compor classes sem conflitos
- `shadcn/ui` está instalado em `apps/web` (style `new-york`, base `radix`, alias `@/core/shared/...`)
- usar os componentes oficiais em `apps/web/src/core/shared/components/ui`
- reutilizar `shadcn` antes de criar markup customizado
- consumir tokens (`var(--bg-*)`, `var(--fg-*)`, `var(--accent)`, `var(--r-*)`, `var(--shadow-*)`, `var(--dur-*)`, `var(--ease-*)`) ao invés de cor raw
- manter a referência viva do sistema em `apps/web/src/core/modules/design-system`
- theme via `next-themes` `attribute="class"`, defaultTheme dark; light via `.light`
- ícones: `lucide-react` apenas

### Dashboard e composição visual

- sidebars de dashboard devem ter altura exata da viewport, adaptar conteudo ao estado fechado e deixar o toggle no header da tela
- busca principal deve ficar no header e centralizada em desktop; nao duplicar search na sidebar
- headers de dashboard devem ser sticky durante scroll
- buttons devem usar tamanho `md` por padrao; icon buttons e controles vizinhos devem manter a mesma altura visual
- controles acionáveis dentro de cards, como buttons e triggers de select/dropdown, devem preferir `ghost`; `outline` fica para contextos fora de cards
- tres ou mais acoes lado a lado devem ser avaliadas como `DropdownMenu`
- cards nao devem usar glow; cards compostos usam divider entre header e content
- o container raiz de `Card` nao deve receber padding estrutural; esse respiro pertence a `CardHeader`, `CardContent` e `CardFooter`
- cards com buttons no footer devem usar divider no proprio footer, altura compacta, padding consistente entre cards equivalentes e sem acumular gap estrutural do card com padding do footer
- header de card com divider centraliza verticalmente, nao horizontalmente por padrao
- KPI cards simples agrupam label + numero e deixam delta/hint/footer separado, sem forcar top/main/footer
- KPI cards tambem seguem a regra estrutural do `Card`: sem padding na raiz, com espacamento apenas nos slots internos usados
- cards com chart devem ter superficie interna mais escura que o card, com radius e borda discreta
- modais devem separar header, content e footer
- `Display` pode envolver o titulo principal completo da tela, incluindo nome de usuario em saudacoes, mas deve ser raro
- evitar `font-semibold` amplo; preferir `font-medium` para pontos de enfase real
- avatares devem usar `AvatarImage` quando houver imagem e `AvatarFallback` com iniciais, borda e fundo sutil quando nao houver

### Formulários

- formulários devem usar `Form` (`react-hook-form` + `zod`) de `core/shared/components/ui/form`
- nunca usar `DsField` para form com schema — `DsField` é primitivo de showcase
- validar com `zodResolver` e `mode: 'onBlur'`

### Tabelas e gráficos

- tabelas operacionais: `DataTable` (TanStack Table)
- gráficos: `Chart` (recharts) com `ChartConfig` consumindo `--chart-1..8`

### API e auth

- chamadas de auth devem partir do `authClient` existente
- organizacao ativa nao deve ser assumida como parte da sessao do `better-auth`; ela deve vir das APIs do dominio da aplicacao
- chamadas HTTP devem manter consistencia com o uso de `axios`
- requisicoes de leitura e mutacao devem priorizar hooks com `TanStack Query`, mesmo quando o consumo inicial acontecer em uma unica tela

## Checklist de Entrega

- a mudanca respeita `core/modules` e `core/shared`
- a escolha de estado esta correta entre React Query, `nuqs`, `zustand` e estado local
- a validacao esta em `Zod` quando aplicavel
- nao foi introduzida biblioteca concorrente de UI, formulario ou dados
- os tokens do design system foram respeitados quando a tarefa for visual
- os padroes de dashboard, cards, sidebar, charts, buttons, modais e avatares seguem `docs/design-system/usage-rules.md`
