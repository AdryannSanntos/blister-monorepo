# Carousel Agent

Agent ID: `carousel`  
Transforms a theme into Instagram-ready carousel slides with human-in-the-loop approvals.

## Pipeline (9 steps)

| Step | Type | Description |
|------|------|-------------|
| `generate_ideas` | LLM | Produces 5 idea options |
| `await_idea_selection` | Pause | User picks `selectedIdeaId` |
| `generate_content` | LLM | Slide copy per slide |
| `await_content_approval` | Pause | Approve or reject (`approved`) |
| `generate_design_plan` | LLM | Variation + layout per slide |
| `await_design_approval` | Pause | Approve plan + upload images |
| `generate_slides` | LLM | Final HTML/CSS per slide |
| `render_slides` | Preparation | Headless PNG render → S3 |
| `finalize_carousel` | Output | Validates `CarouselOutput` |

## Image slots model

Each slide design carries `imageSlots[]` instead of legacy `needsImage`:

```typescript
imageSlots: [
  { slotKey: "image_url", label: "Miniatura 1", required: true },
  { slotKey: "image_url_2", label: "Miniatura 2", required: true },
]
```

- **Source of truth:** `manifest.json` per template variation; fallback scans `{{image_url_N}}` in `slide.html`
- **Upload key:** `"${slideId}:${slotKey}"` → workspace `fileId`
- **Approval gate:** all `required` slots must have uploads before `approved: true`

## Templates

Built-in templates live under:

```
apps/api/src/agents/carousel/templates/<template-id>/
  manifest.json
  instructions.md
  shared/base.css
  slides/<type>/<variation>/slide.html|slide.css
```

Folder `text-image` maps to schema type `text_image`.

## Marketplace

Marketplace items with `type: TEMPLATE` and `refId: <templateId>` grant entitlement to additional templates beyond built-ins.

| slug | refId |
|------|-------|
| `carousel-editorial-performance` | `editorial-performance` | Seed (`seed-marketplace.ts`) |
| `carousel-minimal-clean` | `minimal-clean` | Seed (`seed-marketplace.ts`) |

## API

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/api/agents/carousel/run` | `generation.create` |
| `GET` | `/api/agents/carousel/runs` | `generation.create` |
| `GET` | `/api/agents/carousel/templates` | `generation.create` |
| `GET` | `/api/agents/carousel/runs/:runId/export` | `generation.create` |
| `POST` | `/api/agents/runs/:runId/resume` | `generation.create` |
| `GET` | `/api/agents/runs/:runId` | `generation.create` |
| SSE | `/api/agents/runs/:runId/events` | `generation.create` |

### Pause payloads (resume `formData`)

| Pause | Payload |
|-------|---------|
| Ideas | `{ selectedIdeaId }` |
| Content | `{ approved, slides? }` |
| Design | `{ approved, plan?, imageUploads? }` |

Rejection (`approved: false`) rewinds to `generate_content` or `generate_design_plan`.

## Code layout

```
apps/api/src/agents/carousel/
  agent.ts
  build-carousel-run-deps.ts
  services/carousel-template.service.ts
  services/carousel-render.service.ts
  steps/
  templates/
  learning/feedback-handler.ts
```

Business logic stays in `apps/api`; IA infrastructure uses `@company-os/agent-ia-sdk` (`sdk.ia.*`).

## Related docs

- Design spec: `docs/superpowers/specs/2026-06-28-carousel-agent-design.md`
- Plano 3: `docs/superpowers/plans/2026-06-28-carousel-agent-plano3-backend-integration.md`
