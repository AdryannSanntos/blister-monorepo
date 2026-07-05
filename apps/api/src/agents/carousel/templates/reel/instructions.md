# Reel — Template Instructions

## Visual identity

Cinematic full-bleed carousel. Photography owns the frame; copy lives over dual scrims or inside glass panels. Dramatic, editorial, film-like.

**Canvas:** 1080 × 1350  
**Display font:** Fraunces 600–800 (titles, quotes)  
**Body font:** Inter 400–600  
**Accent:** `var(--accent)` — highlight via **accent color only** (no filled box)  
**Signature:** `.reel-bg` full-bleed photo, dual scrims, `.handle-pill` glass, `FRAME {{slide_current}}`, `.swipe-hint` on cover.

## Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-deep` | `#06060a` | Solid slides, vignette base |
| `--ink` | `#ffffff` | Primary text on dark |
| `--ink-soft` | `rgba(255,255,255,0.82)` | Body on photos |
| `--ink-mute` | `rgba(255,255,255,0.6)` | Frame number, counter |
| `--glass` | `rgba(14,14,20,0.46)` | Glass panels |
| `--accent` | `#563be7` | Highlights, progress |
| `--safe-x` | `72px` | Horizontal safe area |
| `--footer-reserve` | `72px` | Space above progress bar |

## Global components

1. **Top bar** — `.reel-top`: glass handle + `FRAME {{slide_current}}` — **on every slide**
2. **Footer** — progress + counter visible on **all internal slides**
3. **Cover only** (`start/v1`) — footer hidden
4. **Fixed UI copy** — `Arrasta →` on cover, `Link na bio →` on dark-close — not placeholders

## Highlight rules

- `==termo==` → accent **color** on titles/body (no box)  
- Max 1 short phrase per block  
- Avoid `**bold**` on titles — Fraunces weight is enough  

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` only (+ cover image). Multi-line titles use `\n`. |
| **text/panel-quote** | `body` (quote) + `subtitle` (attribution). Background image required. |
| **text/panel-list** | `title` + `listItems`. Background image required. |
| **text/stat** | `title` (number) + `body` (label). Background image required. |
| **text/cta** | `title` + `body` + `call_to_action`. Background image required. |
| **text/dark-close** | `body` (headline) + `body2` + `subtitle`. No image. Solid dark. |
| **text-image/anchor-bottom** | `subtitle` (kicker) + `title` + `body`. |
| **text-image/anchor-mid** | `subtitle` + `title` + `body` + `body2`. |
| **text-image/feature-bottom** | `title` + `body`. |
| **text-image/quote-image** | `body` (quote) + `subtitle`. |
| **image/cinematic** | Image only. Optional `subtitle` caption. |

## Slide library

### `start/v1` — Cinematic cover
Full-bleed photo, glass handle, dynamic frame number, title anchored bottom, swipe hint.

### Text over photo (glass panel)

| Variation | Panel content |
|---|---|
| `panel-quote` | Italic quote + cite |
| `panel-list` | Title + numbered `.reel-list` |
| `stat` | Large number + label |
| `cta` | Title + body + `.reel-cta` chip |

### Text-image (anchored over scrim)

| Variation | Text anchor |
|---|---|
| `anchor-bottom` | Kicker + title + body at bottom third |
| `anchor-mid` | Kicker + title + body + body2 at vertical center |
| `feature-bottom` | Title + body at bottom |
| `quote-image` | Quote + attribution over photo |

### `text/dark-close` — Solid close
Black canvas, handle pill, headline + 2 body lines + `Link na bio →` chip.

### `image/cinematic` — Pure photo
Full-bleed image with light vignette; optional caption.

## Rhythm rules

- Alternate scrim positions (`anchor-bottom` → `anchor-mid` → `panel-quote`).  
- Use glass panels for dense copy; anchored text for shorter beats.  
- `dark-close` or `cta` for final slide only.  
- Never two `panel-list` in a row.

## Copy density

- `title`: 1–3 lines, ~40–120 chars total  
- `body`: 1–2 sentences, ~80–200 chars  
- `body2`: supporting line, ~60–140 chars  
- `subtitle`: kicker or attribution, ~10–50 chars  

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 |
| scene | anchor-bottom, anchor-mid, feature-bottom |
| proof | panel-quote, stat, quote-image |
| framework | panel-list |
| cta | cta, dark-close |
