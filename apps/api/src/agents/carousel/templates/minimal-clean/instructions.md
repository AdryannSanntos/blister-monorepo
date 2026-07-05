# Minimal Clean — Template Instructions

## Visual identity

Ultra-minimal carousel with system-ui typography, bold weights, and maximum whitespace. Alternates dark and light slides with no decorative chrome.

**Canvas:** 1080 × 1080 (square — unique among templates)  
**Font:** system-ui, weights 700–900  
**Accent:** `var(--accent)` from brand run  
**No shared base.css** — each variation carries its own `slide.css`.

## Palette

| Context | Background | Text |
|---|---|---|
| Dark slides | `#0a0a0a` | `#ffffff` |
| Light slides | `#f9f9f7` | `#111111` |

## Global components

- No micro-header, progress bar, or slide counter (minimal by design)  
- Content centered or top-aligned per variation  
- Images: full-bleed or proportional blocks (55% top / 40% side)

## Content contract

| Slide | Fields |
|---|---|
| **start/v1** | `title` + optional `body` |
| **text/v1–v3** | `title` + `body` (+ `listItems` on v2) |
| **text-image/v1–v3** | `title` + `body` + image |
| **image/v1–v3** | `title` + `body` + image (full bleed) |

## Slide library

### `start/v1`
Dark background, large bold centered title.

### `text/v1` — Numbered habit (dark)
### `text/v2` — List layout (light)
### `text/v3` — Statement (dark)

### `text-image/v1` — Image top 55%
### `text-image/v2` — Image side 40%
### `text-image/v3` — Image bottom

### `image/v1` — Full bleed + overlay text
### `image/v2` — Split composition
### `image/v3` — Minimal caption

## Variables

`{{title}}`, `{{body}}`, `{{call_to_action}}`, `{{image_url}}`, `{{image_url_2}}`, `{{list_html}}`

## Rhythm rules

- Alternate dark/light when possible  
- Keep copy extremely short (1 headline + 1 line)  
- No highlight syntax — use plain text or `<strong>` sparingly

## Narrative mapping

| Role | Variations |
|---|---|
| hook | start/v1 |
| scene | text/v1, text-image/v1 |
| proof | image/v1 |
| cta | text/v3 |
