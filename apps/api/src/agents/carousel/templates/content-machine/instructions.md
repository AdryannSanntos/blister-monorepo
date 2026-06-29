# Content Machine — Template Instructions

## Visual identity

Editorial carousel with triple micro-header, serif/sans dual typography, and **multiple layout rhythms** so consecutive slides do not look the same. Brand accent from carousel `accentColor`.

**Canvas:** 1080 × 1350  
**Cover:** Bebas Neue · **Narrative:** Playfair Display · **Support:** Inter 800  
**Accent:** `var(--accent)` — at least one `==highlighted==` term per text block on most slides  

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` only (+ imageBrief). No body on cover. |
| **Internal slides** | No `title`. Use `body`, `body2`, `subtitle`, `call_to_action` — **2–3 short blocks** (~80–160 chars each). |
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

### Text + image

| Variation | Layout | Fields |
|---|---|---|
| `text-image/v1` | Light · lead blocks · **accent card** · closing | `body` + `body2` + `call_to_action` |
| `text-image/v2` | Navy · copy-stack · **image at bottom** | `body` + `body2` + `subtitle` |
| `text-image/v3` | Light · top copy-stack · **image center** · closing | `body` + `body2` + `subtitle` |
| `text-image/v4` | Navy · **image on top** · copy-stack below | `body` + `body2` + `subtitle` |
| `text-image/v5` | Navy · top copy-stack · **image** · closing | `body` + `body2` + `subtitle` |

## Rhythm rules

- **Never** use the same `type:variationId` on two consecutive slides.  
- Alternate text-only (`text/v1`, `v3`, `v4`) with image layouts (`v1`–`v5`).  
- Prefer `v5` or `v3` when three text blocks are filled.  
- Prefer `v4` when the visual should lead (photo-first).  
- Prefer `v2` for proof / evidence with image anchoring the bottom.  
- Prefer `v1` when the image is a UI mockup inside the accent card.

## Copy density

- `body`, `body2`, `subtitle`: 1–2 sentences each (~80–160 chars).  
- `call_to_action`: closing provocation for accent card/box (~220 chars).  
- Use **==highlight==** on at least one term per block; **\*\*bold\*\*** for cross-font emphasis.  
- Fill 2–3 text zones whenever the variation supports them — never one giant paragraph.

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 |
| scene (narrative, no image) | text/v1, v3, v4 |
| scene (visual) | text-image/v1, v3, v5 |
| proof | text-image/v2, v4, v5 |
| cta | text/v2 |
