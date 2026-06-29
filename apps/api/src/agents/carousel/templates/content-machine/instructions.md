# Content Machine — Template Instructions

## Visual identity

Editorial carousel inspired by high-performance social analysis posts. Triple micro-header, serif/sans dual typography, accent card for visuals, and accent box closing. **Brand accent color** comes from carousel agent settings (`accentColor`) — never hardcode campaign colors.

**Canvas:** 1080 × 1350 (Instagram 4:5)  
**Safe area:** 80px horizontal  
**Cover font:** Bebas Neue (impact, uppercase)  
**Narrative font:** Playfair Display (serif)  
**Support font:** Inter 800 (bold sans)  
**Accent:** `var(--accent)` from workspace/agent settings — max 1–2 `==highlighted==` terms per text block  

## Global components (every slide)

1. **Triple header** — `Powered by {{brand}}` left · `{{meta_center}}` (@handle) center · `{{meta_year}}` right  
2. **No visible progress bar** — footer placeholders exist but hidden  
3. **No slide titles except cover** — internal slides use body/subtitle/call_to_action only  

## Content contract (critical)

| Slide | Fields |
|---|---|
| **Slide 1 (hook, start/v1)** | `title` = cover headline (4–6 short lines, ==accent== on 1–2 words). `imageBrief` required. Do NOT use body on cover. |
| **Internal slides** | `title` MUST be empty/omitted. Use `body`, `subtitle`, and/or `call_to_action` only. |
| **Last slide (text/v2)** | `body` + `subtitle` + `call_to_action` (text inside accent box) |

**Forbidden:** listItems, checklists, repeated headlines, title field on slides 2+.

## Slide library

### `start/v1` — Cover

**Use for:** Opening slide only.  
**Layout:** Full-bleed photo, dark overlay, centered impact headline at bottom, optional badge pill.  
**Content:** `title` only (+ imageBrief).  
**Needs image:** Yes.

### `text/v1` — Brand narrative block

**Use for:** Story beat with emotional serif + punchy sans takeaway.  
**Layout:** Solid `var(--accent)` background, serif body top, bold sans subtitle pushed to bottom.  
**Content:** `body` (serif block) + `subtitle` (sans block). No title.  
**Needs image:** No.

### `text-image/v1` — Concept + accent card

**Use for:** Explain idea with central visual proof.  
**Layout:** Light gray background, bold sans lead, accent card with image, bold sans closing.  
**Content:** `body` + `call_to_action`. Use ==accent== in body for key phrases.  
**Needs image:** Yes (screenshot, mockup, or photo inside card).

### `text-image/v2` — Dark proof + image

**Use for:** Evidence slide with photo at bottom.  
**Layout:** Navy background, serif body, sans subtitle, rounded image in lower third.  
**Content:** `body` + `subtitle`. No title.  
**Needs image:** Yes.

### `text/v2` — Closing + accent box

**Use for:** Final slide only.  
**Layout:** Navy background, serif body, sans subtitle, accent box with closing provocation.  
**Content:** `body` + `subtitle` + `call_to_action` (inside box). No title.  
**Needs image:** No.

## Composition rules

- Left-aligned text column on all internal slides; cover headline centered.  
- One dominant visual per slide (photo, accent card, or accent box).  
- Paragraphs: 2–4 lines each; no bullets.  
- Alternate `text/v1` (accent bg) with `text-image` variants for rhythm.  
- Last slide always `text/v2`, never CTA keyword layout.

## Narrative mapping

| Role | Preferred variation |
|---|---|
| hook | start/v1 |
| scene (narrative) | text/v1 |
| scene (visual concept) | text-image/v1 |
| proof | text-image/v2 |
| cta / closing | text/v2 |
