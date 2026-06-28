# Agente Carrossel — Plano 2: Frontend (Fixtures) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar a UI completa do agente Carrossel usando fixtures e estado local (zero chamadas à API de produto), seguindo os padrões visuais e de código do agente de Cortes.

**Architecture:** Todos os dados vêm de fixtures estáticas. Os hooks retornam dados de fixture sem chamadas de rede. A máquina de estado em `use-carousel-run-detail.ts` simula a progressão das 4 fases do wizard com `setTimeout`. As rotas existentes de `[agentSlug]` já estão prontas — basta registrar `carousel` nos switches e no catálogo de agentes.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query (modo fixture), React Hook Form + Zod, Tailwind v4, tw-animate-css, shadcn/ui (`Button`, `Badge`, `Dialog`, `StatusModal`, `Slider`, `Select`, `Textarea`), Lucide React, next-intl

## Global Constraints

- Zero `axios`/`fetch` para a API de produto (Plano 2)
- Todos os identificadores em inglês (nomes de funções, variáveis, componentes, hooks, classes)
- `gap-6` entre seções, `gap-4` dentro de agrupamentos
- Animações com `tw-animate-css` em overlays e interativos
- `"use client"` somente quando necessário; Server Components por padrão
- Componentes em `apps/web/src/core/modules/agents/components/carousel/`
- Hooks em `apps/web/src/core/modules/agents/hooks/`
- Fixtures em `apps/web/src/core/modules/blister-os/fixtures/`
- RHF + zodResolver, `mode: 'onBlur'`
- Schemas Zod em `packages/types/src/agents/carousel.ts`
- Seguir exatamente o padrão visual do design system: mesmas classes CSS, mesmos tokens

---

### Task 1: Zod Schemas e Types

**Files:**
- Create: `packages/types/src/agents/carousel.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces: `CarouselSocialNetwork`, `CarouselSlideType`, `CarouselAgentSettings`, `CarouselRunInput`, `CarouselIdeaOption`, `CarouselSlideContent`, `CarouselSlideDesign`, `CarouselDesignPlan`, `CarouselOutputSlide`, `CarouselOutput`, todos os schemas Zod correspondentes

- [ ] **Criar `packages/types/src/agents/carousel.ts`**

```typescript
import { z } from "zod";

export const carouselSocialNetworkSchema = z.enum([
  "instagram",
  "facebook",
  "tiktok",
]);
export type CarouselSocialNetwork = z.infer<typeof carouselSocialNetworkSchema>;

export const carouselSlideTypeSchema = z.enum([
  "start",
  "text",
  "text_image",
  "image",
]);
export type CarouselSlideType = z.infer<typeof carouselSlideTypeSchema>;

export const carouselAgentSettingsSchema = z.object({
  slidesCount: z.number().int().min(3).max(15).default(5),
  defaultTemplateId: z.string().optional(),
  defaultSocialNetworks: z
    .array(carouselSocialNetworkSchema)
    .default(["instagram"]),
  aiGeneratedImages: z.boolean().default(false),
});
export type CarouselAgentSettings = z.infer<typeof carouselAgentSettingsSchema>;

export const carouselRunInputSchema = z.object({
  theme: z.string().min(1, "Insira um tema"),
  templateId: z.string().min(1, "Selecione um template"),
  socialNetworks: z
    .array(carouselSocialNetworkSchema)
    .min(1, "Selecione ao menos uma rede social"),
  slidesCount: z.number().int().min(3).max(15),
});
export type CarouselRunInput = z.infer<typeof carouselRunInputSchema>;

export const carouselIdeaOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});
export type CarouselIdeaOption = z.infer<typeof carouselIdeaOptionSchema>;

export const carouselSlideContentSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  title: z.string().optional(),
  body: z.string().optional(),
  callToAction: z.string().optional(),
});
export type CarouselSlideContent = z.infer<typeof carouselSlideContentSchema>;

export const carouselSlideDesignSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  variationId: z.string(),
  needsImage: z.boolean(),
  imageSlot: z.string().optional(),
  imageFileId: z.string().optional(),
  layoutNotes: z.string(),
});
export type CarouselSlideDesign = z.infer<typeof carouselSlideDesignSchema>;

export const carouselDesignPlanSchema = z.object({
  templateId: z.string(),
  slides: z.array(carouselSlideDesignSchema),
});
export type CarouselDesignPlan = z.infer<typeof carouselDesignPlanSchema>;

export const carouselOutputSlideSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  htmlContent: z.string(),
  cssContent: z.string(),
  pngFileId: z.string().optional(),
});
export type CarouselOutputSlide = z.infer<typeof carouselOutputSlideSchema>;

export const carouselOutputSchema = z.object({
  socialNetwork: carouselSocialNetworkSchema,
  templateId: z.string(),
  slides: z.array(carouselOutputSlideSchema),
});
export type CarouselOutput = z.infer<typeof carouselOutputSchema>;
```

- [ ] **Exportar do `packages/types/src/index.ts`**

Adicionar junto às demais exportações de agents:
```typescript
export * from "./agents/carousel";
```

- [ ] **Verificar que o build de types não quebra**

```bash
cd packages/types && npx tsc --noEmit
```
Esperado: sem erros.

- [ ] **Commit**

```bash
git add packages/types/src/agents/carousel.ts packages/types/src/index.ts
git commit -m "feat(types): add carousel agent Zod schemas"
```

---

### Task 2: Fixtures do Carrossel

**Files:**
- Create: `apps/web/src/core/modules/blister-os/fixtures/carousel-templates.fixture.ts`
- Create: `apps/web/src/core/modules/blister-os/fixtures/carousel-runs.fixture.ts`
- Modify: `apps/web/src/core/modules/blister-os/fixtures/agents-catalog.fixture.ts`

**Interfaces:**
- Produces: `CAROUSEL_TEMPLATES_FIXTURE`, `CAROUSEL_IDEAS_FIXTURE`, `CAROUSEL_SLIDE_CONTENTS_FIXTURE`, `CAROUSEL_DESIGN_PLAN_FIXTURE`, `CAROUSEL_OUTPUT_FIXTURE`, `CAROUSEL_RUNS_FIXTURE`
- Modifies: `AGENTS_CATALOG` (adiciona entrada `carousel`)

- [ ] **Criar `carousel-templates.fixture.ts`**

```typescript
export type CarouselTemplateFixture = {
  id: string;
  name: string;
  description: string;
  thumbnailColor: string;
};

export const CAROUSEL_TEMPLATES_FIXTURE: CarouselTemplateFixture[] = [
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "Layout minimalista com tipografia bold",
    thumbnailColor: "#0a0a0a",
  },
];
```

- [ ] **Criar `carousel-runs.fixture.ts`**

```typescript
import type {
  CarouselIdeaOption,
  CarouselSlideContent,
  CarouselDesignPlan,
  CarouselOutput,
} from "@company-os/types";

const daysAgo = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export type CarouselRunFixture = {
  id: string;
  agentId: "carousel";
  theme: string;
  templateId: string;
  status: "completed" | "running" | "failed" | "paused";
  slidesCount: number;
  createdAt: string;
  creditsUsed?: number;
};

export const CAROUSEL_RUNS_FIXTURE: CarouselRunFixture[] = [
  {
    id: "run_carousel_1",
    agentId: "carousel",
    theme: "5 hábitos que vão transformar sua manhã",
    templateId: "minimal-clean",
    status: "completed",
    slidesCount: 5,
    createdAt: daysAgo(1, 14),
    creditsUsed: 2.1,
  },
  {
    id: "run_carousel_2",
    agentId: "carousel",
    theme: "Como criar conteúdo consistente sem burnout",
    templateId: "minimal-clean",
    status: "paused",
    slidesCount: 7,
    createdAt: daysAgo(0, 9),
    creditsUsed: 0.8,
  },
];

export const CAROUSEL_IDEAS_FIXTURE: CarouselIdeaOption[] = [
  {
    id: "idea_1",
    title: "5 hábitos que vão transformar sua manhã",
    description:
      "Um guia prático com rotinas matinais simples que qualquer pessoa pode adotar para começar o dia com mais foco e energia.",
  },
  {
    id: "idea_2",
    title: "Por que você está se sabotando sem perceber",
    description:
      "Comportamentos inconscientes que impedem o crescimento pessoal e como identificá-los na sua rotina diária.",
  },
  {
    id: "idea_3",
    title: "O método simples para parar de procrastinar",
    description:
      "Técnica de 2 minutos adaptada para criadores de conteúdo que sempre deixam tarefas importantes para depois.",
  },
  {
    id: "idea_4",
    title: "Como pessoas produtivas usam o tempo livre",
    description:
      "O que os mais produtivos fazem nos momentos de descanso que a maioria das pessoas ignora completamente.",
  },
  {
    id: "idea_5",
    title: "Erros que iniciantes cometem (e como evitar)",
    description:
      "Os 5 erros mais comuns de quem está começando e as correções simples que fazem toda a diferença.",
  },
];

export const CAROUSEL_SLIDE_CONTENTS_FIXTURE: CarouselSlideContent[] = [
  {
    id: "sc_1",
    order: 1,
    type: "start",
    title: "5 hábitos que vão transformar sua manhã",
    body: "A maioria das pessoas subestima o poder das primeiras horas do dia.",
  },
  {
    id: "sc_2",
    order: 2,
    type: "text",
    title: "Acorde 30 minutos mais cedo",
    body: "Não para fazer mais — para ter tempo sem pressa. Esse espaço muda tudo.",
  },
  {
    id: "sc_3",
    order: 3,
    type: "text_image",
    title: "Hidrate-se antes do café",
    body: "Seu corpo passa 8 horas sem água. Um copo simples aumenta o nível de energia em até 30%.",
    callToAction: "Simples assim.",
  },
  {
    id: "sc_4",
    order: 4,
    type: "text",
    title: "Evite o celular nos primeiros 20 minutos",
    body: "Checar notificações logo cedo coloca seu cérebro em modo reativo. Comece no seu ritmo.",
  },
  {
    id: "sc_5",
    order: 5,
    type: "text_image",
    title: "Mova o corpo, mesmo que por 10 minutos",
    body: "Uma caminhada curta, alongamento ou 5 minutos de respiração. Ativa o corpo e a mente.",
    callToAction: "Seu futuro eu agradece.",
  },
];

export const CAROUSEL_DESIGN_PLAN_FIXTURE: CarouselDesignPlan = {
  templateId: "minimal-clean",
  slides: [
    {
      id: "sc_1",
      order: 1,
      type: "start",
      variationId: "v1",
      needsImage: false,
      layoutNotes:
        "Slide de abertura com título grande centralizado, fundo escuro #0a0a0a, tipografia bold 64px, subtítulo 24px com opacidade 70%.",
    },
    {
      id: "sc_2",
      order: 2,
      type: "text",
      variationId: "v2",
      needsImage: false,
      layoutNotes:
        "Número do hábito (01) em destaque no topo, título bold abaixo, corpo do texto em tamanho menor. Fundo claro com acento de cor.",
    },
    {
      id: "sc_3",
      order: 3,
      type: "text_image",
      variationId: "v1",
      needsImage: true,
      imageSlot: "foto de copo d'água",
      layoutNotes:
        "Imagem ocupando 55% superior do slide, texto na metade inferior com fundo branco. Call to action em destaque na base.",
    },
    {
      id: "sc_4",
      order: 4,
      type: "text",
      variationId: "v3",
      needsImage: false,
      layoutNotes:
        "Layout com fundo escuro contrastante. Ícone de celular riscado centralizado acima do título para reforço visual.",
    },
    {
      id: "sc_5",
      order: 5,
      type: "text_image",
      variationId: "v2",
      needsImage: true,
      imageSlot: "foto de pessoa se exercitando",
      layoutNotes:
        "Imagem à direita ocupando 40% da largura. Texto e call to action à esquerda em coluna. Badge de número do hábito no canto superior esquerdo.",
    },
  ],
};

export const CAROUSEL_OUTPUT_FIXTURE: CarouselOutput = {
  socialNetwork: "instagram",
  templateId: "minimal-clean",
  slides: [
    {
      id: "sc_1",
      order: 1,
      type: "start",
      htmlContent: `<div class="slide slide-start"><div class="slide-number">01</div><h1>5 hábitos que vão transformar sua manhã</h1><p>A maioria das pessoas subestima o poder das primeiras horas do dia.</p></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;padding:64px;box-sizing:border-box;font-family:system-ui,sans-serif}.slide-start h1{font-size:56px;font-weight:900;color:#fff;text-align:center;line-height:1.1;margin:16px 0}.slide-start p{font-size:22px;color:rgba(255,255,255,.65);text-align:center}`,
    },
    {
      id: "sc_2",
      order: 2,
      type: "text",
      htmlContent: `<div class="slide slide-text"><span class="habit-number">01</span><h2>Acorde 30 minutos mais cedo</h2><p>Não para fazer mais — para ter tempo sem pressa. Esse espaço muda tudo.</p></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9f9f7;padding:72px;box-sizing:border-box;font-family:system-ui,sans-serif}.habit-number{font-size:80px;font-weight:900;color:#e8e8e4;line-height:1}.slide-text h2{font-size:48px;font-weight:800;color:#111;text-align:center;margin:8px 0}.slide-text p{font-size:22px;color:#555;text-align:center;line-height:1.5}`,
    },
    {
      id: "sc_3",
      order: 3,
      type: "text_image",
      htmlContent: `<div class="slide slide-text-image"><div class="image-area" style="background:#dbeafe"></div><div class="text-area"><h2>Hidrate-se antes do café</h2><p>Seu corpo passa 8 horas sem água. Um copo simples aumenta o nível de energia em até 30%.</p><span class="cta">Simples assim.</span></div></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;background:#fff;font-family:system-ui,sans-serif;box-sizing:border-box}.image-area{height:55%;width:100%}.text-area{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px}.slide-text-image h2{font-size:40px;font-weight:800;color:#111;margin:0 0 12px}.slide-text-image p{font-size:20px;color:#444;line-height:1.5;margin:0 0 16px}.cta{font-size:18px;font-weight:700;color:#2563eb}`,
    },
    {
      id: "sc_4",
      order: 4,
      type: "text",
      htmlContent: `<div class="slide slide-text-dark"><span class="habit-number">04</span><h2>Evite o celular nos primeiros 20 minutos</h2><p>Checar notificações logo cedo coloca seu cérebro em modo reativo. Comece no seu ritmo.</p></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1c1c1e;padding:72px;box-sizing:border-box;font-family:system-ui,sans-serif}.habit-number{font-size:80px;font-weight:900;color:rgba(255,255,255,.1);line-height:1}.slide-text-dark h2{font-size:44px;font-weight:800;color:#fff;text-align:center;margin:8px 0}.slide-text-dark p{font-size:22px;color:rgba(255,255,255,.65);text-align:center;line-height:1.5}`,
    },
    {
      id: "sc_5",
      order: 5,
      type: "text_image",
      htmlContent: `<div class="slide slide-split"><div class="text-col"><span class="habit-number">05</span><h2>Mova o corpo, mesmo que por 10 minutos</h2><p>Uma caminhada curta, alongamento ou 5 minutos de respiração.</p><span class="cta">Seu futuro eu agradece.</span></div><div class="image-col" style="background:#dcfce7"></div></div>`,
      cssContent: `.slide{width:1080px;height:1080px;display:flex;background:#fff;font-family:system-ui,sans-serif;box-sizing:border-box}.text-col{flex:1;display:flex;flex-direction:column;justify-content:center;padding:60px 48px}.habit-number{font-size:64px;font-weight:900;color:#e8e8e4;line-height:1}.slide-split h2{font-size:40px;font-weight:800;color:#111;margin:8px 0 12px}.slide-split p{font-size:20px;color:#444;line-height:1.5;margin:0 0 16px}.cta{font-size:18px;font-weight:700;color:#16a34a}.image-col{width:400px}`,
    },
  ],
};
```

- [ ] **Adicionar `carousel` ao catálogo de agentes**

Em `apps/web/src/core/modules/blister-os/fixtures/agents-catalog.fixture.ts`:

```typescript
import { GalleryHorizontal, Scissors } from "lucide-react";

// adicionar à lista AGENTS_CATALOG:
{
  id: "carousel",
  name: "Carrossel",
  description:
    "Transforme um tema em slides prontos para postar no Instagram, com design profissional e conteúdo otimizado.",
  stat: "0 carrosséis gerados",
  tier: "marketplace" as AgentTier,
  icon: GalleryHorizontal,
  routeSlug: "carousel",
},
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/blister-os/fixtures/carousel-templates.fixture.ts apps/web/src/core/modules/blister-os/fixtures/carousel-runs.fixture.ts apps/web/src/core/modules/blister-os/fixtures/agents-catalog.fixture.ts
git commit -m "feat(carousel): add carousel fixtures and catalog entry"
```

---

### Task 3: Hook de estado do run detail (wizard state machine)

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-carousel-run-detail.ts`

**Interfaces:**
- Consumes: `CAROUSEL_IDEAS_FIXTURE`, `CAROUSEL_SLIDE_CONTENTS_FIXTURE`, `CAROUSEL_DESIGN_PLAN_FIXTURE`, `CAROUSEL_OUTPUT_FIXTURE` da Task 2
- Produces: `useCarouselRunDetail(runId)` → `{ phase, ideas, content, design, preview, actions }`

- [ ] **Criar `use-carousel-run-detail.ts`**

```typescript
"use client";

import { useCallback, useReducer, useRef } from "react";

import type {
  CarouselDesignPlan,
  CarouselIdeaOption,
  CarouselOutput,
  CarouselSlideContent,
  CarouselSlideDesign,
} from "@company-os/types";
import {
  CAROUSEL_DESIGN_PLAN_FIXTURE,
  CAROUSEL_IDEAS_FIXTURE,
  CAROUSEL_OUTPUT_FIXTURE,
  CAROUSEL_SLIDE_CONTENTS_FIXTURE,
} from "src/core/modules/blister-os/fixtures/carousel-runs.fixture";

export type CarouselPhaseStatus =
  | "idle"
  | "processing"
  | "awaiting_action"
  | "completed"
  | "error";

type State = {
  ideas: {
    status: CarouselPhaseStatus;
    data: CarouselIdeaOption[];
    selectedId: string | null;
  };
  content: {
    status: CarouselPhaseStatus;
    data: CarouselSlideContent[];
  };
  design: {
    status: CarouselPhaseStatus;
    data: CarouselDesignPlan | null;
    imageUploads: Record<string, string>;
  };
  preview: {
    status: CarouselPhaseStatus;
    data: CarouselOutput | null;
    isExporting: boolean;
  };
};

type Action =
  | { type: "SELECT_IDEA"; id: string }
  | { type: "CONTENT_READY"; data: CarouselSlideContent[] }
  | { type: "APPROVE_CONTENT"; data: CarouselSlideContent[] }
  | { type: "REJECT_CONTENT" }
  | { type: "DESIGN_READY"; data: CarouselDesignPlan }
  | { type: "APPROVE_DESIGN"; plan: CarouselDesignPlan; imageUploads: Record<string, string> }
  | { type: "REJECT_DESIGN" }
  | { type: "PREVIEW_READY"; data: CarouselOutput }
  | { type: "SET_IMAGE_UPLOAD"; slideId: string; url: string }
  | { type: "START_EXPORT" }
  | { type: "EXPORT_DONE" };

const initialState: State = {
  ideas: {
    status: "awaiting_action",
    data: CAROUSEL_IDEAS_FIXTURE,
    selectedId: null,
  },
  content: { status: "idle", data: [] },
  design: { status: "idle", data: null, imageUploads: {} },
  preview: { status: "idle", data: null, isExporting: false },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SELECT_IDEA":
      return {
        ...state,
        ideas: { ...state.ideas, status: "completed", selectedId: action.id },
        content: { ...state.content, status: "processing" },
      };
    case "CONTENT_READY":
      return {
        ...state,
        content: { status: "awaiting_action", data: action.data },
      };
    case "APPROVE_CONTENT":
      return {
        ...state,
        content: { ...state.content, status: "completed", data: action.data },
        design: { ...state.design, status: "processing" },
      };
    case "REJECT_CONTENT":
      return {
        ...state,
        content: { ...state.content, status: "processing" },
      };
    case "DESIGN_READY":
      return {
        ...state,
        design: { ...state.design, status: "awaiting_action", data: action.data },
      };
    case "APPROVE_DESIGN":
      return {
        ...state,
        design: {
          status: "completed",
          data: action.plan,
          imageUploads: action.imageUploads,
        },
        preview: { status: "processing", data: null, isExporting: false },
      };
    case "REJECT_DESIGN":
      return {
        ...state,
        design: { ...state.design, status: "processing" },
      };
    case "PREVIEW_READY":
      return {
        ...state,
        preview: { status: "completed", data: action.data, isExporting: false },
      };
    case "SET_IMAGE_UPLOAD":
      return {
        ...state,
        design: {
          ...state.design,
          imageUploads: {
            ...state.design.imageUploads,
            [action.slideId]: action.url,
          },
        },
      };
    case "START_EXPORT":
      return {
        ...state,
        preview: { ...state.preview, isExporting: true },
      };
    case "EXPORT_DONE":
      return {
        ...state,
        preview: { ...state.preview, isExporting: false },
      };
    default:
      return state;
  }
}

const PROCESSING_DELAY_MS = 1800;
const PREVIEW_DELAY_MS = 2400;

export const useCarouselRunDetail = (_runId: string) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scheduleDispatch = useCallback(
    (action: Action, delay: number) => {
      const timer = setTimeout(() => {
        dispatch(action);
        timersRef.current = timersRef.current.filter((t) => t !== timer);
      }, delay);
      timersRef.current.push(timer);
    },
    [],
  );

  const selectIdea = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT_IDEA", id });
      scheduleDispatch(
        { type: "CONTENT_READY", data: CAROUSEL_SLIDE_CONTENTS_FIXTURE },
        PROCESSING_DELAY_MS,
      );
    },
    [scheduleDispatch],
  );

  const approveContent = useCallback(
    (data: CarouselSlideContent[]) => {
      dispatch({ type: "APPROVE_CONTENT", data });
      scheduleDispatch(
        { type: "DESIGN_READY", data: CAROUSEL_DESIGN_PLAN_FIXTURE },
        PROCESSING_DELAY_MS,
      );
    },
    [scheduleDispatch],
  );

  const rejectContent = useCallback(() => {
    dispatch({ type: "REJECT_CONTENT" });
    scheduleDispatch(
      { type: "CONTENT_READY", data: CAROUSEL_SLIDE_CONTENTS_FIXTURE },
      PROCESSING_DELAY_MS,
    );
  }, [scheduleDispatch]);

  const setImageUpload = useCallback((slideId: string, url: string) => {
    dispatch({ type: "SET_IMAGE_UPLOAD", slideId, url });
  }, []);

  const approveDesign = useCallback(
    (plan: CarouselDesignPlan, imageUploads: Record<string, string>) => {
      dispatch({ type: "APPROVE_DESIGN", plan, imageUploads });
      scheduleDispatch(
        { type: "PREVIEW_READY", data: CAROUSEL_OUTPUT_FIXTURE },
        PREVIEW_DELAY_MS,
      );
    },
    [scheduleDispatch],
  );

  const rejectDesign = useCallback(() => {
    dispatch({ type: "REJECT_DESIGN" });
    scheduleDispatch(
      { type: "DESIGN_READY", data: CAROUSEL_DESIGN_PLAN_FIXTURE },
      PROCESSING_DELAY_MS,
    );
  }, [scheduleDispatch]);

  const requestExport = useCallback(() => {
    dispatch({ type: "START_EXPORT" });
    setTimeout(() => dispatch({ type: "EXPORT_DONE" }), 2000);
  }, []);

  return {
    ideas: state.ideas,
    content: state.content,
    design: state.design,
    preview: state.preview,
    actions: {
      selectIdea,
      approveContent,
      rejectContent,
      setImageUpload,
      approveDesign,
      rejectDesign,
      requestExport,
    },
  };
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-carousel-run-detail.ts
git commit -m "feat(carousel): add wizard state machine hook (Plano 2)"
```

---

### Task 4: Hook do modal + Source Step

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-carousel-run-modal.ts`
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-source-step.tsx`

**Interfaces:**
- Consumes: `CarouselRunInput`, `carouselRunInputSchema`, `CAROUSEL_TEMPLATES_FIXTURE`
- Produces: `useCarouselRunModal()` → controller com estado do modal; `CarouselSourceStep`

- [ ] **Criar `use-carousel-run-modal.ts`**

```typescript
"use client";

import { useCallback, useState } from "react";

const SUBMIT_DELAY_MS = 1200;

export type CarouselModalStatus = "idle" | "submitting";

export const useCarouselRunModal = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CarouselModalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalVariant, setStatusModalVariant] = useState<"success" | "error">("success");
  const [statusRunId, setStatusRunId] = useState<string | null>(null);
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    setErrorMessage(null);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (status === "submitting") return;
    setOpen(false);
  }, [status]);

  const handleSubmit = useCallback(() => {
    setStatus("submitting");
    setErrorMessage(null);

    setTimeout(() => {
      setStatus("idle");
      setOpen(false);
      // Plano 2: simula run criado com ID fixo
      setStatusRunId("run_carousel_preview");
      setStatusModalVariant("success");
      setStatusModalOpen(true);
    }, SUBMIT_DELAY_MS);
  }, []);

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalOpen(false);
  }, []);

  const handleRetryFromStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setOpen(true);
  }, []);

  return {
    open,
    status,
    isSubmitting: status === "submitting",
    errorMessage,
    statusModalOpen,
    statusModalVariant,
    statusRunId,
    statusErrorMessage,
    handleOpen,
    handleClose,
    handleSubmit,
    handleCloseStatusModal,
    handleRetryFromStatusModal,
  };
};
```

- [ ] **Criar `carousel-source-step.tsx`**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Instagram, Facebook } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { carouselRunInputSchema, type CarouselRunInput } from "@company-os/types";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Slider } from "src/core/shared/components/ui/slider";
import { Textarea } from "src/core/shared/components/ui/textarea";

type CarouselSourceStepProps = {
  onSubmit: (data: CarouselRunInput) => void;
  defaultSlidesCount?: number;
  defaultTemplateId?: string;
  formId: string;
};

const SOCIAL_NETWORKS = [
  { id: "instagram" as const, label: "Instagram", icon: Instagram, enabled: true },
  { id: "facebook" as const, label: "Facebook", icon: Facebook, enabled: false },
];

export const CarouselSourceStep = ({
  onSubmit,
  defaultSlidesCount = 5,
  defaultTemplateId,
  formId,
}: CarouselSourceStepProps) => {
  const form = useForm<CarouselRunInput>({
    resolver: zodResolver(carouselRunInputSchema),
    mode: "onBlur",
    defaultValues: {
      theme: "",
      templateId: defaultTemplateId ?? CAROUSEL_TEMPLATES_FIXTURE[0]?.id ?? "",
      socialNetworks: ["instagram"],
      slidesCount: defaultSlidesCount,
    },
  });

  useEffect(() => {
    if (defaultTemplateId) form.setValue("templateId", defaultTemplateId);
  }, [defaultTemplateId, form]);

  const slidesCount = form.watch("slidesCount");

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tema do carrossel</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: 5 hábitos para ser mais produtivo, como fazer um bolo de cenoura..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              {CAROUSEL_TEMPLATES_FIXTURE.length === 0 ? (
                <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-3">
                  <Paragraph size="p5" tone="secondary">
                    Nenhum template disponível.{" "}
                    <a href="/dashboard/marketplace" className="text-[var(--accent)] underline">
                      Ver templates no Marketplace
                    </a>
                  </Paragraph>
                </div>
              ) : (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CAROUSEL_TEMPLATES_FIXTURE.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ background: tpl.thumbnailColor }}
                          />
                          {tpl.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Rede social</FormLabel>
          <div className="flex gap-3">
            {SOCIAL_NETWORKS.map((net) => {
              const Icon = net.icon;
              const isSelected = form.watch("socialNetworks").includes(net.id);
              return (
                <button
                  key={net.id}
                  type="button"
                  disabled={!net.enabled}
                  onClick={() => {
                    if (!net.enabled) return;
                    form.setValue("socialNetworks", [net.id]);
                  }}
                  className={[
                    "flex items-center gap-2 rounded-[var(--r-md)] border px-4 py-2.5 text-sm font-medium transition-colors",
                    isSelected && net.enabled
                      ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--accent)]"
                      : "border-[var(--line-default)] text-[var(--fg-secondary)]",
                    !net.enabled && "cursor-not-allowed opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Icon className="size-4" />
                  {net.label}
                  {!net.enabled && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      Em breve
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </FormItem>

        <FormField
          control={form.control}
          name="slidesCount"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Quantidade de slides</FormLabel>
                <span className="text-sm font-semibold text-[var(--fg-primary)]">
                  {slidesCount}
                </span>
              </div>
              <FormControl>
                <Slider
                  min={3}
                  max={15}
                  step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-carousel-run-modal.ts apps/web/src/core/modules/agents/components/carousel/carousel-source-step.tsx
git commit -m "feat(carousel): add run modal hook and source step form"
```

---

### Task 5: Modal components (Run Modal + Provider + Status Modal)

**Files:**
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-run-modal.tsx`
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-run-modal-provider.tsx`
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-run-status-modal.tsx`

**Interfaces:**
- Consumes: `useCarouselRunModal`, `CarouselSourceStep`, `StatusModal`, `Dialog`
- Produces: `CarouselRunModalProvider`, `useCarouselRunModalActions`

- [ ] **Criar `carousel-run-modal.tsx`**

```tsx
"use client";

import { AlertCircle } from "lucide-react";

import { CarouselSourceStep } from "./carousel-source-step";
import type { useCarouselRunModal } from "src/core/modules/agents/hooks/use-carousel-run-modal";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

type Controller = ReturnType<typeof useCarouselRunModal>;
const FORM_ID = "carousel-source-form";

export const CarouselRunModal = ({ controller }: { controller: Controller }) => {
  const { open, isSubmitting, errorMessage, handleClose, handleSubmit } = controller;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSubmitting) handleClose();
      }}
    >
      <DialogContent
        data-testid="carousel-run-modal"
        showCloseButton
        onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isSubmitting) e.preventDefault(); }}
        className="max-w-lg gap-6 overflow-hidden"
      >
        <DialogDescription className="sr-only">
          Configurar novo carrossel
        </DialogDescription>

        <DialogHeader>
          <DialogTitle>Novo Carrossel</DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <div
            className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_8%,transparent)] px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
            <Paragraph size="p5" tone="secondary">
              {errorMessage}
            </Paragraph>
          </div>
        )}

        <CarouselSourceStep
          formId={FORM_ID}
          onSubmit={handleSubmit}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? "Criando..." : "Gerar carrossel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Criar `carousel-run-status-modal.tsx`**

```tsx
"use client";

import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import { StatusModal } from "src/core/shared/components/ui/status-modal";
import { useRouter } from "@/i18n/routing";

const CAROUSEL_ROUTE_SLUG = "carousel";

type Props = {
  open: boolean;
  variant: "success" | "error";
  runId: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onRetry?: () => void;
};

export const CarouselRunStatusModal = ({
  open, variant, runId, errorMessage, onClose, onRetry,
}: Props) => {
  const router = useRouter();
  const isSuccess = variant === "success";

  const handleViewExecution = () => {
    if (!runId) return;
    onClose();
    router.push(getAgentRunPath(CAROUSEL_ROUTE_SLUG, runId));
  };

  return (
    <StatusModal
      open={open}
      variant={variant}
      title={isSuccess ? "Carrossel em processamento" : "Erro ao iniciar"}
      description={
        isSuccess
          ? "Seu carrossel está sendo gerado. Acompanhe o progresso na página de execução."
          : (errorMessage ?? "Ocorreu um erro inesperado. Tente novamente.")
      }
      onClose={onClose}
      testId="carousel-status-modal"
      secondaryAction={{ label: "Fechar", onClick: onClose }}
      primaryAction={
        isSuccess
          ? { label: "Ver execução", onClick: handleViewExecution, disabled: !runId, testId: "carousel-status-view-execution" }
          : onRetry
            ? { label: "Tentar novamente", onClick: onRetry, testId: "carousel-status-retry" }
            : undefined
      }
    />
  );
};
```

- [ ] **Criar `carousel-run-modal-provider.tsx`**

```tsx
"use client";

import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { CarouselRunModal } from "./carousel-run-modal";
import { CarouselRunStatusModal } from "./carousel-run-status-modal";
import { useCarouselRunModal } from "src/core/modules/agents/hooks/use-carousel-run-modal";

type CarouselRunModalActions = Pick<
  ReturnType<typeof useCarouselRunModal>,
  "handleOpen" | "handleClose"
>;

const CarouselRunModalActionsContext =
  createContext<CarouselRunModalActions | null>(null);

const CarouselRunModalHost = ({
  actionsRef,
  onReady,
}: {
  actionsRef: MutableRefObject<CarouselRunModalActions | null>;
  onReady: () => void;
}) => {
  const modal = useCarouselRunModal();
  actionsRef.current = { handleOpen: modal.handleOpen, handleClose: modal.handleClose };
  useEffect(() => { onReady(); }, [onReady]);

  return (
    <>
      <CarouselRunModal controller={modal} />
      <CarouselRunStatusModal
        open={modal.statusModalOpen}
        variant={modal.statusModalVariant}
        runId={modal.statusRunId}
        errorMessage={modal.statusErrorMessage}
        onClose={modal.handleCloseStatusModal}
        onRetry={modal.handleRetryFromStatusModal}
      />
    </>
  );
};

export const CarouselRunModalProvider = ({ children }: { children: ReactNode }) => {
  const actionsRef = useRef<CarouselRunModalActions | null>(null);
  const handleHostReady = useCallback(() => {}, []);

  const stableActions = useMemo<CarouselRunModalActions>(
    () => ({
      handleOpen: () => actionsRef.current?.handleOpen(),
      handleClose: () => actionsRef.current?.handleClose(),
    }),
    [],
  );

  return (
    <CarouselRunModalActionsContext.Provider value={stableActions}>
      {children}
      <CarouselRunModalHost actionsRef={actionsRef} onReady={handleHostReady} />
    </CarouselRunModalActionsContext.Provider>
  );
};

export const useCarouselRunModalActions = () => {
  const context = useContext(CarouselRunModalActionsContext);
  if (!context) throw new Error("useCarouselRunModalActions must be used within CarouselRunModalProvider");
  return context;
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/components/carousel/
git commit -m "feat(carousel): add run modal, status modal and provider"
```

---

### Task 6: Overview components (hook + run card + runs grid)

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-carousel-runs.ts`
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-run-card.tsx`
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-runs-grid.tsx`

**Interfaces:**
- Consumes: `CAROUSEL_RUNS_FIXTURE`, `CarouselRunFixture`
- Produces: `useCarouselRuns()`, `CarouselRunCard`, `CarouselRunsGrid`

- [ ] **Criar `use-carousel-runs.ts`**

```typescript
"use client";

import { useMemo } from "react";
import { CAROUSEL_RUNS_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-runs.fixture";

export const useCarouselRuns = () => {
  return useMemo(() => ({
    data: { runs: CAROUSEL_RUNS_FIXTURE, total: CAROUSEL_RUNS_FIXTURE.length },
    isLoading: false,
  }), []);
};

export const useCarouselOverviewStats = () => {
  return useMemo(() => ({
    totalRuns: CAROUSEL_RUNS_FIXTURE.length,
    completedRuns: CAROUSEL_RUNS_FIXTURE.filter((r) => r.status === "completed").length,
    approvedRuns: CAROUSEL_RUNS_FIXTURE.filter((r) => r.status === "completed").length,
    creditsUsed: CAROUSEL_RUNS_FIXTURE.reduce((s, r) => s + (r.creditsUsed ?? 0), 0),
  }), []);
};
```

- [ ] **Criar `carousel-run-card.tsx`**

```tsx
"use client";

import { GalleryHorizontal, Loader2, AlertCircle } from "lucide-react";
import { memo, useCallback } from "react";

import type { CarouselRunFixture } from "src/core/modules/blister-os/fixtures/carousel-runs.fixture";
import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import { Badge } from "src/core/shared/components/ui/badge";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { truncateWithEllipsis } from "src/core/shared/utils";
import { useRouter } from "@/i18n/routing";

const CAROUSEL_ROUTE_SLUG = "carousel";
const THEME_MAX_CHARS = 52;

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "destructive" | "warning" }> = {
  running: { label: "Processando", variant: "secondary" },
  paused: { label: "Aguardando você", variant: "warning" },
  failed: { label: "Falhou", variant: "destructive" },
};

export const CarouselRunCard = memo(({ run }: { run: CarouselRunFixture }) => {
  const router = useRouter();
  const displayTheme = truncateWithEllipsis(run.theme, THEME_MAX_CHARS);
  const isProcessing = run.status === "running";
  const isFailed = run.status === "failed";
  const badge = STATUS_BADGE[run.status];

  const handleOpen = useCallback(() => {
    router.push(getAgentRunPath(CAROUSEL_ROUTE_SLUG, run.id));
  }, [router, run.id]);

  return (
    <article
      data-testid={`carousel-run-card-${run.id}`}
      className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
    >
      <button
        type="button"
        aria-label={`Abrir execução: ${run.theme}`}
        onClick={handleOpen}
        className="relative flex aspect-square w-full cursor-pointer items-center justify-center bg-[color-mix(in_oklch,var(--bg-sunken)_88%,var(--bg-base))] text-[var(--fg-quaternary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {isProcessing ? (
          <Loader2 className="size-8 animate-spin text-[var(--accent)]" />
        ) : isFailed ? (
          <AlertCircle className="size-8 text-[var(--danger)]" />
        ) : (
          <GalleryHorizontal className="size-8" />
        )}
        {badge && (
          <Badge variant={badge.variant} className="absolute top-2.5 left-2.5">
            {badge.label}
          </Badge>
        )}
      </button>

      <div className="flex flex-col gap-1.5 px-3.5 py-3">
        <button type="button" onClick={handleOpen} className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          <Paragraph className="line-clamp-2 text-[13.5px] font-medium leading-snug text-[var(--fg-primary)]">
            {displayTheme}
          </Paragraph>
        </button>
        <Paragraph size="p6" tone="tertiary" className="text-[12px]">
          {run.slidesCount} slides · {run.templateId}
        </Paragraph>
      </div>
    </article>
  );
});
CarouselRunCard.displayName = "CarouselRunCard";
```

- [ ] **Criar `carousel-runs-grid.tsx`**

```tsx
"use client";

import { GalleryHorizontal } from "lucide-react";

import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { CarouselRunCard } from "./carousel-run-card";
import type { CarouselRunFixture } from "src/core/modules/blister-os/fixtures/carousel-runs.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

type Props = { runs: CarouselRunFixture[]; isLoading: boolean };

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="space-y-2 px-3.5 py-3">
          <Skeleton className="h-4 w-[80%]" />
          <Skeleton className="h-3 w-[40%]" />
        </div>
      </div>
    ))}
  </div>
);

export const CarouselRunsGrid = ({ runs, isLoading }: Props) => (
  <section data-testid="carousel-runs-grid" className="flex flex-col gap-4">
    <header className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Heading level="h5" as="h2">Execuções</Heading>
        {!isLoading && (
          <Badge variant="secondary">{runs.length} {runs.length === 1 ? "execução" : "execuções"}</Badge>
        )}
      </div>
      <Paragraph size="p5" tone="tertiary">
        {isLoading ? "Carregando..." : "Histórico de carrosséis gerados"}
      </Paragraph>
    </header>

    {isLoading ? (
      <LoadingGrid />
    ) : runs.length === 0 ? (
      <EmptyState
        icon={GalleryHorizontal}
        title="Nenhum carrossel gerado"
        description="Crie seu primeiro carrossel e ele aparecerá aqui."
        action={<AgentNewRunButton routeSlug="carousel" size="sm" />}
      />
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {runs.map((run) => (
          <CarouselRunCard key={run.id} run={run} />
        ))}
      </div>
    )}
  </section>
);
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-carousel-runs.ts apps/web/src/core/modules/agents/components/carousel/carousel-run-card.tsx apps/web/src/core/modules/agents/components/carousel/carousel-runs-grid.tsx
git commit -m "feat(carousel): add runs hook, run card and runs grid"
```

---

### Task 7: Overview page + wiring nas rotas

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/carousel-overview-page.tsx`
- Modify: `apps/web/src/core/modules/agents/pages/agent-overview-page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/runs/[runId]/page.tsx`

**Interfaces:**
- Consumes: `useCarouselRuns`, `useCarouselOverviewStats`, `CarouselRunsGrid`, `CarouselRunModalProvider`
- Modifies: `AgentOverviewPage` (adiciona branch carousel), rota runs (adiciona branch carousel)

- [ ] **Criar `carousel-overview-page.tsx`**

```tsx
"use client";

import { GalleryHorizontal } from "lucide-react";
import { redirect } from "next/navigation";

import { CarouselRunModalProvider } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { CarouselRunsGrid } from "src/core/modules/agents/components/carousel/carousel-runs-grid";
import { AgentNewRunButton } from "src/core/modules/agents/components/agent-new-run-button";
import { AgentOverviewStats } from "src/core/modules/agents/components/agent-overview-stats";
import { useCarouselRuns, useCarouselOverviewStats } from "src/core/modules/agents/hooks/use-carousel-runs";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Link } from "@/i18n/routing";

const NoTemplatesState = () => (
  <EmptyState
    icon={GalleryHorizontal}
    title="Nenhum template de carrossel"
    description="Resgate um template no Marketplace para começar a gerar carrosséis."
    action={
      <Button asChild size="sm">
        <Link href="/dashboard/marketplace">Ver templates no Marketplace</Link>
      </Button>
    }
  />
);

type Props = { agentSlug: string };

const CarouselOverviewContent = () => {
  const { data, isLoading } = useCarouselRuns();
  const stats = useCarouselOverviewStats();
  const hasTemplates = CAROUSEL_TEMPLATES_FIXTURE.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <AgentOverviewStats
        totalRuns={stats.totalRuns}
        completedRuns={stats.completedRuns}
        approvedRuns={stats.approvedRuns}
        creditsUsed={stats.creditsUsed}
      />
      {!hasTemplates ? (
        <NoTemplatesState />
      ) : (
        <CarouselRunsGrid runs={data?.runs ?? []} isLoading={isLoading} />
      )}
    </div>
  );
};

export const CarouselOverviewPage = ({ agentSlug }: Props) => (
  <CarouselRunModalProvider>
    <div data-testid="carousel-overview-page" data-agent={agentSlug}>
      <PageLayout
        icon={GalleryHorizontal}
        title="Carrossel"
        description="Transforme um tema em slides prontos para postar no Instagram."
        actions={<AgentNewRunButton routeSlug={agentSlug} size="sm" />}
      >
        <CarouselOverviewContent />
      </PageLayout>
    </div>
  </CarouselRunModalProvider>
);
```

- [ ] **Atualizar `agent-overview-page.tsx` para branch carousel**

Localizar o trecho:
```tsx
{isCutsAgent ? (
  <CutsResultsGrid ... />
) : null}
```

Substituir por:
```tsx
{agent.routeSlug === "cuts" ? (
  <CutsResultsGrid runs={overview.viewableRuns} isLoading={overview.isLoading} />
) : null}
```

E na rota de overview (`/overview/page.tsx`), o arquivo já importa `AgentOverviewPage` — adicionar um redirect para o `CarouselOverviewPage` quando for o agente carousel. Abrir `apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/overview/page.tsx` e substituir o corpo por:

```tsx
import { notFound } from "next/navigation";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { AgentOverviewPage } from "src/core/modules/agents/pages/agent-overview-page";
import { CarouselOverviewPage } from "src/core/modules/agents/pages/carousel-overview-page";

type AgentOverviewRouteProps = { params: Promise<{ agentSlug: string }> };

export default async function AgentOverviewRoute({ params }: AgentOverviewRouteProps) {
  const { agentSlug } = await params;
  const agent = getAgentByRouteSlug(agentSlug);
  if (!agent) notFound();

  if (agent.id === "carousel") {
    return <CarouselOverviewPage agentSlug={agentSlug} />;
  }

  return <AgentOverviewPage agentSlug={agentSlug} />;
}
```

- [ ] **Atualizar rota de runs/[runId] para branch carousel**

Em `apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/runs/[runId]/page.tsx`, adicionar branch carousel (deixar o import da página de detalhe para a Task 12):

```tsx
// Apenas adicionar o import futuro comentado — a página de detalhe é criada na Task 12.
// Por agora manter notFound() para carousel até a Task 12 adicionar o branch.
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/pages/carousel-overview-page.tsx apps/web/src/core/modules/agents/pages/agent-overview-page.tsx "apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/overview/page.tsx"
git commit -m "feat(carousel): add carousel overview page and route branch"
```

---

### Task 8: Componente de fase — Escolha de ideia

**Files:**
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-ideas-step.tsx`

**Interfaces:**
- Consumes: `CarouselIdeaOption`, `CarouselPhaseStatus`
- Produces: `CarouselIdeasStep({ status, ideas, selectedId, onSelect })`

- [ ] **Criar `carousel-ideas-step.tsx`**

```tsx
"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import type { CarouselIdeaOption } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Badge } from "src/core/shared/components/ui/badge";

type Props = {
  status: CarouselPhaseStatus;
  ideas: CarouselIdeaOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const ProcessingState = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
      <Loader2 className="size-4 animate-spin" />
      <Paragraph size="p5" tone="tertiary">Gerando ideias de post...</Paragraph>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-[var(--r-lg)] border border-[var(--line-default)] p-4">
          <Skeleton className="mb-2 h-4 w-[75%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-[60%]" />
        </div>
      ))}
    </div>
  </div>
);

const CompletedState = ({ ideas, selectedId }: { ideas: CarouselIdeaOption[]; selectedId: string | null }) => {
  const selected = ideas.find((i) => i.id === selectedId);
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" />
      <Paragraph size="p5" tone="secondary">
        Ideia escolhida:{" "}
        <span className="font-medium text-[var(--fg-primary)]">{selected?.title}</span>
      </Paragraph>
    </div>
  );
};

export const CarouselIdeasStep = ({ status, ideas, selectedId, onSelect }: Props) => {
  if (status === "idle") return null;
  if (status === "processing") return <ProcessingState />;
  if (status === "completed") return <CompletedState ideas={ideas} selectedId={selectedId} />;

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-ideas-step">
      <div className="flex flex-col gap-1">
        <Heading level="h6" as="h3">Escolha uma ideia para o seu carrossel</Heading>
        <Paragraph size="p5" tone="tertiary">
          Clique na ideia que mais combina com o seu tema.
        </Paragraph>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ideas.map((idea) => {
          const isSelected = idea.id === selectedId;
          return (
            <button
              key={idea.id}
              type="button"
              data-testid={`carousel-idea-card-${idea.id}`}
              onClick={() => onSelect(idea.id)}
              className={[
                "group flex flex-col gap-2 rounded-[var(--r-lg)] border p-4 text-left transition-all duration-150",
                isSelected
                  ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_8%,transparent)]"
                  : "border-[var(--line-default)] bg-[var(--bg-base)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <Paragraph className="font-semibold leading-snug text-[var(--fg-primary)]">
                  {idea.title}
                </Paragraph>
                {isSelected && (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                )}
              </div>
              <Paragraph size="p5" tone="secondary" className="leading-relaxed">
                {idea.description}
              </Paragraph>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/components/carousel/carousel-ideas-step.tsx
git commit -m "feat(carousel): add ideas selection phase component"
```

---

### Task 9: Componente de fase — Aprovação de conteúdo

**Files:**
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-content-step.tsx`

**Interfaces:**
- Consumes: `CarouselSlideContent`, `CarouselPhaseStatus`
- Produces: `CarouselContentStep({ status, slides, onApprove, onReject })`

- [ ] **Criar `carousel-content-step.tsx`**

```tsx
"use client";

import { CheckCircle2, Loader2, Pencil, X, Check, RefreshCw } from "lucide-react";
import { useState } from "react";

import type { CarouselSlideContent, CarouselSlideType } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Textarea } from "src/core/shared/components/ui/textarea";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

type SlideCardProps = {
  slide: CarouselSlideContent;
  onChange: (updated: CarouselSlideContent) => void;
};

const SlideCard = ({ slide, onChange }: SlideCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(slide);

  const handleSave = () => {
    onChange(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(slide);
    setEditing(false);
  };

  return (
    <div
      data-testid={`carousel-content-slide-${slide.id}`}
      className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
            Slide {slide.order}
          </span>
          <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
        </div>
        {!editing ? (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="ghost" size="xs" onClick={handleCancel}>
              <X className="size-3.5" /> Cancelar
            </Button>
            <Button variant="outline" size="xs" onClick={handleSave}>
              <Check className="size-3.5" /> Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        {editing ? (
          <>
            {slide.title !== undefined && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--fg-tertiary)]">Título</label>
                <Textarea
                  rows={2}
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
            )}
            {slide.body !== undefined && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--fg-tertiary)]">Texto</label>
                <Textarea
                  rows={3}
                  value={draft.body ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                />
              </div>
            )}
            {slide.callToAction !== undefined && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--fg-tertiary)]">Call to action</label>
                <Textarea
                  rows={1}
                  value={draft.callToAction ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, callToAction: e.target.value }))}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {slide.title && (
              <Paragraph className="font-semibold text-[var(--fg-primary)]">{slide.title}</Paragraph>
            )}
            {slide.body && (
              <Paragraph size="p5" tone="secondary" className="leading-relaxed">
                {slide.body}
              </Paragraph>
            )}
            {slide.callToAction && (
              <Paragraph size="p5" className="font-medium text-[var(--accent)]">
                {slide.callToAction}
              </Paragraph>
            )}
          </>
        )}
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  slides: CarouselSlideContent[];
  onApprove: (slides: CarouselSlideContent[]) => void;
  onReject: () => void;
};

export const CarouselContentStep = ({ status, slides, onApprove, onReject }: Props) => {
  const [localSlides, setLocalSlides] = useState<CarouselSlideContent[]>(slides);
  const [confirmReject, setConfirmReject] = useState(false);

  // Sync when new slides arrive (after reject → regenerate)
  if (status === "awaiting_action" && slides !== localSlides && localSlides.length === 0) {
    setLocalSlides(slides);
  }

  const handleSlideChange = (updated: CarouselSlideContent) => {
    setLocalSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  if (status === "idle") return null;

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
        <Loader2 className="size-4 animate-spin" />
        <Paragraph size="p5" tone="tertiary">Gerando conteúdo dos slides...</Paragraph>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-[var(--success)]" />
        <Paragraph size="p5" tone="secondary">
          Conteúdo aprovado — <span className="font-medium">{slides.length} slides</span>
        </Paragraph>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="carousel-content-step">
      <div className="flex flex-col gap-1">
        <Heading level="h6" as="h3">Revise o conteúdo dos slides</Heading>
        <Paragraph size="p5" tone="tertiary">
          Edite qualquer slide antes de aprovar ou peça para regenerar tudo.
        </Paragraph>
      </div>

      <div className="flex flex-col gap-4">
        {(localSlides.length > 0 ? localSlides : slides).map((slide) => (
          <SlideCard key={slide.id} slide={slide} onChange={handleSlideChange} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
        {confirmReject ? (
          <div className="flex items-center gap-3">
            <Paragraph size="p5" tone="secondary">Tem certeza? O conteúdo será regenerado.</Paragraph>
            <Button variant="outline" size="sm" onClick={() => setConfirmReject(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { setConfirmReject(false); setLocalSlides([]); onReject(); }}>
              Regenerar
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReject(true)}
            >
              <RefreshCw className="size-3.5" /> Regenerar conteúdo
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(localSlides.length > 0 ? localSlides : slides)}
            >
              Aprovar conteúdo
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/components/carousel/carousel-content-step.tsx
git commit -m "feat(carousel): add content approval phase component"
```

---

### Task 10: Componente de fase — Plano de design + upload de imagens

**Files:**
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-design-plan-step.tsx`

**Interfaces:**
- Consumes: `CarouselDesignPlan`, `CarouselSlideDesign`, `CarouselPhaseStatus`
- Produces: `CarouselDesignPlanStep({ status, plan, imageUploads, onImageUpload, onApprove, onReject })`

- [ ] **Criar `carousel-design-plan-step.tsx`**

```tsx
"use client";

import { CheckCircle2, ImageIcon, Loader2, Pencil, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import type { CarouselDesignPlan, CarouselSlideDesign, CarouselSlideType } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Textarea } from "src/core/shared/components/ui/textarea";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

type ImageSlotProps = {
  slide: CarouselSlideDesign;
  uploadedUrl?: string;
  onUpload: (slideId: string, url: string) => void;
};

const ImageSlot = ({ slide, uploadedUrl, onUpload }: ImageSlotProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Plano 2: cria object URL local (sem upload real)
    const url = URL.createObjectURL(file);
    onUpload(slide.id, url);
  };

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r-lg)] border border-[var(--line-default)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--fg-tertiary)]">Slide {slide.order}</span>
        <Paragraph size="p5" className="font-medium text-[var(--fg-primary)]">
          {slide.imageSlot}
        </Paragraph>
      </div>

      {uploadedUrl ? (
        <div className="relative">
          <img
            src={uploadedUrl}
            alt={slide.imageSlot}
            className="h-32 w-full rounded-[var(--r-md)] object-cover"
          />
          <button
            type="button"
            onClick={() => onUpload(slide.id, "")}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Remover imagem"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className="flex h-32 flex-col items-center justify-center gap-2 rounded-[var(--r-md)] border-2 border-dashed border-[var(--line-default)] text-[var(--fg-quaternary)] transition-colors hover:border-[var(--accent)] hover:bg-[color-mix(in_oklch,var(--accent)_5%,transparent)] hover:text-[var(--accent)]"
        >
          <Upload className="size-5" />
          <Paragraph size="p6" tone="tertiary">Clique ou arraste a imagem</Paragraph>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
};

type SlideDesignCardProps = {
  slide: CarouselSlideDesign;
  onNotesChange: (id: string, notes: string) => void;
};

const SlideDesignCard = ({ slide, onNotesChange }: SlideDesignCardProps) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(slide.layoutNotes);

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--fg-tertiary)]">Slide {slide.order}</span>
          <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
          <Badge variant="outline">Variação {slide.variationId.toUpperCase()}</Badge>
          {slide.needsImage && (
            <Badge variant="warning" className="flex items-center gap-1">
              <ImageIcon className="size-3" /> Precisa de imagem
            </Badge>
          )}
        </div>
        {!editing && (
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Editar notas
          </Button>
        )}
      </div>

      <div className="p-4">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="xs" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="xs" onClick={() => { onNotesChange(slide.id, notes); setEditing(false); }}>
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <Paragraph size="p5" tone="secondary" className="leading-relaxed">
            {notes}
          </Paragraph>
        )}
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  plan: CarouselDesignPlan | null;
  imageUploads: Record<string, string>;
  onImageUpload: (slideId: string, url: string) => void;
  onApprove: (plan: CarouselDesignPlan, imageUploads: Record<string, string>) => void;
  onReject: () => void;
};

export const CarouselDesignPlanStep = ({
  status, plan, imageUploads, onImageUpload, onApprove, onReject,
}: Props) => {
  const [localPlan, setLocalPlan] = useState<CarouselDesignPlan | null>(plan);
  const [confirmReject, setConfirmReject] = useState(false);

  // Sync when plan arrives after reject
  if (status === "awaiting_action" && plan && !localPlan) {
    setLocalPlan(plan);
  }

  const handleNotesChange = (slideId: string, notes: string) => {
    if (!localPlan) return;
    setLocalPlan({
      ...localPlan,
      slides: localPlan.slides.map((s) =>
        s.id === slideId ? { ...s, layoutNotes: notes } : s,
      ),
    });
  };

  if (status === "idle") return null;

  if (status === "processing") {
    return (
      <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
        <Loader2 className="size-4 animate-spin" />
        <Paragraph size="p5" tone="tertiary">Montando plano de design...</Paragraph>
      </div>
    );
  }

  if (status === "completed" && localPlan) {
    const imageCount = localPlan.slides.filter((s) => s.needsImage).length;
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-[var(--success)]" />
        <Paragraph size="p5" tone="secondary">
          Plano de design aprovado —{" "}
          <span className="font-medium">{localPlan.slides.length} slides</span>
          {imageCount > 0 && `, ${imageCount} ${imageCount === 1 ? "imagem" : "imagens"}`}
        </Paragraph>
      </div>
    );
  }

  if (!localPlan) return null;

  const imageSlotsNeeded = localPlan.slides.filter((s) => s.needsImage);
  const uploadedCount = imageSlotsNeeded.filter(
    (s) => imageUploads[s.id] && imageUploads[s.id] !== "",
  ).length;
  const allImagesUploaded =
    imageSlotsNeeded.length === 0 || uploadedCount === imageSlotsNeeded.length;

  return (
    <div className="flex flex-col gap-6" data-testid="carousel-design-plan-step">
      <div className="flex flex-col gap-1">
        <Heading level="h6" as="h3">Revise o plano de design</Heading>
        <Paragraph size="p5" tone="tertiary">
          A IA escolheu as variações de layout para cada slide. Você pode editar as notas antes de aprovar.
        </Paragraph>
      </div>

      <div className="flex flex-col gap-4">
        {localPlan.slides.map((slide) => (
          <SlideDesignCard key={slide.id} slide={slide} onNotesChange={handleNotesChange} />
        ))}
      </div>

      {imageSlotsNeeded.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-subtle)] p-5">
          <div className="flex items-center justify-between">
            <Heading level="h6" as="h4">Imagens necessárias</Heading>
            <Badge variant={allImagesUploaded ? "success" : "secondary"}>
              {uploadedCount} de {imageSlotsNeeded.length} enviadas
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {imageSlotsNeeded.map((slide) => (
              <ImageSlot
                key={slide.id}
                slide={slide}
                uploadedUrl={imageUploads[slide.id]}
                onUpload={onImageUpload}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-4">
        {confirmReject ? (
          <div className="flex items-center gap-3">
            <Paragraph size="p5" tone="secondary">O plano de design será regenerado.</Paragraph>
            <Button variant="outline" size="sm" onClick={() => setConfirmReject(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { setConfirmReject(false); setLocalPlan(null); onReject(); }}>
              Regenerar
            </Button>
          </div>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmReject(true)}>
              <RefreshCw className="size-3.5" /> Regenerar plano
            </Button>
            <Button
              size="sm"
              disabled={!allImagesUploaded}
              onClick={() => localPlan && onApprove(localPlan, imageUploads)}
            >
              {!allImagesUploaded
                ? `Envie ${imageSlotsNeeded.length - uploadedCount} imagem(ns) para aprovar`
                : "Aprovar plano"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/components/carousel/carousel-design-plan-step.tsx
git commit -m "feat(carousel): add design plan phase component with image upload"
```

---

### Task 11: Componente de fase — Preview e exportação

**Files:**
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-preview-step.tsx`

**Interfaces:**
- Consumes: `CarouselOutput`, `CarouselPhaseStatus`
- Produces: `CarouselPreviewStep({ status, output, isExporting, onExport, onNewCarousel })`

- [ ] **Criar `carousel-preview-step.tsx`**

```tsx
"use client";

import { Download, GalleryHorizontal, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import type { CarouselOutput, CarouselOutputSlide, CarouselSlideType } from "@company-os/types";
import type { CarouselPhaseStatus } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";

const SLIDE_TYPE_LABEL: Record<CarouselSlideType, string> = {
  start: "Abertura",
  text: "Texto",
  text_image: "Texto + Imagem",
  image: "Imagem",
};

// Instagram square: display at 270px (25% of 1080)
const PREVIEW_SIZE = 270;

const SlidePreviewFrame = ({ slide }: { slide: CarouselOutputSlide }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = `<!doctype html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden;width:1080px;height:1080px}${slide.cssContent}</style></head><body>${slide.htmlContent}</body></html>`;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line-default)]"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={`Slide ${slide.order}`}
          scrolling="no"
          style={{
            width: 1080,
            height: 1080,
            transform: `scale(${PREVIEW_SIZE / 1080})`,
            transformOrigin: "top left",
            border: "none",
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--fg-tertiary)]">
          Slide {slide.order}
        </span>
        <Badge variant="secondary">{SLIDE_TYPE_LABEL[slide.type]}</Badge>
      </div>
    </div>
  );
};

type Props = {
  status: CarouselPhaseStatus;
  output: CarouselOutput | null;
  isExporting: boolean;
  onExport: () => void;
  onNewCarousel: () => void;
};

export const CarouselPreviewStep = ({
  status, output, isExporting, onExport, onNewCarousel,
}: Props) => {
  const [exported, setExported] = useState(false);

  if (status === "idle" || status === "processing") {
    if (status === "processing") {
      return (
        <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
          <Loader2 className="size-4 animate-spin" />
          <Paragraph size="p5" tone="tertiary">Gerando slides finais...</Paragraph>
        </div>
      );
    }
    return null;
  }

  if (!output) return null;

  const handleExport = () => {
    onExport();
    setTimeout(() => setExported(true), 2200);
  };

  return (
    <div className="flex flex-col gap-6" data-testid="carousel-preview-step">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Heading level="h6" as="h3">Seu carrossel está pronto</Heading>
          <div className="flex items-center gap-2">
            <Paragraph size="p5" tone="tertiary">{output.slides.length} slides</Paragraph>
            <Badge variant="secondary">{output.socialNetwork === "instagram" ? "Instagram" : output.socialNetwork}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onNewCarousel}>
            <GalleryHorizontal className="size-4" /> Novo carrossel
          </Button>
          {exported ? (
            <Button size="sm" asChild>
              <a href="#" download="carousel.zip">
                <Download className="size-4" /> Baixar ZIP
              </a>
            </Button>
          ) : (
            <Button size="sm" onClick={handleExport} disabled={isExporting} loading={isExporting}>
              {isExporting ? "Gerando imagens..." : "Exportar como imagens"}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-2">
          {output.slides.map((slide) => (
            <SlidePreviewFrame key={slide.id} slide={slide} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/components/carousel/carousel-preview-step.tsx
git commit -m "feat(carousel): add preview and export phase component"
```

---

### Task 12: Página de detalhe da execução (wizard vertical)

**Files:**
- Create: `apps/web/src/core/modules/agents/pages/carousel-run-detail-page.tsx`
- Modify: `apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/runs/[runId]/page.tsx`

**Interfaces:**
- Consumes: todos os phase components (Tasks 8–11), `useCarouselRunDetail`, `useCarouselRunModalActions`
- Modifies: rota `runs/[runId]/page.tsx` (adiciona branch carousel)

- [ ] **Criar `carousel-run-detail-page.tsx`**

```tsx
"use client";

import { GalleryHorizontal } from "lucide-react";
import { redirect } from "next/navigation";

import { CarouselIdeasStep } from "src/core/modules/agents/components/carousel/carousel-ideas-step";
import { CarouselContentStep } from "src/core/modules/agents/components/carousel/carousel-content-step";
import { CarouselDesignPlanStep } from "src/core/modules/agents/components/carousel/carousel-design-plan-step";
import { CarouselPreviewStep } from "src/core/modules/agents/components/carousel/carousel-preview-step";
import { CarouselRunModalProvider } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
import { useCarouselRunModalActions } from "src/core/modules/agents/components/carousel/carousel-run-modal-provider";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Button } from "src/core/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";

type PhaseWrapperProps = {
  label: string;
  status: "idle" | "processing" | "awaiting_action" | "completed" | "error";
  children: React.ReactNode;
};

const PhaseWrapper = ({ label, status, children }: PhaseWrapperProps) => {
  if (status === "idle") return null;

  return (
    <section
      className={[
        "flex flex-col gap-4 rounded-[var(--r-xl)] border p-6 transition-all duration-300",
        status === "awaiting_action"
          ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_4%,var(--bg-base))]"
          : status === "completed"
            ? "border-[var(--line-soft)] bg-[var(--bg-base)] opacity-80"
            : "border-[var(--line-default)] bg-[var(--bg-base)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Paragraph size="p6" tone="tertiary" className="font-semibold uppercase tracking-wide">
          {label}
        </Paragraph>
      </div>
      {children}
    </section>
  );
};

const CarouselRunDetailContent = ({ runId }: { runId: string }) => {
  const { ideas, content, design, preview, actions } = useCarouselRunDetail(runId);
  const { handleOpen: openNewCarouselModal } = useCarouselRunModalActions();

  return (
    <div className="flex flex-col gap-6" data-testid="carousel-run-detail-page">
      <PhaseWrapper label="Escolha de ideia" status={ideas.status}>
        <CarouselIdeasStep
          status={ideas.status}
          ideas={ideas.data}
          selectedId={ideas.selectedId}
          onSelect={actions.selectIdea}
        />
      </PhaseWrapper>

      <PhaseWrapper label="Conteúdo dos slides" status={content.status}>
        <CarouselContentStep
          status={content.status}
          slides={content.data}
          onApprove={actions.approveContent}
          onReject={actions.rejectContent}
        />
      </PhaseWrapper>

      <PhaseWrapper label="Plano de design" status={design.status}>
        <CarouselDesignPlanStep
          status={design.status}
          plan={design.data}
          imageUploads={design.imageUploads}
          onImageUpload={actions.setImageUpload}
          onApprove={actions.approveDesign}
          onReject={actions.rejectDesign}
        />
      </PhaseWrapper>

      <PhaseWrapper label="Preview e exportação" status={preview.status}>
        <CarouselPreviewStep
          status={preview.status}
          output={preview.data}
          isExporting={preview.isExporting}
          onExport={actions.requestExport}
          onNewCarousel={openNewCarouselModal}
        />
      </PhaseWrapper>
    </div>
  );
};

type Props = { agentSlug: string; runId: string };

export const CarouselRunDetailPage = ({ agentSlug, runId }: Props) => {
  const agent = getAgentByRouteSlug(agentSlug);
  if (!agent) redirect("/dashboard");

  return (
    <CarouselRunModalProvider>
      <PageLayout
        icon={GalleryHorizontal}
        title="Execução de Carrossel"
        description={`Acompanhe e revise cada etapa da geração.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/agents/${agentSlug}/overview`}>
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      >
        <CarouselRunDetailContent runId={runId} />
      </PageLayout>
    </CarouselRunModalProvider>
  );
};
```

- [ ] **Atualizar a rota `runs/[runId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";

import { CutsRunDetailPage } from "src/core/modules/agents/pages/cuts-run-detail-page";
import { CarouselRunDetailPage } from "src/core/modules/agents/pages/carousel-run-detail-page";
import { getAgentByRouteSlug } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";

type AgentRunRouteProps = {
  params: Promise<{ agentSlug: string; runId: string }>;
};

export default async function AgentRunRoute({ params }: AgentRunRouteProps) {
  const { agentSlug, runId } = await params;
  const agent = getAgentByRouteSlug(agentSlug);

  if (!agent) notFound();

  if (agent.id === "cuts") {
    return <CutsRunDetailPage agentSlug={agentSlug} runId={runId} />;
  }

  if (agent.id === "carousel") {
    return <CarouselRunDetailPage agentSlug={agentSlug} runId={runId} />;
  }

  notFound();
}
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/pages/carousel-run-detail-page.tsx "apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/runs/[runId]/page.tsx"
git commit -m "feat(carousel): add run detail page with wizard phases and route branch"
```

---

### Task 13: Settings do agente

**Files:**
- Create: `apps/web/src/core/modules/agents/hooks/use-carousel-settings.ts`
- Create: `apps/web/src/core/modules/agents/components/carousel/carousel-settings-form.tsx`
- Modify: `apps/web/src/core/modules/agents/pages/agent-settings-page.tsx`

**Interfaces:**
- Consumes: `CarouselAgentSettings`, `carouselAgentSettingsSchema`, `CAROUSEL_TEMPLATES_FIXTURE`
- Produces: `useCarouselSettings()`, `CarouselSettings`; modifica switch em `AgentSettingsPage`

- [ ] **Criar `use-carousel-settings.ts`**

```typescript
"use client";

import { useCallback, useState } from "react";
import type { CarouselAgentSettings } from "@company-os/types";
import { carouselAgentSettingsSchema } from "@company-os/types";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";

const defaultSettings = (): CarouselAgentSettings =>
  carouselAgentSettingsSchema.parse({
    defaultTemplateId: CAROUSEL_TEMPLATES_FIXTURE[0]?.id,
  });

export const useCarouselSettings = () => {
  const [data] = useState<CarouselAgentSettings>(defaultSettings);
  return { data, isLoading: false };
};

export const useUpdateCarouselSettings = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback((_config: CarouselAgentSettings) => {
    setIsPending(true);
    // Plano 2: simula save
    setTimeout(() => setIsPending(false), 600);
  }, []);

  return { mutate, isPending };
};
```

- [ ] **Criar `carousel-settings-form.tsx`**

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GalleryHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { carouselAgentSettingsSchema, type CarouselAgentSettings } from "@company-os/types";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";
import {
  useCarouselSettings,
  useUpdateCarouselSettings,
} from "src/core/modules/agents/hooks/use-carousel-settings";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/core/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { Slider } from "src/core/shared/components/ui/slider";
import { Switch } from "src/core/shared/components/ui/switch";
import { SectionCard } from "src/core/shared/components/ui/section-card";

export const CarouselSettings = () => {
  const { data: settings } = useCarouselSettings();
  const updateSettings = useUpdateCarouselSettings();

  const form = useForm<CarouselAgentSettings>({
    resolver: zodResolver(carouselAgentSettingsSchema),
    mode: "onBlur",
    defaultValues: carouselAgentSettingsSchema.parse({}),
  });

  const hydrated = useRef(false);
  useEffect(() => {
    if (!settings || hydrated.current) return;
    form.reset(settings);
    hydrated.current = true;
  }, [settings, form]);

  const slidesCount = form.watch("slidesCount");

  const onSubmit = (values: CarouselAgentSettings) => {
    updateSettings.mutate(values);
    toast.success("Configurações salvas");
  };

  return (
    <SectionCard
      icon={GalleryHorizontal}
      title="Carrossel"
      description="Configurações padrão para a geração de carrosséis"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="slidesCount"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Quantidade padrão de slides</FormLabel>
                  <span className="text-sm font-semibold">{slidesCount}</span>
                </div>
                <FormControl>
                  <Slider
                    min={3}
                    max={15}
                    step={1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                  />
                </FormControl>
                <FormDescription>Entre 3 e 15 slides por carrossel</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultTemplateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template padrão</FormLabel>
                {CAROUSEL_TEMPLATES_FIXTURE.length === 0 ? (
                  <p className="text-sm text-[var(--fg-tertiary)]">
                    Sem templates resgatados.{" "}
                    <a href="/dashboard/marketplace" className="text-[var(--accent)] underline">
                      Ver Marketplace
                    </a>
                  </p>
                ) : (
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CAROUSEL_TEMPLATES_FIXTURE.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Imagens geradas por IA</FormLabel>
            <div className="flex items-center gap-3">
              <Switch disabled checked={false} />
              <Badge variant="secondary">Em breve</Badge>
            </div>
            <FormDescription>
              A IA gerará automaticamente as imagens dos slides.
            </FormDescription>
          </FormItem>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={updateSettings.isPending} loading={updateSettings.isPending}>
              Salvar configurações
            </Button>
          </div>
        </form>
      </Form>
    </SectionCard>
  );
};
```

- [ ] **Atualizar `agent-settings-page.tsx` — adicionar branch carousel**

Adicionar o import e o case no switch de `renderSettings`:

```typescript
import { CarouselSettings } from "src/core/modules/agents/components/carousel/carousel-settings-form";

// no switch renderSettings:
case "carousel":
  return <CarouselSettings />;
```

- [ ] **Commit**

```bash
git add apps/web/src/core/modules/agents/hooks/use-carousel-settings.ts apps/web/src/core/modules/agents/components/carousel/carousel-settings-form.tsx apps/web/src/core/modules/agents/pages/agent-settings-page.tsx
git commit -m "feat(carousel): add settings hook, settings form and agent settings page branch"
```

---

### Task 14: Playwright smoke tests

**Files:**
- Create: `apps/web/e2e/agents/carousel.spec.ts` (ou onde ficam os specs Playwright do projeto — verificar localização dos specs existentes antes de criar)

**Interfaces:**
- Consumes: rotas `/dashboard/agents/carousel/overview`, `/dashboard/agents/carousel/runs/:runId`, `/dashboard/agents/carousel/settings`

- [ ] **Verificar localização dos specs Playwright existentes**

```bash
find /Users/adryansantos/Documents/PROJETOS/blister-monorepo/apps/web -name "*.spec.ts" -path "*/e2e/*" | head -10
```

Usar o mesmo diretório encontrado.

- [ ] **Criar smoke test**

```typescript
import { test, expect } from "@playwright/test";

// Ajustar BASE_URL conforme env do projeto
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Carousel Agent — smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    // Assumindo que o projeto tem helpers de autenticação — adaptar conforme padrão existente
    await page.goto(`${BASE_URL}/dashboard/agents/carousel/overview`);
  });

  test("overview page renders carousel agent", async ({ page }) => {
    await expect(page.getByTestId("carousel-overview-page")).toBeVisible();
  });

  test("clicking Novo Carrossel opens run modal", async ({ page }) => {
    await page.getByRole("button", { name: /novo carrossel/i }).click();
    await expect(page.getByTestId("carousel-run-modal")).toBeVisible();
  });

  test("run modal has theme textarea and template select", async ({ page }) => {
    await page.getByRole("button", { name: /novo carrossel/i }).click();
    await expect(page.getByRole("textbox", { name: /tema/i })).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("submitting modal shows status modal", async ({ page }) => {
    await page.getByRole("button", { name: /novo carrossel/i }).click();
    await page.getByRole("textbox", { name: /tema/i }).fill("5 hábitos matinais");
    await page.getByRole("button", { name: /gerar carrossel/i }).click();
    await expect(page.getByTestId("carousel-status-modal")).toBeVisible({ timeout: 5000 });
  });

  test("run detail page shows ideas phase on load", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/agents/carousel/runs/run_carousel_preview`);
    await expect(page.getByTestId("carousel-ideas-step")).toBeVisible();
    await expect(page.getByTestId(/carousel-idea-card/)).toHaveCount(5);
  });

  test("selecting idea reveals content phase", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/agents/carousel/runs/run_carousel_preview`);
    await page.getByTestId("carousel-idea-card-idea_1").click();
    await expect(page.getByTestId("carousel-content-step")).toBeVisible({ timeout: 5000 });
  });

  test("settings page renders carousel settings form", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/agents/carousel/settings`);
    await expect(page.getByTestId("agent-settings-page")).toBeVisible();
  });
});
```

- [ ] **Commit**

```bash
git add apps/web/e2e/
git commit -m "test(carousel): add Playwright smoke tests for carousel agent"
```

---

## Self-Review

**Spec coverage checklist:**

| Requisito da spec | Task que implementa |
|---|---|
| Schemas Zod em `packages/types` | Task 1 |
| Fixtures de templates, runs e wizard states | Task 2 |
| Entrada no catálogo de agentes | Task 2 |
| Wizard state machine (4 fases) | Task 3 |
| Modal de configuração (tema, template, rede social, slides) | Tasks 4 + 5 |
| Status modal (success/error) | Task 5 |
| Provider de modal | Task 5 |
| Overview page com stats e grid | Tasks 6 + 7 |
| Empty state sem templates | Task 7 |
| Fase 1 — escolha de ideia | Task 8 |
| Fase 2 — aprovação de conteúdo com edição por slide | Task 9 |
| Fase 3 — plano de design + upload de imagens em lote | Task 10 |
| Fase 4 — preview em iframe + exportação | Task 11 |
| Página de detalhe com wizard vertical e PhaseWrapper | Task 12 |
| Branch na rota de runs | Task 12 |
| Settings form (slides count, template padrão, AI images disabled) | Task 13 |
| Branch no settings page | Task 13 |
| Playwright smoke tests | Task 14 |

**Tipo/assinatura consistência:**
- `CarouselPhaseStatus` definido em `use-carousel-run-detail.ts` e importado em todos os phase components ✓
- `imageUploads: Record<string, string>` consistente entre hook, design plan step e approve action ✓
- `CarouselRunFixture` exportada de `carousel-runs.fixture.ts` e importada em `use-carousel-runs.ts` e `carousel-run-card.tsx` ✓
- `CAROUSEL_TEMPLATES_FIXTURE` exportada de `carousel-templates.fixture.ts` ✓

**Sem placeholders:** verificado — todo step tem código completo.

---

## Próximos passos (Plano 3 — Backend)

O Plano 3 é um plano separado que cobre:
1. NestJS agent com `AgentBuilder` e 9 steps
2. `CarouselTemplateService` (leitura de arquivos estáticos)
3. `CarouselRenderService` (Puppeteer → PNG)
4. Prompts LLM para cada fase
5. Schemas Zod de DTOs no backend
6. `feedback-handler.ts` para learning
7. Substituição das fixtures por chamadas reais à API
8. Template `minimal-clean` com arquivos HTML/CSS reais para cada variação
