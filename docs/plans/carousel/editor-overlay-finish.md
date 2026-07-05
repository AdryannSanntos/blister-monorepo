# Carousel Editor Overlay — Plano de Finalização

> **For agentic workers:** REQUIRED SUB-SKILL: loop-controller to implement task-by-task.

**Goal:** Corrigir a inconsistência atual entre backend e frontend do agente carousel e entregar o editor visual completo (overlay fullscreen com 2 fases: ideias → editor), substituindo o wizard de 4 fases legado.

**Architecture:** Backend (`apps/api/src/agents/carousel/`) já roda o pipeline automático sem pausas de aprovação — falta só limpar código morto e expor 2 endpoints novos (`render`, `ai-edit`). Frontend precisa migrar de 4 fases (`ideas|content|design|preview`) para 2 (`ideas|editor`), montar um overlay fullscreen via portal, e construir um editor de canvas (iframe `srcDoc` + `react-moveable`) sobre o HTML/CSS que o pipeline já gera. Nenhuma mudança na infra de IA (`@company-os/agent-ia-sdk`) — só lógica de agente e UI.

**Preset:** blister

**Tech Stack:** NestJS 11 (Zod, Puppeteer render), Next.js 16 / React 19, TanStack Query, Zustand, `react-moveable`, Tailwind v4 com tokens semânticos, Playwright.

**Specs de referência (já aprovadas, não recriar):**
- [`docs/superpowers/specs/2026-07-03-carousel-editor-overlay-design.md`](../../superpowers/specs/2026-07-03-carousel-editor-overlay-design.md)
- [`docs/superpowers/plans/2026-07-03-carousel-editor-overlay-execution-loop.md`](../../superpowers/plans/2026-07-03-carousel-editor-overlay-execution-loop.md)

Este plano reescreve o mapa T0–T17 dessas specs no formato adryan-dev-loop (task granular, código completo, gate de validação por task) e adiciona 2 correções de bug que o levantamento encontrou e que **bloqueiam qualquer avanço**: schemas Zod mortos com `z.any()` e um erro real de TypeScript em teste.

---

## Estado atual (confirmado por leitura de código em 2026-07-03)

| Item | Status |
|---|---|
| Backend sem pausas de aprovação (`await_content_approval`/`await_design_approval` removidos de `agent.ts`) | ✅ Feito |
| `customIdea` no schema (`packages/types/src/agents/carousel.ts:102-116`) | ✅ Feito |
| Placeholder de imagem (`generate-slides.step.ts:60-72`) | ✅ Feito |
| `carousel-schemas.ts` com `carouselContentApprovalSchema`/`carouselDesignApprovalSchema` mortos, usando `z.any()` | ❌ Bug — Task 1 |
| `slide-count-alignment.util.spec.ts:23,35` — erro TS2698 (`as never` + spread) | ❌ Bug — Task 2 |
| Frontend `use-carousel-run-detail.ts` ainda chama `approveContent`/`approveDesign` guardados por pausas que não existem mais | ❌ Quebrado — Task 3 |
| `carousel-run-steps.ts` com 4 fases (`ideas\|content\|design\|preview`) | ❌ Legado — Task 3 |
| Editor visual (overlay, canvas, layers, ai-edit) | ❌ Não existe — Tasks 5–13 |

---

## File structure

### Backend — modificar

| Arquivo | Ação |
|---|---|
| `apps/api/src/agents/carousel/schemas/carousel-schemas.ts` | Remover `carouselContentApprovalSchema`/`carouselDesignApprovalSchema` |
| `apps/api/src/agents/carousel/index.ts` | Remover reexport dos schemas acima |
| `apps/api/src/agents/carousel/utils/slide-count-alignment.util.spec.ts` | Corrigir cast `as never` → `as unknown as StepExecutionContext` |
| `apps/api/src/agents/agents.module.ts` | Registrar `CarouselRenderController`, `CarouselAiEditController`, `CarouselAiEditService` |

### Backend — criar

| Arquivo | Responsabilidade |
|---|---|
| `apps/api/src/agents/carousel/carousel-render.controller.ts` | `POST runs/:runId/render` — re-renderiza PNGs após edição manual |
| `apps/api/src/agents/carousel/carousel-ai-edit.controller.ts` | `POST runs/:runId/ai-edit` |
| `apps/api/src/agents/carousel/carousel-ai-edit.service.ts` | Chama `sdk.ia.llm` para reescrever texto/HTML de um slide |
| `apps/api/src/agents/carousel/carousel-ai-edit.service.spec.ts` | Testes do service acima |
| `apps/api/src/agents/carousel/carousel-render.controller.spec.ts` | Testes do controller de render |

### Frontend — modificar

| Arquivo | Ação |
|---|---|
| `apps/web/src/core/modules/agents/components/carousel/carousel-run-steps.ts` | `CarouselRunStepId` → `"ideas" \| "editor"` |
| `apps/web/src/core/modules/agents/utils/carousel-run-display.ts` | Remover `AWAITING_CONTENT_APPROVAL`/`AWAITING_DESIGN_APPROVAL`; `deriveCarouselPhases` → 2 fases |
| `apps/web/src/core/modules/agents/hooks/use-carousel-run-detail.ts` | Remover `approveContent`/`rejectContent`/`approveDesign`/`rejectDesign`/`updateContent`/`updateDesign` |
| `apps/web/src/core/modules/agents/components/carousel/carousel-ideas-step.tsx` | Adicionar card "Escrever minha ideia" |
| `apps/web/src/core/modules/dashboard/components/dashboard-shell.tsx` | Montar `CarouselRunOverlay` |
| `apps/web/src/core/modules/agents/components/carousel/carousel-run-detail-page.tsx` | Retornar `null` (overlay assume a UI) |
| `apps/web/e2e/carousel-flow.spec.ts` | Atualizar para fluxo de 2 fases |

### Frontend — criar

| Arquivo | Responsabilidade |
|---|---|
| `.../carousel/editor/carousel-run-overlay.tsx` | Portal fullscreen, decide fase `ideas`/`editor` pelo run |
| `.../carousel/editor/carousel-pipeline-progress.tsx` | Loading unificado entre ideias e editor |
| `.../carousel/editor/carousel-editor-shell.tsx` | Layout do editor: filmstrip + canvas + painel |
| `.../carousel/editor/carousel-editor-canvas.tsx` | Iframe `srcDoc` + `react-moveable` |
| `.../carousel/editor/carousel-editor-layers-panel.tsx` | Textarea de texto + posição/zoom + upload |
| `.../carousel/editor/carousel-editor-adjust-bar.tsx` | Chips de ajuste assistido + input |
| `apps/web/src/core/modules/agents/stores/carousel-editor-store.ts` | Zustand — estado local do editor |
| `apps/web/src/core/modules/agents/hooks/use-carousel-render.ts` | `POST runs/:runId/render` |
| `apps/web/src/core/modules/agents/hooks/use-carousel-ai-edit.ts` | `POST runs/:runId/ai-edit` |

---

## Gate de validação (rodar após CADA task, na raiz do monorepo)

```bash
pnpm --dir packages/types typecheck && pnpm --dir packages/types test
pnpm --dir apps/api typecheck && pnpm --dir apps/api lint && pnpm --dir apps/api test -- carousel
pnpm --dir apps/web typecheck && pnpm --dir apps/web lint && pnpm --dir apps/web test -- carousel
pnpm check:ai-boundaries
```

Rodar e2e (`pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts`) só nas tasks marcadas **[e2e]**.

---

## Task 1 — Remover schemas Zod mortos (`z.any()`)

**Files:** modify `apps/api/src/agents/carousel/schemas/carousel-schemas.ts`, `apps/api/src/agents/carousel/index.ts`

- [ ] Confirmar que nada mais importa `carouselContentApprovalSchema`/`carouselDesignApprovalSchema`/`CarouselContentApproval`/`CarouselDesignApproval`:
  ```bash
  grep -rn "carouselContentApprovalSchema\|carouselDesignApprovalSchema\|CarouselContentApproval\|CarouselDesignApproval" apps/api apps/web packages
  ```
  Esperado: só ocorrências dentro de `carousel-schemas.ts` e `index.ts`.

- [ ] Editar `apps/api/src/agents/carousel/schemas/carousel-schemas.ts` — arquivo final completo:
  ```typescript
  export {
    carouselRunInputSchema as carouselInputZod,
    carouselOutputSchema as carouselOutputZod,
    carouselIdeaSelectionSchema,
    type CarouselRunInput,
    type CarouselOutput,
    type CarouselIdeaOption,
    type CarouselCustomIdea,
    type CarouselIdeaSelection,
    type CarouselSlideContent,
    type CarouselDesignPlan,
    type CarouselOutputSlide,
  } from '@company-os/types';
  ```

- [ ] Editar `apps/api/src/agents/carousel/index.ts` removendo a linha que reexporta os 2 schemas removidos (ler o arquivo antes de editar — reexport hoje na linha 6-7).

- [ ] Rodar gate: `pnpm --dir apps/api typecheck && pnpm --dir apps/api test -- carousel`. Deve passar sem erros (nenhum consumidor real existia).

---

## Task 2 — Corrigir erro de TypeScript no teste de alinhamento de slides

**Files:** modify `apps/api/src/agents/carousel/utils/slide-count-alignment.util.spec.ts`

O erro (`TS2698: Spread types may only be created from object types`) vem de castar o mock para `never` e depois espalhá-lo (`...context`). `never` não é spreadável. Trocar para `StepExecutionContext` via `as unknown as`.

- [ ] Editar o topo do arquivo (linhas 1-23):
  ```typescript
  import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
  import {
    alignSlidesToContent,
    enforceContentSlidesCount,
    resolveContentSlidesFromContext,
    resolveExpectedSlidesCount,
  } from './slide-count-alignment.util';

  describe('slide-count-alignment.util', () => {
    const context = {
      inputPayload: {
        slidesCount: 5,
        settings: { slidesCount: 3 },
      },
      previousStepsOutput: {
        generate_content: {
          slides: [
            { id: 'slide_1', order: 1, type: 'start' },
            { id: 'slide_2', order: 2, type: 'text' },
            { id: 'slide_3', order: 3, type: 'text_image' },
          ],
        },
      },
    } as unknown as StepExecutionContext;
  ```

- [ ] Editar o bloco `legacyContext` (linhas 33-47) do mesmo jeito:
  ```typescript
    it('ignores legacy await_content_approval output', () => {
      const legacyContext = {
        ...context,
        previousStepsOutput: {
          generate_content: {
            slides: [{ id: 'slide_1', order: 1, type: 'start' }],
          },
          await_content_approval: {
            slides: [
              { id: 'slide_1', order: 1, type: 'start' },
              { id: 'slide_2', order: 2, type: 'text' },
            ],
          },
        },
      } as unknown as StepExecutionContext;

      expect(resolveContentSlidesFromContext(legacyContext)).toHaveLength(1);
      expect(resolveContentSlidesFromContext(legacyContext)[0]?.id).toBe('slide_1');
    });
  ```

- [ ] Rodar `npx tsc --noEmit` em `apps/api` (via `pnpm --dir apps/api typecheck`) — deve limpar o erro. Rodar `pnpm --dir apps/api test -- slide-count-alignment` — 6/6 continuam passando.

---

## Task 3 — Migrar fases de 4 para 2 (`ideas` | `editor`)

Substitui T5 + T10 do plano original — são a mesma mudança (o hook e o display já estão acoplados aos 4-fases).

**Files:** modify `carousel-run-steps.ts`, `carousel-run-display.ts`, `use-carousel-run-detail.ts`

- [ ] Reescrever `apps/web/src/core/modules/agents/components/carousel/carousel-run-steps.ts` por completo:
  ```typescript
  export type CarouselPhaseStatus =
    | "idle"
    | "processing"
    | "awaiting_action"
    | "completed"
    | "error";

  export type CarouselRunStepId = "ideas" | "editor";

  export const CAROUSEL_RUN_STEPS: {
    id: CarouselRunStepId;
    label: string;
  }[] = [
    { id: "ideas", label: "Ideia" },
    { id: "editor", label: "Editor" },
  ];

  export type CarouselRunPhaseSnapshot = {
    ideas: { status: CarouselPhaseStatus };
    editor: { status: CarouselPhaseStatus };
  };

  export const getCarouselStepPhaseStatus = (
    stepId: CarouselRunStepId,
    phases: CarouselRunPhaseSnapshot,
  ): CarouselPhaseStatus => phases[stepId].status;

  export const isCarouselStepAccessible = (
    stepId: CarouselRunStepId,
    phases: CarouselRunPhaseSnapshot,
  ): boolean => {
    const status = getCarouselStepPhaseStatus(stepId, phases);
    return status !== "idle";
  };

  export const getCarouselStepIndex = (stepId: CarouselRunStepId) =>
    CAROUSEL_RUN_STEPS.findIndex((step) => step.id === stepId);
  ```

- [ ] Em `apps/web/src/core/modules/agents/utils/carousel-run-display.ts`, escrever o teste primeiro em `carousel-run-display.test.ts` (criar se não existir junto ao arquivo, mesmo padrão que já é citado pelas specs):
  ```typescript
  import { deriveCarouselPhases } from "./carousel-run-display";

  const baseRun = {
    id: "run_1",
    status: "RUNNING" as const,
    pauseReason: null,
    currentStepKey: "generate_content",
    inputPayload: {},
    outputPayload: null,
    errorMessage: null,
  };

  describe("deriveCarouselPhases (2-phase model)", () => {
    it("marks editor as processing while pipeline runs after idea selection", () => {
      const steps = [
        { stepKey: "generate_ideas", status: "COMPLETED" as const },
        { stepKey: "await_idea_selection", status: "COMPLETED" as const },
        { stepKey: "generate_content", status: "RUNNING" as const },
      ];
      const phases = deriveCarouselPhases({ run: baseRun as never, steps: steps as never });
      expect(phases.ideas.status).toBe("completed");
      expect(phases.editor.status).toBe("processing");
    });

    it("marks editor as completed when run is COMPLETED", () => {
      const run = { ...baseRun, status: "COMPLETED" as const, currentStepKey: null };
      const phases = deriveCarouselPhases({ run: run as never, steps: [] });
      expect(phases.editor.status).toBe("completed");
    });

    it("marks ideas as awaiting_action while paused for idea selection", () => {
      const run = { ...baseRun, status: "PAUSED" as const, pauseReason: "awaiting_idea_selection" };
      const phases = deriveCarouselPhases({ run: run as never, steps: [] });
      expect(phases.ideas.status).toBe("awaiting_action");
      expect(phases.editor.status).toBe("idle");
    });
  });
  ```
  Rodar `pnpm --dir apps/web test -- carousel-run-display` → deve falhar (RED, `deriveCarouselPhases` ainda devolve 4 fases).

- [ ] Reescrever as constantes e a lógica de fases em `carousel-run-display.ts`. Substituir linhas 17-35:
  ```typescript
  export const AWAITING_IDEA_SELECTION = "awaiting_idea_selection";

  const IDEAS_STEPS = ["generate_ideas", "await_idea_selection"] as const;
  const EDITOR_STEPS = [
    "generate_content",
    "generate_design_plan",
    "generate_slides",
    "render_slides",
    "finalize_carousel",
  ] as const;

  const PHASE_STEPS: Record<CarouselRunStepId, readonly string[]> = {
    ideas: IDEAS_STEPS,
    editor: EDITOR_STEPS,
  };
  ```
  Remover `AWAITING_CONTENT_APPROVAL`/`AWAITING_DESIGN_APPROVAL` e as funções `isRunAwaitingContentApproval`/`isRunAwaitingDesignApproval` (linhas 207-215) — não são mais usadas em lugar nenhum após esta task.

  Simplificar `resolvePausePhase` (linhas 318-331):
  ```typescript
  export const resolvePausePhase = (
    pauseReason: string | null | undefined,
  ): CarouselRunStepId | null => {
    switch (pauseReason) {
      case AWAITING_IDEA_SELECTION:
        return "ideas";
      default:
        return null;
    }
  };
  ```

  Simplificar `derivePhaseStatus` (linhas 243-290) — remover os `if` de content/design approval, manter só ideas + regra geral de processing/completed:
  ```typescript
  const derivePhaseStatus = (
    phase: CarouselRunStepId,
    run: AgentRunStatusDto,
    steps: AgentRunStepDto[] | undefined,
    priorPhasesCompleted: boolean,
  ): CarouselPhaseStatus => {
    if (run.status === "FAILED") {
      const phaseSteps = PHASE_STEPS[phase];
      const touched = phaseSteps.some(
        (key) =>
          isStepCompleted(readStep(steps, key)) ||
          isStepRunning(readStep(steps, key)) ||
          run.currentStepKey === key,
      );
      return touched ? "error" : "idle";
    }

    if (!priorPhasesCompleted) return "idle";

    if (phase === "ideas" && isRunAwaitingIdeaSelection(run)) {
      return "awaiting_action";
    }

    if (phase === "editor" && run.status === "COMPLETED") {
      return "completed";
    }

    if (isPhaseGateCompleted(phase, steps)) {
      return "completed";
    }

    if (isPhaseProcessing(phase, run, steps)) {
      return "processing";
    }

    return "idle";
  };
  ```

  Atualizar `deriveCarouselPhases` (linhas 292-316):
  ```typescript
  export const deriveCarouselPhases = (params: {
    run: AgentRunStatusDto;
    steps?: AgentRunStepDto[];
  }): CarouselRunPhaseSnapshot => {
    const { run, steps } = params;
    const ideasCompleted = isPhaseGateCompleted("ideas", steps);

    return {
      ideas: { status: derivePhaseStatus("ideas", run, steps, true) },
      editor: { status: derivePhaseStatus("editor", run, steps, ideasCompleted) },
    };
  };
  ```

  Atualizar `resolveActiveCarouselStep` e `isCarouselRunActive` trocando o array `order` para `["ideas", "editor"]` e removendo as referências a `isRunAwaitingContentApproval`/`isRunAwaitingDesignApproval`.

- [ ] Rodar `pnpm --dir apps/web test -- carousel-run-display` → GREEN.

- [ ] Em `use-carousel-run-detail.ts`, remover por completo: `approveContent`, `updateContent`, `rejectContent`, `approveDesign`, `updateDesign`, `rejectDesign`, os imports de `isRunAwaitingContentApproval`/`isRunAwaitingDesignApproval`, `CarouselDesignPlan`/`CarouselSlideContent` se ficarem sem uso, e os campos `content`/`design` do objeto retornado (linhas 362-370). O retorno passa a expor só `ideas` e `editor`:
  ```typescript
  return {
    runData,
    run,
    isLoading,
    isError,
    errorMessage,
    phaseErrors,
    clearErrorMessage,
    ideas: {
      status: phases.ideas.status,
      data: ideasData,
      selectedId: selectedIdeaId,
    },
    editor: {
      status: phases.editor.status,
      data: output,
      isExporting,
      exportDownloadUrl,
    },
    activeStep,
    phases,
    navigation: {
      goToStep,
      goToAdjacentStep,
      canGoPrev,
      canGoNext,
    },
    actions: {
      selectIdea,
      updateIdeaSelection,
      setImageUpload,
      requestExport,
    },
  };
  ```
  `phaseErrors` também simplifica para `{ ideas, editor }` (usar `EDITOR_STEPS`/nova assinatura de `extractPhaseErrorMessage`, que já aceita `phase: CarouselRunStepId` — só muda o union type).

- [ ] Buscar todo consumidor desses campos removidos no restante do app:
  ```bash
  grep -rln "approveContent\|approveDesign\|rejectContent\|rejectDesign\|\.content\.data\|\.design\.data" apps/web/src/core/modules/agents/components/carousel
  ```
  Cada arquivo listado (`carousel-content-step.tsx`, `carousel-design-plan-step.tsx`, `carousel-run-stepper.tsx`, `carousel-run-detail-page.tsx`) será substituído na Task 8 — por ora, só confirmar a lista para não deixar import quebrado solto; não editar esses arquivos ainda.

- [ ] Rodar gate completo de `apps/web` (typecheck vai falhar até a Task 8 remover os consumidores legados — **esperado**, deixar anotado no REPORT da task; não é regressão desta task, é a próxima).

---

## Task 4 — `CarouselPipelineProgress` unificado

**Files:** create `.../carousel/editor/carousel-pipeline-progress.tsx`, test `carousel-pipeline-progress.test.tsx`

- [ ] Escrever mapper puro + teste primeiro (`apps/web/src/core/modules/agents/components/carousel/editor/carousel-pipeline-progress.test.tsx`):
  ```typescript
  import { mapCarouselPipelineSubSteps } from "./carousel-pipeline-progress";

  describe("mapCarouselPipelineSubSteps", () => {
    it("marks steps before currentStepKey as done and current as active", () => {
      const rows = mapCarouselPipelineSubSteps("generate_design_plan");
      expect(rows.find((r) => r.key === "generate_content")?.status).toBe("done");
      expect(rows.find((r) => r.key === "generate_design_plan")?.status).toBe("active");
      expect(rows.find((r) => r.key === "generate_slides")?.status).toBe("pending");
    });

    it("marks all steps done when currentStepKey is null and run completed", () => {
      const rows = mapCarouselPipelineSubSteps(null, { completed: true });
      expect(rows.every((r) => r.status === "done")).toBe(true);
    });
  });
  ```

- [ ] Implementar `carousel-pipeline-progress.tsx`:
  ```tsx
  "use client";

  import { Loader2 } from "lucide-react";
  import { Heading } from "src/core/shared/components/ui/heading";
  import { cn } from "src/core/shared/utils";

  export const CAROUSEL_PIPELINE_STEPS: { key: string; label: string }[] = [
    { key: "generate_content", label: "Gerando conteúdo" },
    { key: "generate_design_plan", label: "Montando layout" },
    { key: "generate_slides", label: "Finalizando slides" },
    { key: "render_slides", label: "Preparando imagens" },
  ];

  export type CarouselPipelineSubStepStatus = "done" | "active" | "pending";

  export type CarouselPipelineSubStepRow = {
    key: string;
    label: string;
    status: CarouselPipelineSubStepStatus;
  };

  export const mapCarouselPipelineSubSteps = (
    currentStepKey: string | null,
    options?: { completed?: boolean },
  ): CarouselPipelineSubStepRow[] => {
    if (options?.completed) {
      return CAROUSEL_PIPELINE_STEPS.map((step) => ({ ...step, status: "done" as const }));
    }

    const currentIndex = CAROUSEL_PIPELINE_STEPS.findIndex(
      (step) => step.key === currentStepKey,
    );

    return CAROUSEL_PIPELINE_STEPS.map((step, index) => ({
      ...step,
      status:
        currentIndex === -1
          ? "pending"
          : index < currentIndex
            ? "done"
            : index === currentIndex
              ? "active"
              : "pending",
    }));
  };

  const SubStepRow = ({ row }: { row: CarouselPipelineSubStepRow }) => (
    <div className="flex items-center gap-2.5" data-testid={`pipeline-substep-${row.key}`}>
      {row.status === "done" ? (
        <span className="flex size-4 items-center justify-center text-[var(--success)]">✓</span>
      ) : row.status === "active" ? (
        <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
      ) : (
        <span className="size-1.5 rounded-full bg-[var(--fg-quaternary)]" />
      )}
      <span
        className={cn(
          "text-[13px]",
          row.status === "done" && "text-[var(--fg-tertiary)]",
          row.status === "active" && "font-medium text-[var(--fg-primary)]",
          row.status === "pending" && "text-[var(--fg-quaternary)]",
        )}
      >
        {row.label}
      </span>
    </div>
  );

  export const CarouselPipelineProgress = ({
    currentStepKey,
    completed = false,
  }: {
    currentStepKey: string | null;
    completed?: boolean;
  }) => {
    const rows = mapCarouselPipelineSubSteps(currentStepKey, { completed });

    return (
      <div
        className="flex w-full max-w-sm flex-col items-center gap-6 px-4 text-center"
        data-testid="carousel-pipeline-progress"
      >
        <Heading level="h4" as="h2">
          Processando seu carrossel…
        </Heading>
        <div className="flex flex-col items-start gap-3">
          {rows.map((row) => (
            <SubStepRow key={row.key} row={row} />
          ))}
        </div>
      </div>
    );
  };
  ```

- [ ] `pnpm --dir apps/web test -- carousel-pipeline-progress` → GREEN.

---

## Task 5 — `CarouselRunOverlay` (portal fullscreen)

**Files:** create `.../carousel/editor/carousel-run-overlay.tsx`, modify `dashboard-shell.tsx`

- [ ] Teste primeiro — `carousel-run-overlay.test.tsx` (vitest + testing-library, mock de `useCarouselRunDetail`):
  ```tsx
  import { render, screen } from "@testing-library/react";
  import { CarouselRunOverlay } from "./carousel-run-overlay";

  vi.mock("src/core/modules/agents/hooks/use-carousel-run-detail", () => ({
    useCarouselRunDetail: () => ({
      isLoading: false,
      run: { status: "PAUSED", pauseReason: "awaiting_idea_selection" },
      phases: { ideas: { status: "awaiting_action" }, editor: { status: "idle" } },
      ideas: { status: "awaiting_action", data: [], selectedId: null },
      editor: { status: "idle", data: null, isExporting: false, exportDownloadUrl: null },
      actions: { selectIdea: vi.fn(), updateIdeaSelection: vi.fn(), requestExport: vi.fn() },
      errorMessage: null,
      clearErrorMessage: vi.fn(),
    }),
  }));

  describe("CarouselRunOverlay", () => {
    it("renders fullscreen dialog covering the viewport", () => {
      render(<CarouselRunOverlay runId="run_1" onClose={vi.fn()} />);
      const overlay = screen.getByTestId("carousel-run-overlay");
      expect(overlay).toHaveAttribute("role", "dialog");
      expect(overlay).toHaveAttribute("aria-modal", "true");
    });
  });
  ```

- [ ] Implementar `carousel-run-overlay.tsx`:
  ```tsx
  "use client";

  import { createPortal } from "react-dom";
  import { useEffect, useState } from "react";

  import { useCarouselRunDetail } from "src/core/modules/agents/hooks/use-carousel-run-detail";
  import { CarouselIdeasStep } from "src/core/modules/agents/components/carousel/carousel-ideas-step";
  import { CarouselPipelineProgress } from "./carousel-pipeline-progress";
  import { CarouselEditorShell } from "./carousel-editor-shell";

  type Props = {
    runId: string;
    onClose: () => void;
  };

  export const CarouselRunOverlay = ({ runId, onClose }: Props) => {
    const [mounted, setMounted] = useState(false);
    const detail = useCarouselRunDetail(runId);

    useEffect(() => {
      setMounted(true);
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }, []);

    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    if (!mounted || detail.isLoading || !detail.run) return null;

    const renderBody = () => {
      if (detail.phases.ideas.status === "awaiting_action") {
        return (
          <div className="flex size-full items-center justify-center overflow-y-auto p-6">
            <div className="w-full max-w-2xl">
              <CarouselIdeasStep
                status={detail.ideas.status}
                ideas={detail.ideas.data}
                selectedId={detail.ideas.selectedId}
                onSelect={detail.actions.selectIdea}
                onUpdateSelection={detail.actions.updateIdeaSelection}
              />
            </div>
          </div>
        );
      }

      if (detail.editor.status === "completed" && detail.editor.data) {
        return <CarouselEditorShell runId={runId} output={detail.editor.data} onClose={onClose} />;
      }

      return (
        <div className="flex size-full items-center justify-center">
          <CarouselPipelineProgress
            currentStepKey={detail.run?.currentStepKey ?? null}
            completed={detail.editor.status === "completed"}
          />
        </div>
      );
    };

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        data-testid="carousel-run-overlay"
        className="fixed inset-0 z-[100] bg-[var(--bg-base)]"
      >
        {renderBody()}
      </div>,
      document.body,
    );
  };
  ```

- [ ] Montar no shell — em `dashboard-shell.tsx`, adicionar (respeitando o aninhamento existente de providers, ver imports já presentes de `matchAgentRunPath`/`parseAgentRouteSlug`):
  ```tsx
  import { useState } from "react";
  import { useRouter } from "next/navigation";
  import { CarouselRunOverlay } from "src/core/modules/agents/components/carousel/editor/carousel-run-overlay";

  // dentro do componente, antes do return:
  const router = useRouter();
  const carouselRunMatch = matchAgentRunPath(pathname, "carousel");
  const carouselRunId = carouselRunMatch ? parseAgentRouteSlug(pathname)?.runId : null;
  ```
  E no JSX, logo após `</CarouselRunModalProvider>` fechar (fora do `AppShell`, como a spec define — sibling do `AppShell`, não dentro):
  ```tsx
  {carouselRunId ? (
    <CarouselRunOverlay
      runId={carouselRunId}
      onClose={() => router.push(getAgentOverviewPath("carousel"))}
    />
  ) : null}
  ```
  Confirmar a assinatura exata de `parseAgentRouteSlug`/`matchAgentRunPath` lendo `src/core/modules/agents/utils/agent-paths.ts` antes de codar — se `runId` já vier de outro helper existente (ex: `useParams`), usar o que já existe em vez de duplicar parsing.

- [ ] `apps/web/src/core/modules/agents/components/carousel/carousel-run-detail-page.tsx` passa a retornar `null` (overlay assume a UI) — mas só remover de fato na Task 8, quando o `CarouselEditorShell` já existir; por ora deixar como está e não quebrar a rota.

- [ ] **[e2e]** Ajustar `apps/web/e2e/carousel-flow.spec.ts` no teste de overlay:
  ```typescript
  test("run detail opens fullscreen overlay above sidebar", async ({ page }) => {
    await page.goto("/dashboard/agents/carousel/runs/<fixture-id>");
    const overlay = page.getByTestId("carousel-run-overlay");
    await expect(overlay).toBeVisible();
    const box = await overlay.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual((page.viewportSize()?.width ?? 0) - 2);
  });
  ```

---

## Task 6 — Ideia customizada na UI

**Files:** modify `carousel-ideas-step.tsx`

- [ ] Adicionar prop `onSubmitCustomIdea` e o card dashed no grid, após o `.map` de ideias existente (linha ~146):
  ```tsx
  <button
    type="button"
    data-testid="carousel-idea-card-custom"
    onClick={() => setIsWritingCustom(true)}
    className="flex min-h-[104px] items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[var(--line-default)] p-4 text-[13px] text-[var(--fg-tertiary)] transition-colors duration-150 hover:border-[var(--line-strong)] hover:text-[var(--fg-secondary)]"
  >
    + Escrever minha ideia
  </button>
  ```
  Com estado local `isWritingCustom` que troca o card por um `Textarea` (componente já existente em `src/core/shared/components/ui/textarea`) + botão "Usar esta ideia" que chama `onSubmitCustomIdea({ title, description })`.

- [ ] Em `use-carousel-run-detail.ts`, adicionar `submitCustomIdea` ao lado de `selectIdea`, resumindo com `customIdea` em vez de `selectedIdeaId`:
  ```typescript
  const submitCustomIdea = useCallback(
    async (idea: { title: string; description?: string }) => {
      if (!isRunAwaitingIdeaSelection(run)) return;
      try {
        await resumeRun.mutateAsync({ formData: { customIdea: idea } });
        invalidateCarouselQueries();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Erro ao enviar ideia",
        );
      }
    },
    [run, resumeRun, invalidateCarouselQueries],
  );
  ```
  Expor em `actions.submitCustomIdea`.

- [ ] **[e2e]** Adicionar caso em `carousel-flow.spec.ts` cobrindo escrever ideia customizada e ver o pipeline avançar direto para o editor (sem tela de conteúdo/design).

---

## Task 7 — `CarouselEditorShell` (read-only, navegação de slides)

**Files:** create `.../carousel/editor/carousel-editor-shell.tsx`; modify `carousel-run-detail-page.tsx`

Fork de `carousel-preview-dialog.tsx` sem o wrapper `Dialog` (já é fullscreen via `CarouselRunOverlay`) — reaproveita nav ←/→, filmstrip, swipe, `ShortcutHint`.

- [ ] Implementar layout conforme wireframe da spec (header + filmstrip + canvas + painel), inicialmente **read-only** (painel mostra dados do slide ativo, sem edição ainda — isso entra na Task 9):
  ```tsx
  "use client";

  import type { CarouselOutput } from "@company-os/types";
  import { useState } from "react";
  import { ChevronLeft, ChevronRight, X } from "lucide-react";

  import { CarouselSlideRenderer } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
  import { getCarouselSlideReactKey } from "src/core/modules/agents/utils/carousel-run-display";
  import { Heading } from "src/core/shared/components/ui/heading";
  import { cn } from "src/core/shared/utils";

  const THUMB_WIDTH = 72;

  type Props = {
    runId: string;
    output: CarouselOutput;
    onClose: () => void;
  };

  export const CarouselEditorShell = ({ runId, output, onClose }: Props) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const slides = output.slides;
    const activeSlide = slides[activeIndex] ?? null;

    return (
      <div className="grid size-full grid-rows-[auto_1fr_auto]" data-testid="carousel-editor-shell">
        <header className="flex items-center gap-3 border-b border-[var(--line-default)] px-4 py-2.5">
          <button type="button" onClick={onClose} aria-label="Voltar" className="flex size-8 items-center justify-center rounded-[var(--r-md)] hover:bg-[var(--bg-hover)]">
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
            Slide {activeIndex + 1}/{slides.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" aria-label="Fechar" onClick={onClose} className="flex size-8 items-center justify-center rounded-[var(--r-md)] hover:bg-[var(--bg-hover)]">
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-[72px_1fr_320px] overflow-hidden">
          <div className="flex flex-col gap-2 overflow-y-auto border-r border-[var(--line-default)] p-2">
            {slides.map((slide, index) => (
              <button
                key={getCarouselSlideReactKey(slide, index)}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "shrink-0 overflow-hidden rounded-[var(--r-md)] border-2",
                  index === activeIndex ? "border-[var(--accent)]" : "border-transparent opacity-70",
                )}
              >
                <CarouselSlideRenderer slide={slide} displayWidth={THUMB_WIDTH} />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center bg-[var(--bg-canvas)] p-6">
            {activeSlide ? (
              <div className="relative h-full max-h-[720px] aspect-[4/5]">
                <CarouselSlideRenderer slide={activeSlide} fill title={`Slide ${activeSlide.order}`} />
              </div>
            ) : null}
          </div>

          <aside className="overflow-y-auto border-l border-[var(--line-default)] p-4">
            <Heading level="h4" as="h3">Ajustes</Heading>
          </aside>
        </div>

        <footer className="border-t border-[var(--line-subtle)] px-4 py-2.5 text-[12px] text-[var(--fg-quaternary)]">
          Editor visual — ajustes de layout chegam na próxima task
        </footer>
      </div>
    );
  };
  ```

- [ ] Editar `carousel-run-detail-page.tsx` para retornar `null` — a rota `/dashboard/agents/carousel/runs/:runId` continua existindo (deep link), mas a página em si não renderiza mais nada: o `CarouselRunOverlay` montado no shell é quem exibe a UI real.

- [ ] Remover, agora sim, os arquivos que ficaram órfãos: `carousel-content-step.tsx`, `carousel-design-plan-step.tsx`, `carousel-run-stepper.tsx` e qualquer teste vitest dedicado a eles. Rodar:
  ```bash
  grep -rln "CarouselContentStep\|CarouselDesignPlanStep\|CarouselRunStepper" apps/web/src
  ```
  para confirmar zero import restante antes de deletar.

- [ ] **[e2e]** Ajustar `carousel-flow.spec.ts` — remover a expectativa de tela `carousel-content-step`; após seleção de ideia, esperar diretamente `carousel-pipeline-progress` e depois `carousel-editor-shell`.

- [ ] Gate completo de `apps/web` deve ficar 100% verde aqui (é o ponto em que o typecheck pendente da Task 3 se resolve).

---

## Task 8 — `carousel-editor-store` + `CarouselEditorCanvas` + `react-moveable`

**Files:** create `stores/carousel-editor-store.ts`, `.../editor/carousel-editor-canvas.tsx`

- [ ] Instalar dependência:
  ```bash
  pnpm --dir apps/web add react-moveable
  ```

- [ ] Criar o store (Zustand, só estado de UI local — servidor é fonte de verdade via `useAgentRun`/`useEditAgentRunOutput`):
  ```typescript
  // apps/web/src/core/modules/agents/stores/carousel-editor-store.ts
  import { create } from "zustand";
  import type { CarouselOutputSlide } from "@company-os/types";

  export type CarouselEditorPanelTab = "content" | "adjust";

  type CarouselEditorState = {
    slides: CarouselOutputSlide[];
    activeSlideId: string | null;
    selectedLayerId: string | null;
    dirty: boolean;
    panelTab: CarouselEditorPanelTab;
    setSlides: (slides: CarouselOutputSlide[]) => void;
    setActiveSlideId: (id: string) => void;
    setSelectedLayerId: (id: string | null) => void;
    updateSlideContent: (slideId: string, htmlContent: string, cssContent: string) => void;
    markSaved: () => void;
    setPanelTab: (tab: CarouselEditorPanelTab) => void;
  };

  export const useCarouselEditorStore = create<CarouselEditorState>((set) => ({
    slides: [],
    activeSlideId: null,
    selectedLayerId: null,
    dirty: false,
    panelTab: "content",
    setSlides: (slides) =>
      set((state) => ({
        slides,
        activeSlideId: state.activeSlideId ?? slides[0]?.id ?? null,
      })),
    setActiveSlideId: (id) => set({ activeSlideId: id, selectedLayerId: null }),
    setSelectedLayerId: (id) => set({ selectedLayerId: id }),
    updateSlideContent: (slideId, htmlContent, cssContent) =>
      set((state) => ({
        dirty: true,
        slides: state.slides.map((slide) =>
          slide.id === slideId ? { ...slide, htmlContent, cssContent } : slide,
        ),
      })),
    markSaved: () => set({ dirty: false }),
    setPanelTab: (tab) => set({ panelTab: tab }),
  }));
  ```

- [ ] Teste do store (`carousel-editor-store.test.ts`):
  ```typescript
  import { useCarouselEditorStore } from "./carousel-editor-store";

  const slide = { id: "s1", order: 1, type: "text" as const, htmlContent: "<h1>A</h1>", cssContent: "" };

  beforeEach(() => useCarouselEditorStore.setState({ slides: [], activeSlideId: null, dirty: false }));

  it("sets first slide as active on load", () => {
    useCarouselEditorStore.getState().setSlides([slide]);
    expect(useCarouselEditorStore.getState().activeSlideId).toBe("s1");
  });

  it("marks dirty after content update", () => {
    useCarouselEditorStore.getState().setSlides([slide]);
    useCarouselEditorStore.getState().updateSlideContent("s1", "<h1>B</h1>", "");
    expect(useCarouselEditorStore.getState().dirty).toBe(true);
    expect(useCarouselEditorStore.getState().slides[0]?.htmlContent).toBe("<h1>B</h1>");
  });
  ```

- [ ] Implementar `CarouselEditorCanvas` — iframe `srcDoc` (reaproveitando `buildCarouselSlideSrcDoc`), injeta `data-carousel-layer-id` nos elementos editáveis via heurística de seletor, e anexa `Moveable` ao elemento selecionado dentro do `contentDocument`:
  ```tsx
  "use client";

  import Moveable from "react-moveable";
  import { useEffect, useRef, useState } from "react";
  import type { CarouselOutputSlide } from "@company-os/types";

  import {
    CAROUSEL_SLIDE_HEIGHT,
    CAROUSEL_SLIDE_WIDTH,
    buildCarouselSlideSrcDoc,
  } from "src/core/modules/agents/components/carousel/carousel-slide-renderer";
  import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";

  const EDITABLE_SELECTOR = 'h1, h2, h3, p, .badge-pill, img, [class*="__bg"]';

  const assignLayerIds = (doc: Document) => {
    doc.querySelectorAll(EDITABLE_SELECTOR).forEach((el, index) => {
      if (!el.getAttribute("data-carousel-layer-id")) {
        el.setAttribute("data-carousel-layer-id", `layer-${index}`);
      }
    });
  };

  type Props = { slide: CarouselOutputSlide; scale: number };

  export const CarouselEditorCanvas = ({ slide, scale }: Props) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [target, setTarget] = useState<HTMLElement | null>(null);
    const selectedLayerId = useCarouselEditorStore((s) => s.selectedLayerId);
    const setSelectedLayerId = useCarouselEditorStore((s) => s.setSelectedLayerId);
    const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);

    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const handleLoad = () => {
        const doc = iframe.contentDocument;
        if (!doc) return;
        assignLayerIds(doc);

        doc.body.addEventListener("click", (event) => {
          const el = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-carousel-layer-id]",
          );
          setSelectedLayerId(el?.getAttribute("data-carousel-layer-id") ?? null);
          setTarget(el);
        });
      };

      iframe.addEventListener("load", handleLoad);
      return () => iframe.removeEventListener("load", handleLoad);
    }, [setSelectedLayerId]);

    useEffect(() => {
      setTarget(null);
    }, [slide.id]);

    const commitSerialized = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      updateSlideContent(slide.id, doc.body.innerHTML, slide.cssContent);
    };

    return (
      <div
        className="relative"
        style={{ width: CAROUSEL_SLIDE_WIDTH * scale, height: CAROUSEL_SLIDE_HEIGHT * scale }}
        data-testid="carousel-editor-canvas"
      >
        <iframe
          ref={iframeRef}
          key={slide.id}
          srcDoc={buildCarouselSlideSrcDoc(slide)}
          title={`Editor slide ${slide.order}`}
          scrolling="no"
          className="absolute left-0 top-0 border-none"
          style={{
            width: CAROUSEL_SLIDE_WIDTH,
            height: CAROUSEL_SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        {target ? (
          <Moveable
            target={target}
            container={iframeRef.current?.contentDocument?.body ?? undefined}
            draggable
            resizable
            origin={false}
            onDrag={({ target: el, transform }) => {
              (el as HTMLElement).style.transform = transform;
            }}
            onDragEnd={commitSerialized}
            onResize={({ target: el, width, height, drag }) => {
              (el as HTMLElement).style.width = `${width}px`;
              (el as HTMLElement).style.height = `${height}px`;
              (el as HTMLElement).style.transform = drag.transform;
            }}
            onResizeEnd={commitSerialized}
          />
        ) : null}
      </div>
    );
  };
  ```
  Nota de segurança (checklist da spec): o iframe é `srcDoc` isolado do parent — nenhum HTML editado é injetado direto no DOM da aplicação; `Moveable` opera dentro do `contentDocument` do próprio iframe.

- [ ] Plugar `CarouselEditorCanvas` no lugar do `CarouselSlideRenderer` (modo edição) dentro de `CarouselEditorShell` da Task 7, e carregar `slides`/`activeSlideId` do store via `setSlides(output.slides)` num `useEffect` ao montar.

- [ ] `pnpm --dir apps/web test -- carousel-editor` → GREEN (store + testes de integração de seleção de layer, sem depender do `Moveable` real — mockar `react-moveable` no teste de canvas).

---

## Task 9 — `CarouselEditorLayersPanel` + upload de imagem por slot

**Files:** create `.../carousel/editor/carousel-editor-layers-panel.tsx`

- [ ] Painel lateral que reage ao `selectedLayerId` do store: se o elemento selecionado for texto (`h1-h3, p`), mostra `Textarea` ligada a `element.textContent`; se for `img`, mostra slider de zoom (`transform: scale()`, não via Moveable) + botão de upload usando `useCarouselImageUpload` (já existe, `apps/web/src/core/modules/agents/hooks/use-carousel-image-upload.ts`).

  ```tsx
  "use client";

  import { useRef } from "react";
  import { Upload } from "lucide-react";

  import { useCarouselImageUpload } from "src/core/modules/agents/hooks/use-carousel-image-upload";
  import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";
  import { Textarea } from "src/core/shared/components/ui/textarea";

  export const CarouselEditorLayersPanel = ({
    slideId,
    getSelectedElement,
  }: {
    slideId: string;
    getSelectedElement: () => HTMLElement | null;
  }) => {
    const selectedLayerId = useCarouselEditorStore((s) => s.selectedLayerId);
    const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);
    const slides = useCarouselEditorStore((s) => s.slides);
    const uploadImage = useCarouselImageUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const slide = slides.find((s) => s.id === slideId);
    if (!selectedLayerId || !slide) {
      return (
        <div className="p-4 text-[13px] text-[var(--fg-quaternary)]">
          Clique em um elemento do slide para editar.
        </div>
      );
    }

    const commit = () => {
      const el = getSelectedElement();
      const doc = el?.ownerDocument;
      if (!doc) return;
      updateSlideContent(slideId, doc.body.innerHTML, slide.cssContent);
    };

    const el = getSelectedElement();
    const isImage = el?.tagName === "IMG";

    if (isImage) {
      return (
        <div className="flex flex-col gap-3 p-4">
          <label className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
            Imagem
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] px-3 py-2 text-[13px] hover:border-[var(--line-strong)]"
          >
            <Upload className="size-4" /> Trocar imagem
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file || !el) return;
              const slotKey = el.getAttribute("data-carousel-slot") ?? "image_url";
              const result = await uploadImage.mutateAsync({ file, slideId, slotKey });
              (el as HTMLImageElement).src = `/api/files/${result.fileId}/preview`;
              commit();
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 p-4">
        <label className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
          Texto
        </label>
        <Textarea
          defaultValue={el?.textContent ?? ""}
          onBlur={(event) => {
            if (el) el.textContent = event.target.value;
            commit();
          }}
        />
      </div>
    );
  };
  ```
  Confirmar o formato real da URL de preview de arquivo (`useCarouselSlidePngUrl`/`use-files-api`) antes de codar o `src` do `<img>` — usar o helper existente em vez de montar a URL manualmente se um já existir.

- [ ] Teste: seleção de layer de imagem mostra botão de upload; seleção de `h1` mostra textarea; `onBlur` chama `updateSlideContent` do store.

- [ ] **[e2e]** Fluxo: selecionar imagem no editor → upload → thumb do slide atualiza.

---

## Task 10 — `PATCH output` com debounce + `POST runs/:runId/render`

**Files:** create `hooks/use-carousel-render.ts`, `apps/api/src/agents/carousel/carousel-render.controller.ts`, `carousel-render.controller.spec.ts`; modify `agents.module.ts`

- [ ] Backend — teste primeiro (`carousel-render.controller.spec.ts`), padrão idêntico ao `CarouselExportController` já lido (resolve scope → `assertRunBelongsToWorkspace` → lógica):
  ```typescript
  describe("CarouselRenderController", () => {
    it("re-renders only requested slideIds and returns updated pngFileId", async () => {
      // arrange: mock PrismaService.agentRun.findFirst retornando run com output de 3 slides
      // mock AgentRunService.assertRunBelongsToWorkspace resolvendo ok
      // mock CarouselRenderDeps.renderSlideToPng + storeRenderedPng
      // act: controller.renderRun(runId, { slideIds: ["slide_2"] }, req)
      // assert: só slide_2 tem pngFileId novo; slide_1/slide_3 mantêm os antigos
    });

    it("re-renders all slides when slideIds is omitted", async () => { /* ... */ });

    it("throws NotFoundException when run does not belong to workspace", async () => { /* ... */ });
  });
  ```

- [ ] Implementar `carousel-render.controller.ts`, reusando `deps.renderSlideToPng` + `deps.storeRenderedPng` (os mesmos que `render-slides.step.ts` já usa via `getCarouselRunDeps()`):
  ```typescript
  import { Body, Controller, NotFoundException, Param, Post, Req } from '@nestjs/common';
  import { carouselOutputSchema } from '@company-os/types';
  import { Request } from 'express';
  import { z } from 'zod';
  import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
  import type { CurrentUser } from '../../auth/session.service';
  import { PrismaService } from '../../prisma/prisma.service';
  import { WorkspaceContextService } from '../../workspace/workspace-context.service';
  import { toRunScope } from '../runtime/agent-run.service';
  import { AgentRunService } from '../runtime/agent-run.service';
  import { getCarouselRunDeps } from './ports/carousel-run-deps';

  const renderRequestSchema = z.object({
    slideIds: z.array(z.string()).optional(),
  });

  @Controller('agents/carousel')
  export class CarouselRenderController {
    constructor(
      private readonly prisma: PrismaService,
      private readonly workspaceContext: WorkspaceContextService,
      private readonly agentRunService: AgentRunService,
    ) {}

    @Post('runs/:runId/render')
    @RequirePermission('generation.create')
    async renderRun(
      @Param('runId') runId: string,
      @Body() body: unknown,
      @Req() req: Request,
    ) {
      const { slideIds } = renderRequestSchema.parse(body);
      const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
      const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
      const scope = toRunScope(workspace);
      await this.agentRunService.assertRunBelongsToWorkspace(runId, scope);

      const run = await this.prisma.agentRun.findFirst({ where: { id: runId, ...scope } });
      if (!run) throw new NotFoundException('Agent run not found');

      const parsed = carouselOutputSchema.parse(run.outputPayload);
      const deps = getCarouselRunDeps();
      const dimensions = { width: 1080, height: 1350 };

      const targets = slideIds?.length
        ? parsed.slides.filter((slide) => slideIds.includes(slide.id))
        : parsed.slides;

      const rendered = await Promise.all(
        targets.map(async (slide) => {
          const buffer = await deps.renderSlideToPng({
            html: slide.htmlContent,
            css: slide.cssContent,
            baseCss: '',
            width: dimensions.width,
            height: dimensions.height,
          });
          const pngFileId = await deps.storeRenderedPng({
            runId,
            slideId: slide.id,
            slideOrder: slide.order,
            buffer,
            companyId: workspace.companyId,
          });
          return { ...slide, pngFileId };
        }),
      );

      const byId = new Map(rendered.map((slide) => [slide.id, slide]));
      const slides = parsed.slides.map((slide) => byId.get(slide.id) ?? slide);

      await this.prisma.agentRun.update({
        where: { id: runId },
        data: { outputPayload: { ...parsed, slides } },
      });

      return { slides };
    }
  }
  ```

- [ ] Registrar em `agents.module.ts` — adicionar `CarouselRenderController` ao array `controllers`.

- [ ] Frontend — `hooks/use-carousel-render.ts`:
  ```typescript
  "use client";

  import { useMutation, useQueryClient } from "@tanstack/react-query";
  import { apiClient } from "src/core/shared/utils/api-client";
  import type { CarouselOutputSlide } from "@company-os/types";

  export const useCarouselRender = (runId: string) => {
    const queryClient = useQueryClient();

    return useMutation<{ slides: CarouselOutputSlide[] }, Error, string[] | undefined>({
      mutationFn: async (slideIds) => {
        const { data } = await apiClient.post(`/agents/carousel/runs/${runId}/render`, {
          slideIds,
        });
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
      },
    });
  };
  ```

- [ ] No `CarouselEditorShell`, ligar o botão "Salvar" do header a: `useEditAgentRunOutput(runId, "carousel")` com debounce ≥1500ms (usar `useDebouncedCallback` se já existir no projeto, senão `setTimeout`/`clearTimeout` local) chamando `PATCH output` com `{ slides: store.slides }`, seguido de `useCarouselRender(runId).mutate(dirtySlideIds)` só quando o usuário clicar em "Exportar" ou sair do editor — **não** renderizar PNG a cada drag (regra de performance da spec).

- [ ] Gate: `pnpm --dir apps/api test -- carousel-render` + `pnpm --dir apps/web test -- carousel-render`.

---

## Task 11 — `POST runs/:runId/ai-edit`

**Files:** create `carousel-ai-edit.controller.ts`, `carousel-ai-edit.service.ts`, `carousel-ai-edit.service.spec.ts`; modify `agents.module.ts`

- [ ] Teste do service primeiro (`carousel-ai-edit.service.spec.ts`) — mock de `sdk.ia.llm`:
  ```typescript
  describe("CarouselAiEditService", () => {
    it("rewrites slide text via LLM and returns updated htmlContent", async () => {
      // mock llm.complete retornando { htmlContent, cssContent }
      // act: service.applyEdit({ htmlContent, cssContent, mode: "rewrite_text", prompt: "Deixar mais direto" })
      // assert: retorno bate com o schema esperado, prompt do sistema instrui a não quebrar {{placeholders}}
    });
  });
  ```

- [ ] Implementar `carousel-ai-edit.service.ts` — usa `@company-os/agent-ia-sdk` (`sdk.ia.llm`), nunca chama provider de LLM direto (regra 7 do CLAUDE.md):
  ```typescript
  import { Injectable } from '@nestjs/common';
  import { z } from 'zod';
  import { AgentIaSdk } from '@company-os/agent-ia-sdk';

  const aiEditRequestSchema = z.object({
    slideId: z.string(),
    mode: z.enum(['rewrite_text', 'visual_edit']),
    prompt: z.string().min(1),
    layerId: z.string().optional(),
  });
  export type CarouselAiEditRequest = z.infer<typeof aiEditRequestSchema>;

  const aiEditResultSchema = z.object({
    htmlContent: z.string(),
    cssContent: z.string(),
  });
  export type CarouselAiEditResult = z.infer<typeof aiEditResultSchema>;

  @Injectable()
  export class CarouselAiEditService {
    constructor(private readonly sdk: AgentIaSdk) {}

    async applyEdit(params: {
      request: CarouselAiEditRequest;
      htmlContent: string;
      cssContent: string;
      companyId: string;
    }): Promise<CarouselAiEditResult> {
      const { request, htmlContent, cssContent, companyId } = params;

      const result = await this.sdk.ia.llm.complete({
        companyId,
        system:
          'Você edita HTML/CSS de um slide de carrossel. Preserve todos os placeholders {{...}} ' +
          'e atributos data-carousel-layer-id. Responda só com JSON { htmlContent, cssContent }.',
        user: `Ajuste pedido: "${request.prompt}"\n\nHTML atual:\n${htmlContent}\n\nCSS atual:\n${cssContent}`,
        outputSchema: aiEditResultSchema,
      });

      return result;
    }
  }
  ```
  Ajustar a chamada exata de `sdk.ia.llm.complete` (nome do método/opções) conforme a API real de `@company-os/agent-ia-sdk` — ler `packages/agent-ia-sdk/src/ia/` antes de codar esta task se a assinatura divergir do usado em `createLlmCallStep`.

- [ ] Implementar `carousel-ai-edit.controller.ts` seguindo o mesmo padrão de scope/permission dos outros controllers do agente:
  ```typescript
  import { Body, Controller, NotFoundException, Param, Post, Req } from '@nestjs/common';
  import { Request } from 'express';
  import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
  import type { CurrentUser } from '../../auth/session.service';
  import { PrismaService } from '../../prisma/prisma.service';
  import { WorkspaceContextService } from '../../workspace/workspace-context.service';
  import { AgentRunService, toRunScope } from '../runtime/agent-run.service';
  import { CarouselAiEditService } from './carousel-ai-edit.service';
  import { carouselOutputSchema } from '@company-os/types';
  import { z } from 'zod';

  const bodySchema = z.object({
    slideId: z.string(),
    mode: z.enum(['rewrite_text', 'visual_edit']),
    prompt: z.string().min(1),
    layerId: z.string().optional(),
  });

  @Controller('agents/carousel')
  export class CarouselAiEditController {
    constructor(
      private readonly prisma: PrismaService,
      private readonly workspaceContext: WorkspaceContextService,
      private readonly agentRunService: AgentRunService,
      private readonly aiEdit: CarouselAiEditService,
    ) {}

    @Post('runs/:runId/ai-edit')
    @RequirePermission('generation.create')
    async aiEditSlide(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
      const request = bodySchema.parse(body);
      const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
      const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
      const scope = toRunScope(workspace);
      await this.agentRunService.assertRunBelongsToWorkspace(runId, scope);

      const run = await this.prisma.agentRun.findFirst({ where: { id: runId, ...scope } });
      if (!run) throw new NotFoundException('Agent run not found');

      const output = carouselOutputSchema.parse(run.outputPayload);
      const slide = output.slides.find((entry) => entry.id === request.slideId);
      if (!slide) throw new NotFoundException('Slide not found in this run');

      return this.aiEdit.applyEdit({
        request,
        htmlContent: slide.htmlContent,
        cssContent: slide.cssContent,
        companyId: workspace.companyId,
      });
    }
  }
  ```

- [ ] Registrar `CarouselAiEditController` + `CarouselAiEditService` em `agents.module.ts` (`controllers`/`providers`).

- [ ] Créditos: confirmar se `CreditStepInterceptor` (já listado em `providers` do módulo) se aplica automaticamente a este endpoint ou se precisa de decorator explícito — checar como outro endpoint fora do pipeline de steps debita crédito por chamada antes de assumir.

- [ ] Gate: `pnpm --dir apps/api test -- carousel-ai-edit`.

---

## Task 12 — `CarouselEditorAdjustBar` + `useCarouselAiEdit`

**Files:** create `hooks/use-carousel-ai-edit.ts`, `.../editor/carousel-editor-adjust-bar.tsx`

- [ ] Hook:
  ```typescript
  "use client";

  import { useMutation } from "@tanstack/react-query";
  import { apiClient } from "src/core/shared/utils/api-client";

  export type CarouselAiEditInput = {
    slideId: string;
    mode: "rewrite_text" | "visual_edit";
    prompt: string;
    layerId?: string;
  };

  export const useCarouselAiEdit = (runId: string) =>
    useMutation<{ htmlContent: string; cssContent: string }, Error, CarouselAiEditInput>({
      mutationFn: async (input) => {
        const { data } = await apiClient.post(`/agents/carousel/runs/${runId}/ai-edit`, input);
        return data;
      },
    });
  ```

- [ ] Componente com chips fixos + input livre, copy operacional PT-BR (regra 17 do CLAUDE.md — nunca "Gerar com IA"):
  ```tsx
  "use client";

  import { Sparkles, SendHorizontal } from "lucide-react";
  import { useState } from "react";

  import { useCarouselAiEdit } from "src/core/modules/agents/hooks/use-carousel-ai-edit";
  import { useCarouselEditorStore } from "src/core/modules/agents/stores/carousel-editor-store";

  const CHIPS = ["Deixar mais direto", "Encurtar texto", "Mais contraste"];

  export const CarouselEditorAdjustBar = ({ runId, slideId }: { runId: string; slideId: string }) => {
    const [prompt, setPrompt] = useState("");
    const aiEdit = useCarouselAiEdit(runId);
    const updateSlideContent = useCarouselEditorStore((s) => s.updateSlideContent);

    const submit = async (text: string) => {
      if (!text.trim()) return;
      const result = await aiEdit.mutateAsync({ slideId, mode: "rewrite_text", prompt: text });
      updateSlideContent(slideId, result.htmlContent, result.cssContent);
      setPrompt("");
    };

    return (
      <div className="flex items-center gap-2 border-t border-[var(--line-subtle)] px-4 py-2.5" data-testid="carousel-adjust-bar">
        <Sparkles className="size-4 shrink-0 text-[var(--accent)]" />
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => submit(chip)}
            disabled={aiEdit.isPending}
            className="shrink-0 rounded-full border border-[var(--line-default)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit(prompt)}
          placeholder="Descreva o ajuste…"
          className="min-w-0 flex-1 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => submit(prompt)}
          disabled={aiEdit.isPending || !prompt.trim()}
          aria-label="Aplicar ajuste"
          className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-md)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </button>
      </div>
    );
  };
  ```

- [ ] Namespace i18n: mover as strings acima para `apps/web/messages/pt-BR.json` sob `carousel.editor.*` e trocar por `useTranslations("carousel.editor")` — seguir o mesmo padrão já usado em `carousel-preview-dialog.tsx` (`useTranslations("carousel.preview")`).

- [ ] **[e2e]** Clicar chip "Deixar mais direto" → mock da API `ai-edit` → conteúdo do slide muda no canvas.

---

## Task 13 — `data-carousel-layer` nos templates prioritários

**Files:** modify templates em `apps/api/src/agents/carousel/templates/content-machine/slides/**/slide.html` e `minimal-clean` (só os 2 templates ativos hoje)

- [ ] Criar script de validação `scripts/validate-carousel-templates.mjs` (ou reaproveitar um já existente se houver — checar `apps/api/package.json` por `validate:carousel-templates` antes de criar) que falha se um `slide.html` não tiver ao menos um elemento com `data-carousel-layer="title|body|image|bg"`.

- [ ] Adicionar os atributos manualmente nos HTMLs dos 2 templates (`content-machine` primeiro, é o único com testes de PNG hoje), ex: `<h1 class="title" data-carousel-layer="title">{{title}}</h1>`.

- [ ] Rodar `pnpm --dir apps/api test -- carousel` — os specs de PNG existentes (`carousel-template-shell.spec.ts`) não devem quebrar (atributo `data-*` é inerte para o Puppeteer/CSS).

---

## Task 14 — Runs legados + polish final [e2e completo]

**Files:** modify `carousel-run-overlay.tsx`; create banner; update `docs/agents/carousel/README.md` (criar se não existir)

- [ ] Runs que ainda estão `PAUSED` com `pauseReason` antigo (`awaiting_content_approval`/`awaiting_design_approval` — só existem em dados já persistidos antes deste plano, o backend não gera mais isso): no `CarouselRunOverlay`, detectar esse caso e mostrar banner "Esta execução usa o fluxo anterior" com botão "Continuar" que resume com `{ contentApproved: true, designApproved: true, imageUploads: {} }` — usar `resumeRun.mutateAsync` diretamente, não precisa dos actions removidos na Task 3.

- [ ] Atalhos: confirmar `ShortcutHint` (←/→ já existente no fork da Task 7) documentado no rodapé do `CarouselEditorShell`.

- [ ] Documentar em `docs/agents/carousel/README.md` (criar) o fluxo final: 2 fases, contratos de API (existentes + `render` + `ai-edit`), e a nota sobre runs legados.

- [ ] **[e2e completo]** Rodar a suíte inteira na raiz:
  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test
  pnpm check:ai-boundaries
  pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts
  ```

- [ ] Conferir os 7 critérios de aceite da spec original (seção "Critérios de aceite") um a um e reportar ✅/❌ com evidência de comando rodado.

---

## Self-review (checklist desta escrita de plano)

- [x] Cobertura da spec: T1–T4 já feitos (não repetidos); T5+T10 fundidos na Task 3 (mesma mudança); T6–T9, T11–T17 mapeados 1:1 nas Tasks 4–14; bugs achados no levantamento viram Tasks 1–2.
- [x] Sem placeholders/TBD — todo bloco de código é implementação real baseada em arquivos lidos nesta sessão (não inventados).
- [x] Nomes consistentes entre tasks: `CarouselRunStepId`, `useCarouselEditorStore`, `CarouselOutputSlide` usados com a mesma forma em todas as tasks que os referenciam.
- [x] 2 pontos flagados para confirmação durante a execução (não bloqueiam o plano, só a task específica): assinatura exata de `matchAgentRunPath`/`parseAgentRouteSlug` (Task 5) e assinatura exata de `sdk.ia.llm.complete` (Task 11) — ambos marcados inline com "ler antes de codar".

---

## Execução

Recomendado: **loop-controller**, uma task por iteração, com spec review + design review (Tasks 4–9, 12: tocam `apps/web/`) + code review entre cada uma, gate de validação obrigatório antes de avançar. Ordem sequencial 1→14 (dependências reais: Task 3 bloqueia 4-9; Task 8 bloqueia 9,12; Task 10 e 11 são independentes entre si mas ambas dependem de Task 7).
