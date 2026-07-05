# Daylight — Template Instructions

## Visual identity

Editorial carousel on a warm off-white canvas with generous breathing room, hairline rules, and numeric slide index. Calm, technical, airy.

**Canvas:** 1080 × 1350  
**Display font:** Space Grotesk 700–800 (titles, kickers, lists)  
**Body font:** Inter 400–600  
**Accent:** `var(--accent)` (Blister purple `#563be7` default) — highlight via **accent color only** (no filled box)  
**Signature:** `.day-top` triple header (brand · index · handle), `.day-rule` hairline, `.kicker` with accent bar, rounded `.media-card` photos.

## Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-light` | `#f4f3f0` | Slide background |
| `--surface` | `#ffffff` | Nested surfaces |
| `--ink` | `#131316` | Primary text |
| `--ink-soft` | `#4c4c54` | Body copy |
| `--ink-mute` | `#8a8a92` | Index, handle, counter |
| `--accent` | `#563be7` | Highlights, progress, kicker bar |
| `--line` | `rgba(19,19,22,0.12)` | List dividers |
| `--safe-x` | `72px` | Horizontal safe area |
| `--safe-top` / `--safe-bottom` | `56px` | Vertical safe area |
| `--footer-reserve` | `72px` | Space above progress bar |

## Global components (every slide)

1. **Header** — `.day-top`: `{{brand}}` left · `{{slide_current}}` center (zero-padded index) · `{{meta_right}}` right  
2. **Rule** — `.day-rule` hairline below header (except cover may omit on special layouts)  
3. **Footer** — `.slide-footer` with progress track + `{{slide_current}}/{{slide_total}}`  
4. **Cover** — footer **hidden** (`slide-footer--hidden`); internal slides show footer  

## Highlight rules

- Use `==termo==` → `<span class="accent">` (color only, **no box**)  
- Max **1 short phrase** per block (1–3 words)  
- Never highlight full sentences  
- Avoid `**bold**` — hierarchy comes from font weight in the template  

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` + `subtitle` (kicker) + 2 images (`imageBrief` × 2). No body. |
| **text/statement** | `title` + `subtitle` (kicker). No body. |
| **text/list** | `title` + `subtitle` + `listItems` (3–5 items). |
| **text/quote** | `body` (quote text) + `subtitle` (attribution). No title. |
| **text/stat** | `title` (big number) + `body` (label). |
| **text/cta** | `title` + `subtitle` + `body` + `call_to_action`. |
| **text-image/single-bottom** | `title` + `subtitle` + `body` + image. |
| **text-image/grid-bottom** | `title` + `subtitle` + `body` + 2 images. |
| **text-image/single-top** | `title` + `subtitle` + `body` + image. |
| **image/full** | `subtitle` (caption only) + image. |

**Forbidden:** `title` on quote slide; long monolithic paragraphs; filled highlight boxes.

## Slide library

### `start/v1` — Cover
Kicker + large `title` + 2-column `.media-grid` of rounded image cards.

### Text-only

| Variation | Layout | Fields |
|---|---|---|
| `statement` | Kicker + display title | `subtitle` + `title` |
| `list` | Kicker + title + numbered `.day-list` | `subtitle` + `title` + `listItems` |
| `quote` | Large pull quote + cite line | `body` + `subtitle` |
| `stat` | Horizontal stat: giant number + label | `title` + `body` |
| `cta` | Kicker + title + body + `.day-cta` pill | `subtitle` + `title` + `body` + `call_to_action` |

### Text + image

| Variation | Image position | Fields |
|---|---|---|
| `single-bottom` | One `.media-card` below text | `subtitle` + `title` + `body` |
| `grid-bottom` | Two `.media-card` grid below text | `subtitle` + `title` + `body` |
| `single-top` | One `.media-card` above text | `subtitle` + `title` + `body` |

### `image/full` — Full-bleed card
Large rounded image card + caption (`subtitle`) below.

## Rhythm rules

- Never repeat the same `type:variationId` on consecutive slides.  
- Alternate text-only with text-image when possible.  
- Use `stat` or `quote` for proof beats; `cta` only on final slide.  
- Prefer `grid-bottom` for team/process; `single-bottom` for product screenshots.

## Copy density

- `title`: 1 strong line, ~40–90 chars  
- `subtitle` (kicker): 1–3 words, ~10–30 chars  
- `body`: 1–2 sentences, ~80–180 chars  
- `listItems`: short phrases, ~30–70 chars each  
- `call_to_action`: CTA label, ~20–50 chars  

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 |
| scene | statement, single-top, single-bottom |
| proof | stat, quote, grid-bottom, image/full |
| framework | list |
| cta | cta |
