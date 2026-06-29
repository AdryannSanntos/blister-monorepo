# Agente Carrossel — Plano 3: Backend + Integração API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Pré-requisitos:** [Plano 2 Frontend](./2026-06-28-carousel-agent-plano2-frontend.md) ✅ · [Design Spec](../specs/2026-06-28-carousel-agent-design.md) ✅  
> **Substitui:** seção “Próximos passos (Plano 3)” do Plano 2 e o doc legado [`docs/agents/mvp/carousel/README.md`](../../agents/mvp/carousel/README.md) (modelo Post Style — obsoleto).

**Goal:** Completar o agente `carousel` de ponta a ponta — templates estáticos, serviços de render, marketplace, routing de rejeição, exportação PNG/ZIP e substituição das fixtures do frontend por API real.

**Architecture:** Lógica de negócio permanece em `apps/api/src/agents/carousel/`. Infraestrutura IA em `@company-os/agent-ia-sdk`. API expõe `POST /api/agents/carousel/run`, SSE de steps, `POST .../blocks/:blockId/answer` nas pausas, e endpoint de exportação. Templates são arquivos versionados em `templates/<id>/` com **metadados de slots de imagem por variação** (suporte a 1–N imagens por slide).

**Tech Stack:** NestJS 11, Prisma, Puppeteer (ou Playwright headless), S3 presigned, AgentBuilder + routing SDK, TanStack Query no frontend, Zod em `packages/types`.

---

## Global Constraints

- Identificadores em inglês (código, rotas, campos Prisma, migrations)
- Copy de UI em PT-BR via i18n
- Sem lógica LLM fora do SDK (`sdk.ia.*`)
- `userId` nunca vem do body — sempre `req.currentUser.id`
- Novas permissões → `packages/authz` primeiro (reutilizar `generation.create`, `agentRun.review`, `marketplace.redeem`)
- `learning/feedback-handler.ts` obrigatório — já existe, apenas enriquecer com slots de imagem
- Spec visual: [`2026-06-28-carousel-agent-design.md`](../specs/2026-06-28-carousel-agent-design.md)

---

## Evolução: múltiplas imagens por slide

O template `editorial-performance` já usa `{{image_url}}`, `{{image_url_2}}`, `{{image_url_3}}` (ex.: `text-image/v3`). O modelo atual (`needsImage` + `imageSlot` único) **não suporta** isso.

### Modelo alvo

```typescript
// packages/types/src/agents/carousel.ts

export const carouselImageSlotSchema = z.object({
  /** Injectable key in slide HTML — e.g. image_url, image_url_2 */
  slotKey: z.string().regex(/^image_url(_\d+)?$/),
  /** Human label for upload UI */
  label: z.string(),
  required: z.boolean().default(true),
  fileId: z.string().optional(),
});
export type CarouselImageSlot = z.infer<typeof carouselImageSlotSchema>;

export const carouselSlideDesignSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  variationId: z.string(),
  layoutNotes: z.string(),
  imageSlots: z.array(carouselImageSlotSchema).default([]),
});
```

**Regras:**

| Regra | Detalhe |
|-------|---------|
| Fonte de verdade dos slots | `manifest.json` por variação; fallback: scan de placeholders `{{image_url.*}}` no `slide.html` |
| Upload key | `imageUploads` usa chave composta `"${slideId}:${slotKey}"` → `fileId` |
| Aprovação bloqueada | Todos os slots com `required: true` devem ter `fileId` antes de `approved: true` |
| `needsImage` (legado) | Remover do schema público; derivar na UI: `imageSlots.length > 0` |
| LLM design plan | IA preenche `imageSlots` copiando do manifest da variação escolhida; pode ajustar `label` e `layoutNotes`, **não** inventar `slotKey` fora do manifest |

### Manifest por variação (novo formato)

```json
{
  "id": "editorial-performance",
  "slides": {
    "start": {
      "v1": {
        "imageSlots": [
          { "slotKey": "image_url", "label": "Foto de capa", "required": true }
        ]
      }
    },
    "text-image": {
      "v3": {
        "imageSlots": [
          { "slotKey": "image_url", "label": "Miniatura 1", "required": true },
          { "slotKey": "image_url_2", "label": "Miniatura 2", "required": true },
          { "slotKey": "image_url_3", "label": "Miniatura 3", "required": false }
        ]
      }
    }
  }
}
```

Manter array simples `["v1","v2"]` como shorthand: variação sem bloco `imageSlots` → inferir via scan do HTML (0 ou N slots).

---

## Mapa de entregáveis

| Área | Entregável | Task |
|------|------------|------|
| Types | `CarouselImageSlot`, `imageSlots[]`, approval keys compostas | 1 |
| Template service | Leitura manifest + HTML/CSS + cache | 2 |
| Templates assets | `minimal-clean` completo + manifests atualizados | 3 |
| Marketplace | `TEMPLATE` + `refId` → `templateId`, entitlement filter | 4 |
| Run deps | Prisma, storage, template service, render | 5 |
| Agent routing | Rejeição → regenerar content/design | 6 |
| Prompts | Injetar `instructions.md` + slots + referência HTML | 7 |
| Render service | Headless → PNG → S3 | 8 |
| Export API | ZIP de PNGs por run | 9 |
| Frontend hooks | Substituir fixtures por API + SSE | 10 |
| Frontend upload | Multi-slot por slide (presigned PUT) | 11 |
| Tests | Unit + e2e API + Playwright integrado | 12 |
| Docs | `docs/agents/carousel/README.md` + arquivar MVP legado | 13 |

---

### Task 1: Schemas — múltiplas imagens por slide

**Files:**
- Modify: `packages/types/src/agents/carousel.ts`
- Modify: `apps/api/src/agents/carousel/schemas/carousel-schemas.ts`
- Modify: `apps/web/src/core/modules/blister-os/fixtures/carousel-runs.fixture.ts`
- Modify: `apps/api/src/agents/carousel/steps/generate-design-plan.step.ts`

**Interfaces:**
- Produces: `carouselImageSlotSchema`, `CarouselImageSlot`, `imageSlots` em `CarouselSlideDesign`
- Removes: `needsImage`, `imageSlot`, `imageFileId` dos schemas públicos (migração única — atualizar fixtures e componentes no mesmo PR)

- [ ] **Atualizar `packages/types/src/agents/carousel.ts`**

Substituir campos legados em `carouselSlideDesignSchema` pelo array `imageSlots`.

Atualizar `carouselDesignApprovalSchema` (em `carousel-schemas.ts`):

```typescript
export const carouselDesignApprovalSchema = z.object({
  approved: z.boolean(),
  plan: carouselDesignPlanSchema.optional(),
  /** Keys: `${slideId}:${slotKey}` → workspace file id */
  imageUploads: z.record(z.string(), z.string()).optional(),
});
```

- [ ] **Helper compartilhado** — criar `packages/types/src/agents/carousel-image-slots.ts` (ou colocated em carousel.ts):

```typescript
export const buildImageUploadKey = (slideId: string, slotKey: string) =>
  `${slideId}:${slotKey}`;

export const parseImageUploadKey = (key: string) => {
  const sep = key.indexOf(":");
  return { slideId: key.slice(0, sep), slotKey: key.slice(sep + 1) };
};

export const slideRequiresUploads = (slide: CarouselSlideDesign) =>
  slide.imageSlots.some((s) => s.required);

export const countRequiredSlots = (plan: CarouselDesignPlan) =>
  plan.slides.reduce(
    (n, s) => n + s.imageSlots.filter((slot) => slot.required).length,
    0,
  );
```

- [ ] **Atualizar fixtures e componentes Plano 2**

| Arquivo | Mudança |
|---------|---------|
| `carousel-runs.fixture.ts` | `imageSlots` em `CAROUSEL_DESIGN_PLAN_FIXTURE`; `text-image/v3` com 3 slots |
| `carousel-design-plan-step.tsx` | Grid de upload **por slot** (não por slide); counter `X de Y imagens` |
| `use-carousel-run-detail.ts` | `imageUploads: Record<string, string>` com chaves compostas |
| `generate-design-plan.step.ts` | Zod output com `imageSlots` array |

- [ ] **Verificar build**

```bash
cd packages/types && pnpm exec tsc --noEmit
cd apps/web && pnpm exec tsc --noEmit
cd apps/api && pnpm exec tsc --noEmit
```

---

### Task 2: `CarouselTemplateService`

**Files:**
- Create: `apps/api/src/agents/carousel/services/carousel-template.service.ts`
- Create: `apps/api/src/agents/carousel/services/carousel-template.service.spec.ts`
- Create: `apps/api/src/agents/carousel/services/template-manifest.types.ts`
- Modify: `apps/api/src/agents/carousel/index.ts` (export se necessário)
- Modify: `apps/api/src/agents/agents.module.ts` (provider)

**Interfaces:**
- Produces: `listTemplates()`, `getTemplate(id)`, `getSlideVariation(templateId, type, variationId)`, `getImageSlotsForVariation(...)`, `getAvailableVariations(templateId)`

- [ ] **Implementar leitura em boot**

```
apps/api/src/agents/carousel/templates/<template-id>/
  manifest.json
  instructions.md
  shared/base.css          # opcional — concatenar no render
  slides/<type>/<variation>/slide.html|slide.css
```

- [ ] **Normalizar tipos de pasta**

Mapear `text_image` (schema) ↔ `text-image` (diretório) internamente.

- [ ] **Resolver `imageSlots` por variação**

Ordem de precedência:
1. `manifest.slides[type][variation].imageSlots`
2. Scan regex `\{\{(image_url(?:_\d+)?)\}\}` no `slide.html`
3. Array vazio (slide só texto)

- [ ] **Cache em memória** — invalidar apenas em dev com env `CAROUSEL_TEMPLATES_HOT_RELOAD=true`

- [ ] **Testes unitários**

| Caso | Esperado |
|------|----------|
| `editorial-performance` + `text-image/v3` | 3 slots (`image_url`, `image_url_2`, `image_url_3`) |
| `text/v1` | 0 slots |
| `start/v1` | 1 slot `image_url` |
| Template inexistente | throw `TemplateNotFoundError` |

---

### Task 3: Completar templates estáticos

**Files:**
- Modify: `apps/api/src/agents/carousel/templates/minimal-clean/manifest.json`
- Create: variações faltantes em `minimal-clean/slides/**`
- Modify: `apps/api/src/agents/carousel/templates/editorial-performance/manifest.json` (novo formato com `imageSlots`)
- Modify: `instructions.md` de ambos os templates (documentar slots por variação)

- [ ] **`minimal-clean` — fechar gap manifest vs arquivos**

O manifest atual lista `v2`/`v3` sem arquivos. Opções (escolher uma):
- **A (recomendado):** criar HTML/CSS para todas as variações prometidas
- **B:** reduzir manifest para refletir apenas `v1` até designs existirem

- [ ] **Atualizar manifests para formato com `imageSlots`**

Garantir que cada variação com `<img src="{{image_url_N}}">` declare slots correspondentes.

- [ ] **Seed marketplace (fixtures Plano 2 + API seed)**

| slug | type | refId |
|------|------|-------|
| `carousel-editorial-performance` | `TEMPLATE` | `editorial-performance` |
| `carousel-minimal-clean` | `TEMPLATE` | `minimal-clean` |

`specs` JSON: `{ "templateId": "editorial-performance", "previewAspectRatio": "4:5" }`

---

### Task 4: Marketplace → templates resgatados

**Files:**
- Modify: `apps/api/prisma/schema.prisma` — confirmar `MarketplaceItemType.TEMPLATE` + `refId` (já existe)
- Modify: `apps/api/src/marketplace/marketplace.service.ts` — validar `refId` aponta para template existente no `CarouselTemplateService`
- Create: `apps/api/src/agents/carousel/carousel-templates.controller.ts` (opcional, thin)
- Modify: `apps/web/src/core/modules/marketplace/hooks/use-marketplace.ts` — filtrar `type=TEMPLATE` para carrossel

**Endpoint sugerido:**

```
GET /api/agents/carousel/templates
→ { templates: [{ id, name, description, owned: boolean }] }
```

Filtra por `WorkspaceEntitlement` onde `item.refId === templateId`.

- [ ] **Backend:** listar apenas templates owned no workspace
- [ ] **Frontend:** `useCarouselTemplates()` substitui `CAROUSEL_TEMPLATES_FIXTURE`
- [ ] **Empty state:** overview + modal quando `templates.length === 0` (já existe UI — ligar ao hook real)
- [ ] **Permissão:** `library.read` ou `generation.create` para listar

---

### Task 5: `buildCarouselRunDeps` (produção)

**Files:**
- Modify: `apps/api/src/agents/carousel/build-carousel-run-deps.ts`
- Modify: `apps/api/src/agents/carousel/ports/carousel-run-deps.ts`
- Modify: `apps/api/src/agents/adapters/carousel-run-deps.adapter.ts`

**Interfaces:**
- Produces: deps com `templateService`, `resolveImageUrls`, `uploadRenderedPng`, `listOwnedTemplateIds`

```typescript
export type CarouselRunDeps = {
  templateService: CarouselTemplateService;
  resolveFileUrl: (params: {
    fileId: string;
    companyId: string;
  }) => Promise<string>;
  storeRenderedPng: (params: {
    runId: string;
    slideId: string;
    buffer: Buffer;
    companyId: string;
  }) => Promise<string>; // returns storage file id
  listOwnedTemplateIds: (params: {
    companyId?: string;
    personalSpaceId?: string;
  }) => Promise<string[]>;
};
```

- [ ] **Injetar** `PrismaService`, `StorageService`, `CarouselTemplateService` no adapter (padrão `CutsRunDepsAdapter`)
- [ ] **`resolveFileUrl`** — presigned GET para `WorkspaceFile` do upload do usuário
- [ ] **`storeRenderedPng`** — PUT S3 + registro em `WorkspaceFile` (pasta do run, padrão cuts)
- [ ] **Validar `templateId` no input** contra `listOwnedTemplateIds` antes de iniciar run (controller ou primeiro step)

---

### Task 6: Routing de rejeição no agente

**Files:**
- Modify: `apps/api/src/agents/carousel/agent.ts`
- Modify: `apps/api/src/agents/carousel/agent.spec.ts`

Usar `AgentBuilder.when()` / `.addRouting()` do SDK:

```typescript
.addRouting({
  after: 'await_content_approval',
  decide: (ctx) => {
    const payload = ctx.inputPayload as { approved?: boolean };
    return payload.approved === false ? 'reject' : 'approve';
  },
  branches: {
    approve: [], // segue fluxo normal
    reject: [
      'generate_design_plan',
      'await_design_approval',
      'generate_slides',
      'render_slides',
      'finalize_carousel',
    ], // pula design+ — volta só para generate_content na próxima iteração
  },
})
```

**Nota:** validar comportamento exato de `computeRoutingSkips` — pode ser necessário marcar `generate_content` como re-run e limpar outputs parciais via metadata. Documentar no teste de harness.

- [ ] **Routing `await_content_approval` → `reject`** reexecuta `generate_content`
- [ ] **Routing `await_design_approval` → `reject`** reexecuta `generate_design_plan`
- [ ] **Testes** com `AgentTestHarness` simulando `approved: false` em ambas as pausas

---

### Task 7: Enriquecer prompts com template context

**Files:**
- Modify: `apps/api/src/agents/carousel/prompts/ideas.prompts.ts`
- Modify: `apps/api/src/agents/carousel/prompts/content.prompts.ts`
- Modify: `apps/api/src/agents/carousel/prompts/design-plan.prompts.ts`
- Modify: `apps/api/src/agents/carousel/prompts/slides.prompts.ts`
- Modify: steps para ler `getCarouselRunDeps().templateService`

| Step | Injetar no prompt |
|------|-------------------|
| `generate_content` | `instructions.md` completo |
| `generate_design_plan` | instructions + lista de variações por tipo + **imageSlots por variação** |
| `generate_slides` | HTML/CSS de referência da variação + mapa `slotKey → image URL` resolvida |

- [ ] **Design plan LLM output** deve retornar `imageSlots` idênticos ao manifest (labels podem ser refinados pela IA)
- [ ] **`generate_slides`** substitui `{{image_url_N}}` com URLs presigned antes de persistir HTML final (ou delega ao render service)

---

### Task 8: `CarouselRenderService`

**Files:**
- Create: `apps/api/src/agents/carousel/services/carousel-render.service.ts`
- Create: `apps/api/src/agents/carousel/services/carousel-render.service.spec.ts`
- Modify: `apps/api/src/agents/carousel/steps/render-slides.step.ts`

- [ ] **Input:** `{ html, css, width, height }` por slide (dimensões do manifest `dimensions[socialNetwork]`)
- [ ] **Processo:** headless Chromium (Puppeteer ou Playwright — alinhar ao que o monorepo já usa em outros renders)
- [ ] **Output:** PNG buffer → `storeRenderedPng` → atualiza `pngFileId` em cada slide
- [ ] **Incluir `shared/base.css`** quando existir no template
- [ ] **Timeout** por slide (ex.: 30s) com erro recuperável no step
- [ ] **Substituir no-op** atual em `render-slides.step.ts`

**Dimensões:**

| Rede | Tamanho | Status |
|------|---------|--------|
| `instagram` | do manifest (`1080×1080` ou `1080×1350`) | ativo |
| `facebook` | `1200×1200` | reservado |
| `tiktok` | `1080×1920` | reservado |

---

### Task 9: API de exportação ZIP

**Files:**
- Create: `apps/api/src/agents/carousel/carousel-export.controller.ts`
- Modify: `apps/api/src/agents/agents.module.ts`

```
GET /api/agents/carousel/runs/:runId/export
→ application/zip (carousel-slide-01.png, ...)
```

- [ ] **Permissão:** `agentRun.read`
- [ ] **Pré-condição:** run `completed`, todos os slides com `pngFileId`
- [ ] **Se PNGs ausentes:** disparar `render_slides` síncrono ou retornar `409` com mensagem clara
- [ ] **Frontend:** `carousel-preview-step.tsx` chama endpoint real; remove mock de export

---

### Task 10: Frontend — hooks com API real

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-carousel-templates.ts`
- Modify: `use-carousel-runs.ts` — padrão `use-cuts-runs.ts` (`apiClient.get('/agents/carousel/runs')`)
- Modify: `use-carousel-run-modal.ts` — `POST /agents/carousel/run`
- Modify: `use-carousel-run-detail.ts` — padrão `use-cuts-run-detail.ts` (`useAgentRun` + `useAgentRunStream`)
- Modify: `use-carousel-settings.ts` — `GET/PATCH` workspace agent settings
- Modify: `carousel-overview-page.tsx`, `carousel-source-step.tsx`, `carousel-settings-form.tsx` — remover imports de fixtures de templates

**Contrato de run (pausas):**

| Fase UI | Step key | Answer payload |
|---------|----------|----------------|
| Ideias | `await_idea_selection` | `{ selectedIdeaId }` |
| Conteúdo | `await_content_approval` | `{ approved, slides? }` |
| Design | `await_design_approval` | `{ approved, plan?, imageUploads? }` |
| Preview | — | run completed |

- [ ] **SSE:** mapear step status → fases do wizard (`carousel-run-steps.ts`)
- [ ] **Remover `setTimeout`** da máquina de estado local
- [ ] **Manter fixture `run_carousel_preview`** apenas em Storybook/dev flag se necessário

---

### Task 11: Frontend — upload multi-imagem (presigned)

**Files:**
- Modify: `carousel-design-plan-step.tsx`
- Create: `apps/web/src/core/modules/agents/hooks/use-carousel-image-upload.ts`

Seguir padrão do agente de cortes (presigned PUT → `WorkspaceFile` → `fileId`).

**UI por slide com N slots:**

```
Slide 3 — Texto + Imagem (v3)
├── Miniatura 1  [upload]
├── Miniatura 2  [upload]
└── Miniatura 3  [upload opcional]
```

- [ ] **Chave de upload:** `buildImageUploadKey(slide.id, slot.slotKey)`
- [ ] **Validação:** botão Aprovar desabilitado até todos `required` preenchidos
- [ ] **Counter global:** soma de slots required em todo o plano
- [ ] **Thumbnail + remover** por slot

---

### Task 12: Testes

**Files:**
- Modify: `apps/api/src/agents/carousel/agent.spec.ts`
- Create: `apps/api/test/agents-carousel.e2e-spec.ts`
- Modify: `apps/web/e2e/carousel-flow.spec.ts`

- [ ] **Unit:** `CarouselTemplateService` (slots multi-imagem)
- [ ] **Unit:** `CarouselRenderService` (smoke com HTML mínimo)
- [ ] **Harness:** fluxo completo com pausas e `imageUploads` multi-slot
- [ ] **E2E API:** criar run → answer ideia → aprovar conteúdo → aprovar design com 3 uploads → output validado
- [ ] **Playwright:** fluxo feliz com API (ambiente de teste com mock LLM se necessário)

---

### Task 13: Documentação

**Files:**
- Create: `docs/agents/carousel/README.md`
- Modify: `docs/agents/README.md` — entrada `carousel`
- Modify: `docs/agents/mvp/carousel/README.md` — banner “superseded by…”
- Modify: `docs/superpowers/specs/2026-06-28-carousel-agent-design.md` — seção imageSlots (opcional, sync)
- Modify: `docs/project/current-state.md` — status pós Plano 3

Conteúdo mínimo do README canônico:
- Agent ID, rotas, permissões
- Pipeline de 9 steps
- Modelo `imageSlots` + manifest
- Marketplace `TEMPLATE` + `refId`
- Endpoints e contratos

---

## Ordem de execução recomendada

```
Task 1 (schemas)
    → Task 2 (template service)
    → Task 3 (assets)
    → Task 4 (marketplace)
    → Task 5 (deps)
    → Task 6 (routing) + Task 7 (prompts)  [paralelo]
    → Task 8 (render)
    → Task 9 (export)
    → Task 10 + 11 (frontend)  [paralelo após API estável]
    → Task 12 (tests)
    → Task 13 (docs)
```

---

## Self-review — checklist de cobertura

| Requisito | Task |
|-----------|------|
| Múltiplas imagens por variação de slide | 1, 2, 3, 7, 11 |
| `CarouselTemplateService` | 2 |
| `CarouselRenderService` + PNG S3 | 8 |
| `minimal-clean` completo | 3 |
| Marketplace `TEMPLATE` + owned filter | 4 |
| Deps reais (Prisma, storage) | 5 |
| Routing rejeição content/design | 6 |
| Prompts com instructions + HTML ref | 7 |
| Export ZIP | 9 |
| Frontend sem fixtures | 10, 11 |
| Testes | 12 |
| Docs canônicas | 13 |

---

## Fora de escopo (fases futuras)

- Geração de imagens por IA (`aiGeneratedImages`)
- Facebook e TikTok ativos (dimensões já reservadas no manifest)
- Edição pós-geração do carrossel
- Editor visual de templates no produto (templates permanecem no repo)

---

## Referências de código existente

| Padrão | Onde copiar |
|--------|-------------|
| Run deps + adapter | `apps/api/src/agents/cuts/build-cuts-run-deps.ts` |
| Hooks API + SSE | `apps/web/src/core/modules/agents/hooks/use-cuts-run-detail.ts` |
| Presigned upload | fluxo de arquivos do agente de cortes |
| AgentBuilder routing | `packages/agent-ia-sdk/src/agents/routing/routing.ts` |
| UI wizard | componentes em `apps/web/src/core/modules/agents/components/carousel/` |
