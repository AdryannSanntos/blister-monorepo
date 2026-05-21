# Design System Skill — Workana AI

## Objetivo

Guiar UI, tokens, componentes e rota `/design-system` do Workana AI.

## Direção Visual

- Light theme como default, dark disponível.
- Fundo off-white frio puxado para azul.
- Azul é a cor principal.
- Dourado é reservado para premium.
- Lime é reservado para IA ativa/live.
- Nada de preto absoluto ou branco puro em superfícies principais quando houver token.
- Visual profissional, tecnológico, premium e levemente editorial.

## Stack

- Tailwind CSS v4 com `@theme inline`
- shadcn/ui `new-york`
- Fontes: Geist Sans, Geist Mono, Instrument Serif
- Ícones: lucide-react
- next-themes com `defaultTheme="light"`

## Tokens Obrigatórios

- Surfaces: `--bg-canvas`, `--bg-base`, `--bg-raised`, `--bg-overlay`, `--bg-sunken`, `--bg-hover`, `--bg-active`
- Texto: `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--fg-quaternary`, `--fg-on-accent`
- Acento: `--accent`, `--accent-hover`, `--accent-active`, `--accent-soft`, `--accent-soft-hi`
- Produto: `--premium`, `--premium-soft`, `--ai-live`, `--ai-live-soft`
- Semânticos: `--success`, `--warning`, `--danger`, `--info`
- Bordas: `--line-subtle`, `--line-default`, `--line-strong`, `--ring-focus`
- Charts: `--chart-1` até `--chart-8`

## Componentes

- Cards sem padding na raiz.
- Modais com header, content e footer separados.
- Tabelas para coleções de dados.
- Badges para status.
- Avatar com iniciais, borda e fundo sutil.
- `shadow-glow` só para CTA ou momento intencional de IA.

## Padrões de Produto

- Brain: contexto central da empresa.
- Agentes: unidades operacionais de IA.
- Créditos: consumo de IA por company.
- Integrações: fontes de contexto e canais futuros.

## Checklist

- [ ] Sem cor raw quando há token
- [ ] Sem `dark:` utility
- [ ] Empty/loading/error states tratados
- [ ] Ação principal clara por tela
- [ ] Feedback visual em toda ação assíncrona
- [ ] Linguagem alinhada com Workana AI
