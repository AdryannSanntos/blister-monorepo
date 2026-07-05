# Spotlight — Template Instructions

## Visual identity

Warm floating-card editorial. Cream cards hover over a charcoal canvas washed with accent + amber radial glows. Premium, rounded, approachable.

**Canvas:** 1080 × 1350  
**Font:** Sora 400–800 (single family)  
**Accent:** `var(--accent)` — highlight via **filled accent box** on titles (`.accent` / `.hl`)  
**Fixed warm identity:** `--amber: #e8915a` (not brand-overridable)  
**Signature:** `.card` cream radius 36px, `.badge-pill` gradient, `.swipe-bar` on cover.

## Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#16110d` | Slide background |
| `--card` | `#fbf8f4` | Cream card surface |
| `--card-text` | `#241f1a` | Text inside cards |
| `--card-muted` | `#73665b` | Body inside cards |
| `--text-on-dark` | `#f4efe9` | Text on warm bg |
| `--accent` | `#563be7` | Highlight boxes, CTA |
| `--amber` | `#e8915a` | Ambient glow (fixed) |
| `--card-radius` | `36px` | Card corners |
| `--footer-reserve` | `72px` | Space above progress |

## Global components

1. **Ambient bg** — `.slide__bg` on text-only slides (accent + amber glows)  
2. **Header** — `.slide-header` 3-column on internal slides; cover uses `.swipe-bar`  
3. **Footer** — progress + counter; hidden on cover  
4. **Highlight box** — compact padding (`0.02em 0.12em`), radius `6px` — titles only  

## Highlight rules

- `==termo==` → filled accent box on **titles only**  
- Max 1–2 short terms per title block  
- Body copy uses accent **color** only (no box) via `.card-body .accent`  
- Never `**bold**` in titles — Sora 800 is sufficient  

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` (+ cover image). Multi-line with `\n`. |
| **text/pull-quote** | `body` + `subtitle`. |
| **text/stat** | `title` (number) + `body` (label). |
| **text/question** | `title` + `body` (inside white answer box). |
| **text/statement** | `title` + `body`. |
| **text/cta** | `title` + `body` + `call_to_action`. |
| **text-image/card-top** | `subtitle` + `title` + `body` + image on top. |
| **text-image/card-bottom** | `subtitle` + `title` + `body` + image at bottom. |
| **text-image/card-list** | `subtitle` + `title` + `listItems` + image on top. |
| **image/full** | `subtitle` (caption) + image. |

## Slide library

### `start/v1` — Cover
Full-bleed photo + scrim, large `.impact-title` with highlight boxes, `.swipe-bar` with handle.

### Text on warm gradient

| Variation | Layout |
|---|---|
| `pull-quote` | Large quote + cite on dark gradient |
| `stat` | Giant number + label |
| `question` | White title + cream answer card |
| `statement` | Title + body on gradient |
| `cta` | Cream closing card + CTA chip |

### Text + image (cream card)

| Variation | Image position |
|---|---|
| `card-top` | Photo top → badge + title + body |
| `card-bottom` | Badge + title + body → photo bottom |
| `card-list` | Photo top → badge + title + checklist |

### `image/full`
Full-bleed photo with caption overlay.

## Rhythm rules

- Alternate card-top / card-bottom / text-only gradient slides.  
- Use `card-list` for frameworks; `stat` for proof.  
- `question` works mid-carousel for engagement.  
- `cta` on final slide only.

## Copy density

- `title`: ~40–100 chars  
- `subtitle` (badge label): ~10–25 chars, uppercase tone  
- `body`: ~80–200 chars  
- `listItems`: ~30–70 chars each  

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 |
| scene | card-top, card-bottom, statement |
| proof | stat, pull-quote |
| framework | card-list, question |
| cta | cta |
