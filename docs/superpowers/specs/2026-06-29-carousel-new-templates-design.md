# Carousel — 4 Novos Templates (Spotlight / Reel / Daylight / Voltage)

**Data:** 2026-06-29 · **Branch:** `feat/carousel-agent-pipeline`

## Objetivo

Criar **4 novos templates** de carrossel para o agente, derivados de 4 famílias
visuais de referência. Antes de integrar no pipeline (prompts, registry,
normalizer), **validar o design** gerando PNGs de todas as variações de cada
template — exatamente como foi feito com `content-machine`.

Esta fase entrega: arquivos de template (`manifest.json`, `shared/base.css`,
`slides/**`, `instructions.md`) + PNGs de preview em
`apps/web/public/templates/<id>/`. **Não** mexe em prompts/registry/normalizer.

## Arquitetura (reuso do sistema existente)

Cada template segue o contrato já estabelecido em
`apps/api/src/agents/carousel/templates/<id>/`:

```
<id>/
  manifest.json            id, name, description, dimensions, slides{type: variations}
  instructions.md          guia do LLM (fase de integração)
  shared/base.css          design tokens (var(--accent)) + classes compartilhadas
  slides/<type>/<variationId>/
    slide.html             markup com {{placeholders}}
    slide.css              CSS específico da variação
```

Placeholders hidratados por `slide-template-engine.ts`: `{{brand}}`,
`{{meta_center}}`, `{{meta_right}}`, `{{meta_year}}`, `{{badge}}`, `{{title}}`,
`{{subtitle}}`, `{{body}}`, `{{body2}}`, `{{call_to_action}}`, `{{image_url}}`
(+`_2`…), `{{progress}}`, `{{slide_current}}`, `{{slide_total}}`.

**Accent:** CSS sempre via `var(--accent)`. Cor real = `accentColor` do run.
**Previews sempre renderizados com roxo Blister `#563BE7`.**

O script `apps/api/scripts/render-template-previews.ts` será **generalizado**
para receber `TEMPLATE_ID` + um conjunto de slides de amostra por template,
reusando `CarouselTemplateService` + `hydrateSlideHtml` + `assembleSlideCss` +
Puppeteer (1080×1350).

## Templates

### 🔦 Spotlight (`spotlight`) — Floating Card / Warm Gradient
Gradiente quente (marrom→preto), cards brancos arredondados com sombra.
Inter (título 800, corpo 400/600). Highlight em **caixa** accent.
- `start/v1` — capa foto full-bleed + título highlight-box + barra handle/Arrasta
- `text-image/card-top` — card branco: foto topo → badge-pill + título + 2 parágrafos
- `text-image/card-bottom` — card branco: badge-pill + título + 2 parágrafos → foto embaixo
- `text/question` — gradiente puro: título branco + caixa branca com ícone
- `text/cta` — card branco de fechamento

### 🎬 Reel (`reel`) — Cinematic Full-bleed
Foto cobre o slide + overlay escuro inferior. Inter (título 700, corpo 400).
Handle-pill em vidro. Highlight por **cor**.
- `start/v1` — capa cinematográfica, handle-pill + título ancorado embaixo
- `text-image/anchor-bottom` — foto full-bleed, texto ancorado embaixo
- `text-image/anchor-mid` — foto full-bleed, texto no meio, corpo mais longo
- `text/dark-close` — fundo preto, título + corpo + mockup de fechamento

### ☀️ Daylight (`daylight`) — Clean Light Editorial
Off-white `#f5f5f5`, muito respiro. Inter black título + corpo cinza.
Imagens em cards arredondados. Highlight por **cor**.
- `start/v1` — logo-pill + título black com accent + subtítulo + grid 2 imagens
- `text-image/single-bottom` — título + corpo + 1 imagem card embaixo
- `text-image/grid-bottom` — título + corpo + grid 2 imagens
- `text/cta` — título + corpo + mockup de fechamento

### ⚡ Voltage (`voltage`) — Bold Impact Dark/Yellow
Fundo preto. Título condensed black (Anton/Archivo) + highlight em **caixa**.
Grids de imagem quadrada. Vibe viral hard-sell.
- `start/v1` — capa foto full-bleed + título condensed highlight-box + handle-pill
- `text-image/duo-top` — grid 2 imagens quadradas topo → handle + título + corpo
- `text-image/single` — 1 imagem destaque + título + corpo
- `text/statement` — preto puro, só título grande + corpo
- `text/cta` — fechamento preto + corpo

## Saída / Validação

~18 PNGs (1080×1350) em `apps/web/public/templates/{spotlight,reel,daylight,voltage}/`.
Critério de aceite: cada PNG fiel à família de referência correspondente,
legível, hierarquia tipográfica clara, accent roxo aplicado via `var(--accent)`.

## Fora de escopo (fase seguinte)

Registry, prompts (ideas/content/design-plan/slides), `design-plan-normalizer`,
schemas, UI de Marketplace/Biblioteca. Só após validação visual.
