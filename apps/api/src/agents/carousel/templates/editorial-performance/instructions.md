# Editorial Performance — Template Instructions

## Visual identity

Editorial carousel for high-impact educational content. Alternates dramatic dark covers with clean light editorial slides, anchored by condensed uppercase headlines, vivid orange accent (`#FF4A0A`), and a fixed bottom progress bar.

**Canvas:** 1080 × 1350 (Instagram 4:5)  
**Safe area:** 64px horizontal, 56px top header band, 72px bottom progress band  
**Display font:** Oswald 700, always uppercase for headlines  
**Body font:** Inter 400–700  
**Accent:** `#FF4A0A` — max 1–2 highlighted terms per headline block  

## Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-light` | `#F3F0ED` | Light editorial slides |
| `--bg-dark` | `#050505` | Dark thesis / proof slides |
| `--text-primary-dark` | `#111111` | Headlines on light |
| `--text-secondary` | `#6E6E6E` | Body on light |
| `--accent` | `#FF4A0A` | Keywords, progress fill |
| `--check-bg` | `#E6F3E3` | Checklist badges |
| Section orange | `#F54A0A` → `#FF5A1A` | Framework divider slide |

## Global components (every slide)

1. **Micro-header** — brand left, `@handle` or date right, uppercase tracking  
2. **Progress bar** — 3px track, orange fill, bottom edge  
3. **Slide counter** — `{current}/{total}` bottom-right  

## Injectable variables

| Variable | Description |
|---|---|
| `{{brand}}` | Micro-header left label |
| `{{meta_right}}` | Micro-header right (`@handle` or date) |
| `{{title}}` | Headline HTML; wrap accent words in `<span class="accent">` |
| `{{subtitle}}` | Secondary line under headline |
| `{{body}}` | Body HTML; use `<strong>` for emphasis |
| `{{call_to_action}}` | Closing line or CTA copy |
| `{{badge}}` | Cover profile badge (`@handle`) |
| `{{list_html}}` | Pre-rendered `<li>` items for lists |
| `{{image_url}}` | Primary image / screenshot |
| `{{image_url_2}}`, `{{image_url_3}}` | Thumbnail strip images |
| `{{slide_current}}`, `{{slide_total}}` | Counter values |
| `{{progress}}` | Progress bar width percentage (0–100) |

## Slide library

### `start/v1` — Hero cover (`slide_start`)

**Use for:** Opening promise slide only.  
**Layout:** Full-bleed background image, dark overlay, content anchored lower-left.  
**Content rules:** 4–6 short headline lines, max 2–3 orange terms, one subtitle, optional badge.  
**Needs image:** Yes (dramatic vertical photo).

### `text-image/v1` — Dark proof, headline first

**Use for:** Break a belief + show evidence.  
**Layout:** Dark `#050505`, headline top-left, body, horizontal screenshot in white rounded card, closing paragraph.  
**Flow:** headline → explanation → proof → conclusion.  
**Needs image:** Yes (screenshot).

### `text-image/v2` — Light concept + visual card

**Use for:** Conceptual enumeration with light visual support.  
**Layout:** Off-white background, headline, arrow list, centered white card with image, closing question/phrase.  
**Needs image:** Yes (example, not dominant).

### `text-image/v3` — Thumbnail strip + checklist

**Use for:** Example + benefit with social proof.  
**Layout:** Top band (~30% height) with 2–4 vertical thumbnails, headline, green check list.  
**Needs image:** Yes (2–4 thumbnails via `image_url`, `image_url_2`, `image_url_3`).

### `text-image/v4` — Illustrative image mid-slide

**Use for:** Text-first argument; image is illustrative only.  
**Layout:** Headline, intro paragraph, wide blurred/generic image card, closing paragraph.  
**Needs image:** Yes (low-detail reference photo).

### `text-image/v5` — Dark proof, image first

**Use for:** Proof + numbers + interpretation.  
**Layout:** Dark background, screenshot card on top, headline, check list, closing paragraph.  
**Needs image:** Yes (dashboard/profile screenshot).

### `text/v1` — Orange section divider

**Use for:** Framework, methodology, pillar enumeration mid-carousel.  
**Layout:** Solid orange gradient, white display headline, arrow list, bold closing phrase.  
**Needs image:** No.

### `text/v2` — Light synthesis checklist

**Use for:** Benefit, consequence, or synthesis slide.  
**Layout:** Off-white, headline with orange accent, subtitle, 3 check items, closing phrase.  
**Needs image:** No. Max 3 bullets + 1 closing line.

### `text/v3` — CTA outro (`slide_cta`)

**Use for:** Final slide only — single conversion action.  
**Layout:** Two body paragraphs, large rounded CTA box with dominant orange keyword, signature line.  
**Needs image:** No.

### `image/v1`, `image/v2`

**Use for:** Full-bleed visual break when no text hierarchy is needed.  
**Layout:** Image dominant with minimal overlay title.  
**Needs image:** Yes.

## Composition rules

- Headline always top-left on editorial slides; cover anchors lower-left.  
- One dominant visual element per slide.  
- Lists: 3–5 items; paragraphs: 2–4 lines.  
- White rounded cards for screenshots on dark or light backgrounds.  
- Never compete visually with the headline.  
- CTA keyword appears only on `text/v3`.  
- Progress bar on every slide.

## Variation selection guide

| Content signal | Pick |
|---|---|
| Opening hook | `start/v1` |
| Contrarian claim + screenshot | `text-image/v1` |
| List of concepts + example | `text-image/v2` |
| Case studies / examples row | `text-image/v3` |
| Explain idea + soft visual | `text-image/v4` |
| Metrics / profile proof | `text-image/v5` |
| Framework / pillars | `text/v1` |
| 3 benefits or takeaways | `text/v2` |
| Final action | `text/v3` |
| Visual pause | `image/v1` or `image/v2` |
