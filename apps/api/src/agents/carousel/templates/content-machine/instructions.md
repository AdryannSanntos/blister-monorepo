# Content Machine — Template Instructions

## Visual identity

Editorial carousel with triple micro-header, serif/sans dual typography, and **multiple layout rhythms** so consecutive slides do not look the same. Brand accent from carousel `accentColor`.

**Canvas:** 1080 × 1350  
**Cover:** Bebas Neue · **Lead/Narrative:** Playfair Display 600 · **Body:** Inter 600 · **Support line:** Inter 400  
**Accent:** `var(--accent)` (roxo Blister `#563be7` por padrão) — sparing `==highlight==` on 1 short phrase per block (1–3 words max)  

**Hierarquia tipográfica (automática por variação):** cada slide já tem a voz definida no template — o primeiro bloco é o *lead* (maior), o segundo é corpo, e o último (`subtitle`) renderiza como **linha de apoio menor e mais leve**. Não force negrito: o peso máximo de corpo é 600. A mistura serif/sans varia por papel do slide — alguns slides usam uma só voz, outros combinam. Não tente controlar fontes pelo conteúdo.

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` only (+ imageBrief). No body on cover. |
| **Internal slides** | No `title`. Use `body`, `body2`, `subtitle`, `call_to_action` — **2–3 blocks** (~120–220 chars each). |
| **text/v2 (last)** | `body` + `body2` + `subtitle` + `call_to_action` (accent box) |

**Forbidden:** listItems, checklists, title on slides 2+, long monolithic paragraphs in a single field.

## Layout library — vary every slide

### `start/v1` — Cover
Full-bleed photo, centered impact `title`, optional badge.

### Text-only

| Variation | Layout | Fields |
|---|---|---|
| `text/v1` | Accent solid bg · copy-stack (3 blocks) | `body` + `body2` + `subtitle` |
| `text/v3` | Navy · copy-stack | `body` + `body2` + `subtitle` |
| `text/v4` | Light gray · copy-stack | `body` + `body2` + `subtitle` |
| `text/v2` | Navy · copy-stack + **accent box** (final only) | `body` + `body2` + `subtitle` + `call_to_action` |

### Text + image — `posição-tema`

A imagem ocupa uma de **3 posições** e cada posição existe em **3 temas**. ID = `{posição}-{tema}`.

**Posições:**
- `start-*` — **imagem no topo**, legenda (`body` lead sans + `body2` + `subtitle`) abaixo.
- `center-*` — texto (`body` lead serif + `body2`), **imagem no meio**, `subtitle` de fecho abaixo.
- `bottom-*` — texto (`body` + `body2` + `subtitle`), **imagem abaixo** (ideal p/ prova).

**Temas:** `dark` (fundo navy) · `white` (fundo claro) · `accent` (fundo roxo, texto branco).

| Variação | Posição da imagem | Tema |
|---|---|---|
| `start-dark` / `start-white` / `start-accent` | topo | navy / claro / accent |
| `center-dark` / `center-white` / `center-accent` | meio (entre textos) | navy / claro / accent |
| `bottom-dark` / `bottom-white` / `bottom-accent` | abaixo do texto | navy / claro / accent |

Campos: `body` + `body2` + `subtitle` (o `subtitle` é a linha de apoio curta).

## Rhythm rules

- **Never** use the same `type:variationId` on two consecutive slides.  
- Alterne **posição E tema** entre slides de imagem consecutivos (ex.: `start-dark` → `center-white` → `bottom-dark`).  
- Use `accent` com parcimônia (no máximo 1–2 por carrossel) para manter respiro.  
- Prefira `bottom-*` para prova/evidência (afirmação primeiro, imagem como prova).  
- Prefira `center-*` quando há texto rico antes e depois da imagem.  
- Prefira `start-*` quando a imagem deve liderar (foto/cena de abertura).  
- Alterne text-only (`text/v1` accent, `v3` dark, `v4` light) com layouts de imagem.

## Copy density

- `body` (lead): a frase mais forte do slide — 1 sentença, ~90–160 chars.  
- `body2`: desenvolvimento — 1–2 sentenças, ~120–200 chars.  
- `subtitle`: **linha de apoio curta** que fecha o raciocínio (renderiza menor/leve) — 1 sentença enxuta, ~60–130 chars. Não repita o lead.  
- `call_to_action`: closing provocation for accent card/box (~180 chars).  
- Use **==highlight==** on at most ONE term per block (1–3 words). Never highlight full sentences.  
- Avoid **\*\*bold\*\*** — a hierarquia de peso já vem do template. Prefira ==accent== pontual.

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 (cover) |
| scene (narrative, no image) | text/v1, v3, v4 |
| scene (visual) | text-image/start-*, center-* |
| proof | text-image/bottom-* |
| cta | text/v2 |
