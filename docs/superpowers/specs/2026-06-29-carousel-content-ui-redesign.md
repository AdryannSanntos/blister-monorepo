# Spec: Carousel Content Step — Redesign + Correções de Pipeline

**Data:** 2026-06-29  
**Branch:** feat/carousel-agent-pipeline  
**Status:** Aprovado para implementação

---

## Contexto

O agente de carrossel tem um pipeline de 5 etapas: ideias → conteúdo → design → slides → preview. O step de conteúdo é onde o usuário revisa e edita o copy de cada slide antes de aprovar e avançar. Cinco problemas foram identificados:

1. `body2` gerado pelo LLM nunca aparece na UI de revisão
2. UI de revisão usa card-in-card — experiência visual confusa
3. LLM gera `\n` literais em textos (ex: `"5 MOTIVOS\nPELOS QUAIS"`) que aparecem como caracteres visíveis
4. Step de design plan retorna layoutNotes em inglês e pouco detalhados
5. Sidebar não fecha collapsibles ao navegar para fora das sub-páginas

---

## 1. body2 no frontend

**Problema:** `body2` está no schema backend (`carouselSlideContentSchema`) e é gerado pelo LLM para o template content-machine, mas `ROLE_FIELDS` em `carousel-content-fields.ts` não inclui `body2` em nenhuma role.

**Fix:**
- Adicionar `body2` ao tipo `CarouselContentFieldKey`
- Adicionar `body2` em `ROLE_FIELDS` para `scene` (após `body`, opcional) e `proof` (após `body`, opcional)
- Adicionar chaves i18n `fields.body2` e `placement.sceneBody2` / `placement.proofBody2`

---

## 2. Redesign do CarouselContentStep — Flat List

**Padrão atual:** `Card (slide) > ContentFieldRow (field com borda própria)` — dois níveis de card aninhados.

**Novo padrão:** Lista plana com separadores. Cada slide é uma seção sem borda de card externa. Campos são rows simples com label e valor, sem bordas internas.

### Estrutura visual

```
CONTEÚDO DOS SLIDES
Revise o texto de cada slide antes de aprovar.
─────────────────────────────────────────────

─ Slide 1 · Capa · Start ──────────── [Editar]

  TÍTULO
  5 Motivos pelos quais o SaaS vai mudar...

  FOTO DE CAPA  opcional
  Fotografia editorial de tela de laptop...

─ Slide 2 · Cena · Texto + Imagem ──── [Editar]

  CORPO
  A IA generativa não será mais um add-on...

  CORPO 2
  O Notion AI resume reuniões de 40 minutos...

─ ...

────────────────── [Regenerar]  [Aprovar conteúdo]
```

### Regras de componente

**SlideSection (substitui SlideCard):**
- Sem Card wrapper — sem border de card, sem background
- Header: `border-b border-[var(--line-subtle)] pb-3 mb-4` com flex row contendo: `Slide N` pill + badges de role/tipo + botão Editar à direita
- Sem `SurfaceIcon` — elimina ruído visual
- Espaçamento entre slides: `pt-6` (separator visual via padding/border-top)

**ContentFieldRow — novo visual:**
- Sem borda, sem background interno
- Label: `text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]` + badge "Opcional" inline (pequeno, sem borda)
- Placement hint: removido em modo leitura. Aparece apenas como `placeholder` no textarea em modo edição
- Valor: `text-sm leading-relaxed text-[var(--fg-primary)]` com `whitespace-pre-line` (para multiline)
- Campo vazio (opcional): omitido em modo leitura
- Espaçamento entre campos: `gap-4`

**Edit mode:**
- Toolbar (Cancelar/Salvar) permanece ao lado do "Editar"
- Textarea recebe `placeholder={placement}` em vez de mostrar placement como parágrafo separado
- Sem mudança de layout ao entrar em edição — apenas os valores viram textareas no lugar

---

## 3. Normalização de `\n` nos textos

**Problema:** O LLM às vezes gera `\\n` no JSON (resultando no caractere literal `\`) ou newlines reais que não são renderizados corretamente como quebras de linha.

**Fix backend (`content-llm-output-sanitizer.util.ts`):**
- Converter sequência literal `\n` (2 chars: `\` + `n`) para newline real em todos os campos de string

**Fix frontend (`carousel-content-fields.ts` — `formatCarouselCopyPreviewHtml`):**
- Após `escapeHtml`, converter `\n` (newline real, `
`) para `<br>` antes de inserir via `dangerouslySetInnerHTML`

**Fix prompt (`content.prompts.ts`):**
- Adicionar instrução: `"Never embed literal \\n sequences inside field values. Use only natural sentence breaks."` e `"Do not use em-dashes (—) as separators between ideas in a single field."`

---

## 4. Design plan em pt-BR

**Fix (`design-plan.prompts.ts` — system prompt):**
- Adicionar `"Respond in Brazilian Portuguese (pt-BR)."`
- Adicionar instrução de layoutNotes: `"layoutNotes must be 2–3 sentences in Portuguese describing: (1) visual hierarchy of text blocks, (2) position of the image relative to text, (3) dominant color or contrast, and (4) any typographic emphasis."`

---

## 5. Sidebar — fechar collapsible ao navegar

**Problema:** O efeito que monitora `pathname` só **abre** items com subitems ativos, nunca fecha. Após navegar para `/dashboard/agents/carousel/overview`, o item Carrossel fica aberto mesmo ao ir para `/dashboard/settings`.

**Fix (`app-sidebar.tsx`):**
- No efeito de `openItems` (linha ~271), além de abrir os ativos, também **fechar** todos os items cujos subitems **não** estão ativos no pathname atual
- Lógica: para cada item com subItems, se nenhum subitem é `isItemDirectActive(subItem, pathname)`, setar `openItems[key] = false`
- Comportamento path-driven: roteamento controla o estado; o toggle manual continua funcionando (ao clicar, abre; ao navegar para fora, fecha)

---

## Arquivos alterados

| Arquivo | Tipo de mudança |
|---|---|
| `apps/web/messages/pt-BR.json` | Adição de chaves body2 |
| `apps/web/messages/en.json` | Adição de chaves body2 |
| `apps/web/src/core/modules/agents/utils/carousel-content-fields.ts` | body2 em ROLE_FIELDS + formatCarouselCopyPreviewHtml fix |
| `apps/web/src/core/modules/agents/components/carousel/carousel-content-step.tsx` | Redesign completo |
| `apps/api/src/agents/carousel/utils/content-llm-output-sanitizer.util.ts` | Literal `\n` → real newline |
| `apps/api/src/agents/carousel/prompts/content.prompts.ts` | Anti-`\n` + anti-em-dash instruction |
| `apps/api/src/agents/carousel/prompts/design-plan.prompts.ts` | pt-BR + detailed layoutNotes |
| `apps/web/src/core/shared/components/ui/app-sidebar.tsx` | Close collapsibles on navigate |
