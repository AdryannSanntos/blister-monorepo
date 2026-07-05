# Voltage — Template Instructions

## Visual identity

Bold viral impact on pure black. Condensed uppercase display, electric energy, hard edges. Hard-sell, attention-grabbing.

**Canvas:** 1080 × 1350  
**Display font:** Anton (condensed uppercase titles, stats)  
**Body font:** Archivo 500–700  
**Labels:** Space Mono 700 (tags, counters, stat labels)  
**Accent:** `var(--accent)` — highlight via **filled accent box** on titles (signature)  
**Signature:** `.volt-title .accent` box, `.slash` ribbon, square `.volt-card` grids, hard progress bar.

## Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#000000` | Slide background |
| `--ink` | `#ffffff` | Primary text |
| `--ink-soft` | `rgba(255,255,255,0.74)` | Body |
| `--ink-mute` | `rgba(255,255,255,0.5)` | Tags, counter |
| `--accent` | `#563be7` | Highlight boxes, CTA |
| `--line` | `rgba(255,255,255,0.2)` | Borders |
| `--footer-reserve` | `72px` | Space above progress |

## Global components (every slide)

1. **Header** — `.volt-top`: handle pill + `{{brand}}` tag — **on every slide including cover**
2. **Footer** — `.slide-footer` with progress + counter on **all internal slides**
3. **Cover only** (`start/v1`) — footer hidden (`slide-footer--hidden`) + `slide--cover`

## Highlight rules

- `==termo==` → filled accent box inside `.volt-title` only  
- Max 1–2 short terms per title  
- Stats: accent on number via color OR `.stat__num--boxed` for boxed variant  
- Avoid `**bold**` — Anton/Archivo weights handle hierarchy  

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` + `subtitle` (+ cover image). |
| **text/statement** | `title` + `body`. |
| **text/stat** | `title` (number) + `body` (label). |
| **text/quote** | `body` (quote) + `subtitle` (attribution). |
| **text/list** | `title` + `listItems`. |
| **text/cta** | `title` + `body` + `call_to_action`. |
| **text-image/duo-top** | 2 images + `title` + `body`. |
| **text-image/single** | image + `title` + `body`. |
| **text-image/single-bottom** | `title` + `body` + image below. |
| **image/full** | `subtitle` (caption) + image. |

**Field convention:** always use `title` for headline, `body` for supporting copy (not `body`/`body2` swap).

## Slide library

### `start/v1` — Viral cover
`.volt-bg` full-bleed, handle pill, condensed `title` with highlight box, `subtitle`, swipe hint.

### Text-only (black canvas)

| Variation | Layout |
|---|---|
| `statement` | Centered handle + large title + body |
| `stat` | Giant Anton number + mono label |
| `quote` | Uppercase quote + mono cite |
| `list` | Title + `.volt-list` square bullets |
| `cta` | Title + body + link chip |

### Text + image

| Variation | Layout |
|---|---|
| `duo-top` | 2-column `.volt-grid` top → handle + title + body |
| `single` | Single `.volt-card` + title + body |
| `single-bottom` | Title + body + `.volt-card` below |

### `image/full`
Full-bleed square-cropped feel with mono caption.

## Rhythm rules

- High energy — short punchy titles, uppercase.  
- Alternate `duo-top` / `single` with text-only `statement` or `stat`.  
- `cta` or `list` for close.  
- Never repeat `statement` twice in a row.

## Copy density

- `title`: 3–8 words, uppercase tone, ~30–80 chars  
- `body`: 1–2 sentences, ~60–160 chars  
- `subtitle`: handle context or quote attribution  
- `listItems`: short imperative phrases  

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 |
| scene | duo-top, single, statement |
| proof | stat, quote |
| framework | list |
| cta | cta |
