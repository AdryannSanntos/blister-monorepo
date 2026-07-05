# Plano — Revamp content-machine + Preview de templates no Marketplace/Biblioteca

> Branch `feat/carousel-agent-pipeline` · 2026-06-29

## Problema

Análise dos 6 slides de exemplo (template `content-machine`) revelou:

1. **Bold em excesso** — `.copy-block--sans` usa Inter **800** e `strong`/`accent` sobem para **900**. Quase todo texto cai em 800–900; não existe peso de leitura confortável.
2. **Duas fontes forçadas em todo slide** — o HTML hardcoda `serif → sans → serif` em cada slide. A mistura é mecânica, não intencional.
3. **Espaço mal aproveitado** — `.copy-stack { flex:1; justify-content: space-evenly }` espalha blocos curtos por toda a altura → buracos enormes (imgs 4, 5, 6). Imagens com `max-height` fixo ficam "soltas".
4. **Bug `\n` na capa** — título da capa renderiza `\n` literal (`5 MOTIVOS\nPELOS QUAIS\n...`).
5. **Header repetido em 100% dos slides** — "Powered by Blister · @blister_os · 2026 //" rouba área útil em todo card.
6. **Accent inconsistente** — default em `base.css` é laranja `#ff4a0a`, mas a identidade Blister OS é roxo `#563be7`.
7. **Marketplace/Biblioteca sem preview** — `carousel-templates.fixture.ts` só tem `id/name/description/thumbnailColor`. Card não mostra preview real; tela de detalhe não lista variações.

## Decisões travadas

- **Tipografia:** mantém serif (Playfair) + sans (Inter), mas o mix é **por papel do slide** (definido no design-plan), não obrigatório em todos. Reduzir bold (800→600/700, com 400 de leitura).
- **Preview:** PNGs de amostra renderizadas via render service (Puppeteer) e commitadas em `apps/web/public/`.
- **Accent:** roxo Blister `#563be7` como **default de todos os templates** + fixtures. Continua sobrescrevível por `accentColor` no run.

---

## Parte A — Template content-machine (backend, `apps/api/src/agents/carousel/templates/`)

### A1. Sistema tipográfico (base.css)
- Introduzir escala de pesos clara: leitura `400`, ênfase `600`, display/kicker `700–800` (não 900).
- `.copy-block--sans`: 800 → **600** (leitura) / `strong` → 700.
- `.copy-block--serif`: manter Playfair 600 (já elegante).
- Criar utilitários de voz: `.voice-serif`, `.voice-sans`, `.kicker` (label pequeno sans 600 uppercase tracking) e `.lead` (frase principal).
- `accent`: cor + peso moderado (700), nunca 900.

### A2. Mix por papel (HTML dos slides + design-plan)
- Remover o `serif/sans/serif` hardcoded. Cada variação passa a ter uma **voz dominante**:
  - narrativa/hook → serif domina, sans só em apoio pontual;
  - prova/dados → sans só;
  - fecho → serif + caixa accent.
- Atualizar `prompts/design-plan.prompts.ts` para o modelo escolher a voz por `narrativeRole` (campo já existe), reforçando "não repetir a mesma combinação em slides seguidos".

### A3. Aproveitamento de espaço
- `.copy-stack`: trocar `space-evenly` por `justify-content: center` + `gap` controlado; reservar `space-between` só quando há bloco de fecho ancorado no rodapé.
- Imagens (`text-image/v1–v5`): aumentar altura útil, ancorar (topo/base) em vez de flutuar; usar `aspect-ratio` + `object-fit: cover` com bordas consistentes. Caso `text-image/v4` (img no topo) e `v2` (img na base): imagem ocupa bloco sólido, texto preenche o resto sem buraco.
- Adicionar densidade automática: slides com pouco texto entram em `data-density="airy"`; muito texto em `compact` (tokens já existem).

### A4. Header — MANTER em todos os slides
- O header triplo ("Powered by · @handle · ano //") é **parte da identidade do template** e permanece em **todos** os slides. Sem alteração de presença; apenas garantir que não rouba espaço do conteúdo (ajuste fino de `padding` se necessário ao redistribuir a `copy-stack`).

### A5. Bug `\n` na capa
- Corrigir em `utils/content-llm-output-sanitizer.util.ts` / fluxo do título: converter `\n` em quebra real (`<br>`) ou remover. Cobrir com teste em `*.util.spec.ts`.

### A6. Accent roxo default (todos os templates)
- `content-machine/shared/base.css`, `editorial-performance/shared/base.css`, `minimal-clean` (e variáveis equivalentes): `--accent` → `#563be7` (+ `--accent-soft`, gradientes).
- `packages/types/src/agents/carousel.ts`: `accentColor` default `#FF4A0A` → `#563BE7`.
- Frontend `carousel-templates.fixture.ts`: `thumbnailColor` alinhado ao roxo onde fizer sentido.

---

## Parte B — Geração dos previews (PNGs)

- Script utilitário (dev-only) que usa `CarouselRenderService` para renderizar cada variação de cada template com **conteúdo de amostra fixo** → PNG.
- Saída: `apps/web/public/templates/<templateId>/<type>-<variation>.png` + uma `cover.png` por template.
- Conteúdo de amostra versionado (sem depender de LLM) para builds reproduzíveis.
- Reexecutável via `pnpm` script documentado (ex: `pnpm carousel:previews`).

---

## Parte C — Marketplace/Biblioteca (frontend, Plano 2 — fixtures, zero API)

### C1. Modelo de dados (fixtures)
- Expandir `carousel-templates.fixture.ts` para incluir: `coverPreview` (PNG da capa), `variations: [{ id, type, label, previewUrl }]`, `palette`, `accentDefault`.
- Mapear template → `MarketplaceItem` (tipo `template`) usando `previewUrl` (capa) e `specs`/`includes` para metadados.

### C2. Card com preview
- `marketplace-item-card.tsx` / `marketplace-style-thumb.tsx`: para itens `type:"template"`, exibir o `coverPreview` (PNG) com fallback ao gradiente da `palette`.
- Card mostra: capa, nome, descrição curta, nº de variações, accent.

### C3. Tela de detalhe com galeria de variações
- `marketplace-item-page.tsx`: nova seção **"Variações"** — grid organizado por tipo (`start`, `text`, `text-image`) com thumbnail de cada `previewUrl`, label e clique p/ ampliar (lightbox).
- Reaproveitar `MarketplaceSectionCarousel`/grid existente; agrupar por categoria p/ leitura clara.
- UX-first: ordenação start → text → text-image, contagem por grupo, estados de hover/zoom com `tw-animate-css`.

### C4. Biblioteca
- Mesma renderização de card/preview para templates "owned" (entitlements). Reaproveita C2/C3.

---

## Critérios de aceitação

- [ ] Nenhum slide usa peso ≥ 800 em corpo de texto; existe peso de leitura (400/500).
- [ ] Slides variam a voz tipográfica por papel; não há `serif/sans/serif` idêntico em todos.
- [ ] Sem buracos verticais grandes; imagens ancoradas e maiores onde havia espaço ocioso.
- [ ] Capa sem `\n` literal (teste cobrindo).
- [ ] Header triplo mantido em todos os slides (identidade do template).
- [ ] `--accent` default = `#563be7` em todos os templates + `accentColor` default no tipo.
- [ ] PNGs de todas as variações gerados em `public/templates/...`.
- [ ] Card de template exibe preview real; detalhe exibe galeria de variações agrupada.
- [ ] Smoke Playwright nas rotas `/dashboard/marketplace`, `/dashboard/marketplace/[itemId]`, `/dashboard/library`.

## Edge cases

- Título de capa muito longo (já há `data-title-short`); validar overflow após mudança de pesos.
- Variação com imagem ausente (slot opcional) → layout não pode quebrar.
- Template sem PNG gerado → fallback ao gradiente da palette.
- Accent muito claro/escuro vindo do run → garantir contraste em `theme-light`/`theme-navy`/`theme-accent`.

## Verificação

- Unit: specs de sanitizer/copy-limits/paragraph-splitter atualizados e verdes.
- Visual: re-render dos 6 slides de exemplo + comparação antes/depois.
- Frontend: `pnpm test` + Playwright smoke das rotas OS.
- Lint/build do monorepo.

## Ordem de execução

1. A1–A2 tipografia + voz por papel (base.css, HTML, design-plan prompt).
2. A3 espaço/imagens.
3. A4 header, A5 bug `\n`, A6 accent roxo (todos templates + tipo).
4. B geração de PNGs.
5. C fixtures → card → detalhe/galeria → biblioteca.
6. Verificação + smoke.
