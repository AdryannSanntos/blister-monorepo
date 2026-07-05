# Carousel agent

Two-phase UX: **Ideas** → **Editor** (fullscreen overlay).

## Flow

1. User starts a run from the carousel overview modal.
2. Pipeline pauses at `await_idea_selection` — overlay shows idea cards (+ custom idea).
3. After selection, pipeline runs automatically: content → design plan → slides → render → finalize.
4. When `COMPLETED`, overlay shows the visual editor (filmstrip, canvas, layers panel, adjust bar).

## API (carousel-specific)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/agents/carousel/runs/:runId/export` | ZIP of rendered PNGs |
| POST | `/agents/carousel/runs/:runId/render` | Re-render PNGs after manual edits |
| POST | `/agents/carousel/runs/:runId/ai-edit` | Assisted text/HTML adjustment |

Shared run APIs: `POST /agents/runs`, resume, `PATCH /agents/runs/:runId/output`.

## Legacy runs

Runs paused with `awaiting_content_approval` or `awaiting_design_approval` (pre-migration) show a banner in the overlay. **Continuar** resumes with `{ contentApproved: true, designApproved: true, imageUploads: {} }`.

## Frontend entry

- Route: `/dashboard/agents/carousel/runs/:runId` (deep link; page returns `null`).
- UI: `CarouselRunOverlay` mounted in `dashboard-shell.tsx`.
