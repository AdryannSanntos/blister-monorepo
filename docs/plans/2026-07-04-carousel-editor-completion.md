# Carousel Editor Overlay — Plano de Conclusão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: loop-controller to implement task-by-task.

**Goal:** Fechar os gaps reais do editor de carrossel (T7–T17 da spec `docs/superpowers/specs/2026-07-03-carousel-editor-overlay-design.md`) corrigindo os 10 bugs/débitos confirmados na code review e completando os itens de UX/testes que a spec exige e o código ainda não entrega.

**Architecture:** O editor já existe (overlay fullscreen → `CarouselEditorShell` com canvas `react-moveable` em iframe + painel de camadas + barra de ajustes IA). Este plano não recria nada — corrige races de save/render, corrige o resume de runs legadas, fecha buracos de validação Zod, remove estado duplicado, e adiciona o que a spec pede e não foi feito: zoom de imagem via slider, atalhos de teclado, focus trap, layout mobile, e cobertura de teste (unit + e2e) do fluxo de edição.

**Preset:** blister

**Tech Stack:** NestJS 11 + Prisma + Zod (apps/api), Next.js 16 + React 19 + Zustand + TanStack Query + react-moveable (apps/web), Vitest + Playwright.

---

## Contexto para quem for executar sem ter lido a conversa

Branch `feat/carousel-agent-pipeline`. O agente `carousel` tem um pipeline de 6 steps automáticos (`generate_ideas → await_idea_selection → generate_content → generate_design_plan → generate_slides → render_slides → finalize_carousel`) e um editor visual em overlay fullscreen montado em `dashboard-shell.tsx`. Os arquivos do editor (`apps/web/.../carousel/editor/*`, `apps/web/.../stores/carousel-editor-store.ts`, `apps/api/.../carousel-ai-edit.*`, `apps/api/.../carousel-render.controller.ts`) já existem no working tree mas nunca foram commitados. `pnpm --dir apps/api test -- carousel` (103 testes) e `pnpm --dir apps/web test -- carousel` (109 testes) passam hoje. `pnpm --dir apps/api typecheck` e `pnpm --dir apps/web typecheck` estão limpos (um bug de narrowing em `carousel-ai-edit.service.ts:58-60` já foi corrigido antes deste plano).

Uma code review de 8 ângulos (correção, comportamento removido, cross-file, reuso, simplificação, eficiência, altitude, convenções CLAUDE.md) encontrou 10 findings confirmados. Este plano corrige todos, mais os gaps de UX/spec identificados em análise manual anterior.

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.tsx` | Modificar (race de save/export, sync effect, dirty set, atalhos, index derivado) |
| `apps/web/src/core/modules/agents/stores/carousel-editor-store.ts` | Modificar (dirty set por slide, remover `panelTab` morto ou usá-lo no mobile) |
| `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-layers-panel.tsx` | Modificar (zoom slider, `useFilePreviewUrl`, Zod) |
| `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-canvas.tsx` | Modificar (usar `data-carousel-layer` quando presente, zoom via transform) |
| `apps/web/src/core/modules/agents/components/carousel/editor/carousel-run-overlay.tsx` | Modificar (focus trap) |
| `apps/web/src/core/modules/agents/hooks/use-carousel-ai-edit.ts` | Modificar (enviar htmlContent/cssContent atuais do cliente) |
| `apps/web/src/core/modules/agents/hooks/use-carousel-render.ts` | Modificar (`onError`) |
| `apps/api/src/agents/carousel/carousel-ai-edit.controller.ts` | Modificar (aceitar htmlContent/cssContent do body) |
| `apps/api/src/agents/carousel/carousel-ai-edit.service.ts` | Sem mudança funcional (já corrigido) |
| `apps/api/src/agents/carousel/carousel-render.controller.ts` | Modificar (try/catch Zod → 400) |
| `apps/api/src/agents/carousel/agent.ts` | Modificar (registrar `reviewSchema`) |
| `apps/api/src/agents/carousel/utils/carousel-legacy-resume.util.ts` | Criar (remap de step keys legados) |
| `apps/api/src/agents/runtime/workflow-engine.service.ts` | Modificar (usar o remap no resume) |
| `apps/api/src/agents/carousel/templates/{spotlight,reel,daylight,voltage}/**/*.html` | Modificar (adicionar `data-carousel-layer`) |
| Testes `.spec.ts`/`.test.tsx` correspondentes | Criar |
| `apps/web/e2e/carousel-flow.spec.ts` | Modificar (cobrir fluxo do editor) |

---

## Fase 1 — Correções de bugs confirmados (code review)

### Task 1 — Corrigir race de save→render/export

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.tsx`

**Problema:** `handleExport` chama `persistOutput()` (fire-and-forget via `.mutate`) e emenda `renderSlides.mutateAsync` sem esperar o PATCH comitar — o render lê `outputPayload` direto do banco e pode pegar a versão pré-edição.

- [ ] Trocar `persistOutput` para expor uma versão `async` que usa `mutateAsync` e é aguardada:

```typescript
// dentro de CarouselEditorShell
const persistOutput = useCallback(async () => {
  const currentSlides = useCarouselEditorStore.getState().slides;
  if (!currentSlides.length) return;
  await editOutput.mutateAsync({ editedOutput: { slides: currentSlides } });
  markSaved();
}, [editOutput, markSaved]);
```

- [ ] No efeito de autosave (debounce), chamar `void persistOutput()` (fica async, sem mudança de comportamento).
- [ ] Em `handleExport`, aguardar o save antes do render:

```typescript
const handleExport = async () => {
  if (useCarouselEditorStore.getState().dirty) {
    await persistOutput();
  }
  const dirtyIds = useCarouselEditorStore.getState().pendingRenderSlideIds;
  await renderSlides.mutateAsync(dirtyIds.length ? dirtyIds : undefined);
  useCarouselEditorStore.getState().clearPendingRender();
  await runActions.requestExport();
};
```

(`pendingRenderSlideIds`/`clearPendingRender` vêm da Task 8 — se a Task 8 ainda não rodou, usar `dirty ? slides.map(s => s.id) : undefined` como está hoje; ajustar depois.)

- [ ] Rodar `pnpm --dir apps/web typecheck` — 0 erros novos.

### Task 2 — Corrigir staleness do ai-edit (não sobrescrever edição não salva)

**Files:** `apps/api/src/agents/carousel/carousel-ai-edit.controller.ts`, `apps/web/src/core/modules/agents/hooks/use-carousel-ai-edit.ts`, `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-adjust-bar.tsx`

**Problema:** O controller busca `htmlContent`/`cssContent` do `outputPayload` persistido no banco. Se o usuário editou o canvas (drag/resize/upload) e o debounce de 1.5s ainda não salvou, o ai-edit reescreve com base na versão antiga e o resultado sobrescreve a edição.

- [ ] Teste primeiro — `apps/api/src/agents/carousel/carousel-ai-edit.service.spec.ts`: adicionar caso onde `htmlContent`/`cssContent` vêm do request e não do slide persistido (já é assim no service; o gap é no controller, que ignora o body e sempre usa o slide do banco).
- [ ] Estender `bodySchema` do controller para aceitar conteúdo atual opcional:

```typescript
const bodySchema = z.object({
  slideId: z.string(),
  mode: z.enum(['rewrite_text', 'visual_edit']),
  prompt: z.string().min(1),
  layerId: z.string().optional(),
  currentHtmlContent: z.string().optional(),
  currentCssContent: z.string().optional(),
});
```

- [ ] No handler, preferir o conteúdo do body quando presente:

```typescript
const htmlContent = request.currentHtmlContent ?? slide.htmlContent;
const cssContent = request.currentCssContent ?? slide.cssContent;
return this.aiEdit.applyEdit({ request, htmlContent, cssContent });
```

- [ ] Frontend: `useCarouselAiEdit` passa a aceitar `currentHtmlContent`/`currentCssContent` no input type; `carousel-editor-adjust-bar.tsx` lê o slide atual do store (`useCarouselEditorStore.getState().slides.find(s => s.id === slideId)`) e envia seu `htmlContent`/`cssContent` no `mutateAsync`.
- [ ] Rodar `pnpm --dir apps/api test -- carousel-ai-edit`.

### Task 3 — Corrigir resume de runs legadas (não reiniciar o pipeline do zero)

**Files:** criar `apps/api/src/agents/carousel/utils/carousel-legacy-resume.util.ts`; modificar `apps/api/src/agents/runtime/workflow-engine.service.ts`

**Problema:** `resolveStartStepIndex` (packages/agent-ia-sdk/src/agents/core/execute-run.ts:99) faz `findIndex` por `currentStepKey`; como `await_content_approval`/`await_design_approval` não existem mais em `agent.ts`, o índice é -1 e o fallback é `return 0` — a run reinicia do `generate_ideas`, perdendo ideia/conteúdo/design já aprovados.

- [ ] Teste primeiro — `apps/api/src/agents/carousel/utils/carousel-legacy-resume.util.spec.ts`:

```typescript
import { remapLegacyCarouselStepKey } from './carousel-legacy-resume.util';

describe('remapLegacyCarouselStepKey', () => {
  it('maps await_content_approval to generate_design_plan', () => {
    expect(remapLegacyCarouselStepKey('await_content_approval')).toBe('generate_design_plan');
  });

  it('maps await_design_approval to generate_slides', () => {
    expect(remapLegacyCarouselStepKey('await_design_approval')).toBe('generate_slides');
  });

  it('returns null for a current, still-valid step key', () => {
    expect(remapLegacyCarouselStepKey('generate_ideas')).toBeNull();
  });
});
```

- [ ] Implementar:

```typescript
const LEGACY_STEP_REMAP: Record<string, string> = {
  await_content_approval: 'generate_design_plan',
  await_design_approval: 'generate_slides',
};

export const remapLegacyCarouselStepKey = (currentStepKey: string): string | null =>
  LEGACY_STEP_REMAP[currentStepKey] ?? null;
```

- [ ] Em `workflow-engine.service.ts`, no ponto onde a run do carousel é resumida (buscar por `resumeRun`/`carousel` no arquivo), antes de chamar `executeRun`, checar se `run.currentStepKey` é uma chave legada e, se sim, passar `resumeFromStep: remapLegacyCarouselStepKey(run.currentStepKey)` explicitamente:

```typescript
import { remapLegacyCarouselStepKey } from '../carousel/utils/carousel-legacy-resume.util';
// ...
const legacyTarget =
  run.agentId === 'carousel' && run.currentStepKey
    ? remapLegacyCarouselStepKey(run.currentStepKey)
    : null;
const resumeFromStep = legacyTarget ?? params.resumeFromStep;
```

- [ ] Regra: o conteúdo já gerado (`generate_content`/`generate_design_plan` outputs) continua no `previousStepsOutput` da run — pular para `generate_design_plan` ou `generate_slides` reaproveita o que já existe em vez de regenerar.
- [ ] Rodar `pnpm --dir apps/api test -- workflow-engine`.

### Task 4 — Não deixar o polling sobrescrever edição não salva

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.tsx`

**Problema:** `useEffect(() => setSlides(output.slides), [output.slides, setSlides])` roda a cada poll (a cada 2.5s durante execução), mesmo se `output.slides` só mudou de referência (não de conteúdo) — se isso coincidir com uma edição local não salva (`dirty === true`), a edição é descartada.

- [ ] Teste primeiro — `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.test.tsx` (novo arquivo, ver Task 15) cobre este caso.
- [ ] Guardar o efeito contra `dirty`:

```typescript
useEffect(() => {
  if (useCarouselEditorStore.getState().dirty) return;
  setSlides(output.slides);
}, [output.slides, setSlides]);
```

- [ ] Rodar `pnpm --dir apps/web test -- carousel-editor-shell`.

### Task 5 — Registrar `reviewSchema` no agente carousel

**Files:** `apps/api/src/agents/carousel/agent.ts`, `apps/api/src/agents/carousel/schemas/carousel-schemas.ts`

**Problema:** `AgentRunReviewService.editOutput` só valida `dto.editedOutput` se `agent.reviewSchema` existir; o agente carousel não registra nenhum, então qualquer payload passa para o banco sem checagem de forma no PATCH do editor.

- [ ] Teste primeiro — em `apps/api/src/agents/carousel/agent.spec.ts`, adicionar:

```typescript
it('registers a reviewSchema that rejects malformed edited output', () => {
  expect(carouselAgentDefinition.reviewSchema).toBeDefined();
  expect(() => carouselAgentDefinition.reviewSchema!.parse({ slides: [{ id: 'x' }] })).toThrow();
});
```

- [ ] Em `carousel-schemas.ts`, exportar (reaproveitando `carouselOutputSchema` já existente):

```typescript
export const carouselReviewSchema = carouselOutputSchema.pick({ slides: true });
```

- [ ] Em `agent.ts`, no builder do agente (`AgentDefinitionBuilder`, `packages/agent-ia-sdk/src/agents/core/agent-builder.ts:81-84`), adicionar `.review(carouselReviewSchema)` na cadeia de chamadas antes do `.build()` final.
- [ ] Rodar `pnpm --dir apps/api test -- agent.spec`.

### Task 6 — Erros Zod → 400 nos controllers de render/ai-edit + `onError` no frontend

**Files:** `apps/api/src/agents/carousel/carousel-render.controller.ts`, `apps/api/src/agents/carousel/carousel-ai-edit.controller.ts`, `apps/web/src/core/modules/agents/hooks/use-carousel-render.ts`, `apps/web/src/core/modules/agents/hooks/use-carousel-ai-edit.ts`

**Problema:** `carouselOutputSchema.parse(run.outputPayload)` roda sem try/catch nos dois controllers — um `ZodError` vira 500 genérico. Os hooks do frontend não têm `onError`, então o erro cai como promise rejeitada sem feedback.

- [ ] Backend — em ambos os controllers, trocar `.parse` por bloco protegido:

```typescript
let parsed: CarouselOutput;
try {
  parsed = carouselOutputSchema.parse(run.outputPayload);
} catch {
  throw new BadRequestException('Run output is not in the expected carousel format yet');
}
```

- [ ] Frontend — adicionar `onError` que seta um estado de erro visível (reaproveitar padrão de toast já usado em `use-carousel-image-upload.ts`, se existir; senão, `sonner`/toast já presente no design system):

```typescript
// use-carousel-render.ts e use-carousel-ai-edit.ts
onError: () => {
  toast.error('Não foi possível processar o slide. Tente novamente.');
},
```

- [ ] Teste — `apps/api/test/agents-carousel.e2e-spec.ts`: request de render numa run com `outputPayload` malformado retorna 400, não 500.
- [ ] Rodar `pnpm --dir apps/api test -- carousel` e `pnpm --dir apps/web test -- carousel`.

### Task 7 — Trocar fetch manual de preview por `useFilePreviewUrl` + Zod

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-layers-panel.tsx`

**Problema:** O componente chama `apiClient.get('/files/:id/preview')` direto com cast de tipo (`FilePreviewResponse`), duplicando `useFilePreviewUrl` (`apps/web/src/core/modules/files/hooks/use-files-api.ts:201`), que já valida e cacheia essa mesma chamada.

- [ ] Trocar o upload handler para usar o hook existente em vez do `apiClient.get` cru:

```typescript
import { useFilePreviewUrl } from "src/core/modules/files/hooks/use-files-api";
// ...
const [pendingFileId, setPendingFileId] = useState<string | null>(null);
const preview = useFilePreviewUrl(pendingFileId, Boolean(pendingFileId));

useEffect(() => {
  if (preview.data?.url && el) {
    (el as HTMLImageElement).src = preview.data.url;
    commit();
    setPendingFileId(null);
  }
}, [preview.data?.url]);
```

No `onChange` do input, após `uploadImage.mutateAsync`, chamar `setPendingFileId(result.fileId)` em vez do `apiClient.get` manual.

- [ ] Remover o tipo local `FilePreviewResponse` e o import de `apiClient` se não for mais usado no arquivo.
- [ ] Rodar `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web test -- carousel-editor-layers-panel`.

---

## Fase 2 — Gaps de UX/spec ainda não implementados

### Task 8 — Dirty set por slide (em vez de boolean único) + otimizar render parcial

**Files:** `apps/web/src/core/modules/agents/stores/carousel-editor-store.ts`

**Problema:** `dirty` é um boolean global; `handleExport` sempre re-renderiza todos os slides quando `dirty === true`, mesmo que só um tenha sido editado.

- [ ] Teste primeiro — `apps/web/src/core/modules/agents/stores/carousel-editor-store.test.ts`:

```typescript
it("tracks which slide ids are dirty independently", () => {
  const store = useCarouselEditorStore.getState();
  store.setSlides([{ id: "a", htmlContent: "", cssContent: "", order: 1 } as never]);
  store.updateSlideContent("a", "<p>x</p>", "");
  expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual(["a"]);
  store.clearPendingRender();
  expect(useCarouselEditorStore.getState().pendingRenderSlideIds).toEqual([]);
});
```

- [ ] Implementar: substituir `dirty: boolean` por `dirtySlideIds: Set<string>` internamente, expor `dirty` como getter derivado (`dirtySlideIds.size > 0`) e `pendingRenderSlideIds: string[]` (snapshot ordenado do Set):

```typescript
type CarouselEditorState = {
  slides: CarouselOutputSlide[];
  activeSlideId: string | null;
  selectedLayerId: string | null;
  dirtySlideIds: Set<string>;
  dirty: boolean;
  pendingRenderSlideIds: string[];
  panelTab: CarouselEditorPanelTab;
  // ...ações existentes
  clearPendingRender: () => void;
};
```

`updateSlideContent` adiciona `slideId` ao `dirtySlideIds`; `markSaved` some com a semântica antiga (mantém, mas não limpa `dirtySlideIds` — isso só acontece após o render bem-sucedido, via `clearPendingRender`).

- [ ] Atualizar Task 1 (`handleExport`) para usar `pendingRenderSlideIds` de fato (remover o TODO deixado lá).
- [ ] Rodar `pnpm --dir apps/web test -- carousel-editor-store`.

### Task 9 — Zoom de imagem via slider no painel (não via Moveable)

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-layers-panel.tsx`, `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-canvas.tsx`

**Problema:** A spec pede explicitamente um slider de zoom no painel (`transform: scale()`), separado do resize do Moveable. Hoje não existe — só dá pra trocar a imagem.

- [ ] Teste primeiro — `carousel-editor-layers-panel.test.tsx` (ver Task 15): mudar o slider dispara `commit()` com `transform` atualizado no elemento.
- [ ] No painel, quando `isImage`, adicionar um slider (reaproveitar `<input type="range">` estilizado com tokens, ou o componente `Slider` do design system se existir em `core/shared/components/ui`):

```tsx
const currentScale = parseFloat(el?.style.getPropertyValue("--carousel-zoom") || "1");

<label className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-tertiary)]">
  Zoom
</label>
<input
  type="range"
  min={1}
  max={2}
  step={0.05}
  defaultValue={currentScale}
  onChange={(event) => {
    if (!el) return;
    const scale = event.target.value;
    el.style.setProperty("--carousel-zoom", scale);
    el.style.transform = `scale(${scale})`;
    commit();
  }}
  className="w-full"
/>
```

- [ ] Persistir o zoom como `transform: scale(N)` inline no `<img>` — já é serializado normalmente via `doc.body.innerHTML` no `commitSerialized`, então não precisa de campo novo no schema.
- [ ] Rodar `pnpm --dir apps/web test -- carousel-editor-layers-panel`.

### Task 10 — Atalhos de teclado ←/→ para navegar slides

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.tsx`

**Problema:** O footer do shell exibe "← → navegar entre slides" mas não há listener nenhum — a UI promete um atalho que não funciona.

- [ ] Teste primeiro — `carousel-editor-shell.test.tsx`: disparar `keydown` com `ArrowRight` avança `activeIndex`; `ArrowLeft` volta; não navega quando o foco está num `input`/`textarea`.
- [ ] Implementar:

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if (event.key === "ArrowRight" && activeIndex < slides.length - 1) {
      handleSelectSlide(activeIndex + 1, slides[activeIndex + 1].id);
    }
    if (event.key === "ArrowLeft" && activeIndex > 0) {
      handleSelectSlide(activeIndex - 1, slides[activeIndex - 1].id);
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [activeIndex, slides, handleSelectSlide]);
```

- [ ] Rodar `pnpm --dir apps/web test -- carousel-editor-shell`.

### Task 11 — Focus trap no overlay

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-run-overlay.tsx`

**Problema:** O overlay tem `role="dialog"` + `aria-modal="true"` + `Escape`, mas não tem focus trap real — Tab pode sair do overlay pro resto da página (que fica visualmente escondida atrás, mas continua no DOM/tab order).

- [ ] Teste primeiro — `carousel-run-overlay.test.tsx`: `Tab` a partir do último elemento focável dentro do overlay volta pro primeiro (não escapa para `document.body`).
- [ ] Implementar um trap simples sem dependência nova (querySelectorAll de elementos focáveis dentro do container do portal):

```typescript
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleTab = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  window.addEventListener("keydown", handleTab);
  return () => window.removeEventListener("keydown", handleTab);
}, []);
```

Atribuir `ref={containerRef}` na `div` do `role="dialog"`.

- [ ] Rodar `pnpm --dir apps/web test -- carousel-run-overlay`.

### Task 12 — Layout mobile (abas Slide/Ajustes + filmstrip horizontal)

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.tsx`, `apps/web/src/core/modules/agents/stores/carousel-editor-store.ts`

**Problema:** A spec pede abas `Slide`/`Ajustes` no mobile; o shell atual é um grid fixo de 3 colunas (`grid-cols-[72px_1fr_320px]`) sem breakpoint — em telas pequenas o painel de 320px provavelmente estoura ou fica ilegível.

- [ ] Reaproveitar o campo `panelTab` do store (hoje morto — nenhum componente lê/escreve nele; este task o torna real em vez de removê-lo).
- [ ] Teste primeiro — `carousel-editor-shell.test.tsx` com viewport mock `< 768px`: abas "Slide" e "Ajustes" aparecem; clicar em "Ajustes" mostra o painel lateral abaixo do canvas em vez de ao lado.
- [ ] Implementar breakpoint com Tailwind (`md:` como corte, consistente com o resto do design system):

```tsx
<div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[72px_1fr_320px]">
  {/* filmstrip: horizontal scroll no mobile, vertical no desktop */}
  <div className="flex gap-2 overflow-x-auto p-2 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-r">
    {/* ...slides.map(...) inalterado */}
  </div>

  <div className="flex items-center justify-center bg-[var(--bg-canvas)] p-6">
    {/* canvas inalterado */}
  </div>

  <aside
    className={cn(
      "overflow-y-auto border-l border-[var(--line-default)]",
      panelTab === "adjust" ? "block" : "hidden md:block",
    )}
  >
    {/* painel inalterado */}
  </aside>
</div>

<div className="flex border-t border-[var(--line-subtle)] md:hidden">
  <button type="button" onClick={() => setPanelTab("content")} className={cn("flex-1 py-2 text-[13px]", panelTab === "content" && "text-[var(--accent)]")}>
    Slide
  </button>
  <button type="button" onClick={() => setPanelTab("adjust")} className={cn("flex-1 py-2 text-[13px]", panelTab === "adjust" && "text-[var(--accent)]")}>
    Ajustes
  </button>
</div>
```

- [ ] Rodar `pnpm --dir apps/web test -- carousel-editor-shell`.

### Task 13 — Usar `data-carousel-layer` explícito quando presente + estender aos 4 templates novos

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-canvas.tsx`, `apps/api/src/agents/carousel/templates/{spotlight,reel,daylight,voltage}/**/*.html`

**Problema:** O canvas ignora o atributo `data-carousel-layer` que `content-machine`/`minimal-clean` já declaram e usa uma heurística de seletor CSS genérica; os 4 templates novos (spotlight/reel/daylight/voltage) não têm o atributo, então nenhum elemento deles fica reconhecível de forma confiável fora da heurística.

- [ ] Teste primeiro — `carousel-editor-canvas.test.tsx` (ver Task 15): elemento com `data-carousel-layer="title"` recebe `data-carousel-layer-id` preferencialmente sobre um elemento só coberto pela heurística de tag.
- [ ] Em `assignLayerIds`, priorizar o atributo explícito e cair para a heurística só quando ausente:

```typescript
const EXPLICIT_SELECTOR = "[data-carousel-layer]";
const FALLBACK_SELECTOR = 'h1, h2, h3, p, .badge-pill, img, [class*="__bg"]';

const assignLayerIds = (doc: Document) => {
  const seen = new Set<Element>();
  doc.querySelectorAll(EXPLICIT_SELECTOR).forEach((el, index) => {
    seen.add(el);
    if (!el.getAttribute("data-carousel-layer-id")) {
      el.setAttribute("data-carousel-layer-id", `layer-${index}`);
    }
  });
  doc.querySelectorAll(FALLBACK_SELECTOR).forEach((el, index) => {
    if (seen.has(el) || el.getAttribute("data-carousel-layer-id")) return;
    el.setAttribute("data-carousel-layer-id", `layer-fallback-${index}`);
  });
};
```

- [ ] Adicionar `data-carousel-layer="title|body|image|badge"` nos 4 templates novos (`spotlight`, `reel`, `daylight`, `voltage`) seguindo o mesmo padrão já usado em `content-machine`/`minimal-clean` — um valor por elemento (não repetir `"bg"` genérico em vários elementos, que é o problema hoje mesmo nos templates migrados).
- [ ] Estender `apps/api/src/agents/carousel/utils/validate-carousel-templates.ts` para also-validar que cada valor de `data-carousel-layer` dentro de um mesmo slide seja único (evita a regressão de valores repetidos).
- [ ] Rodar `pnpm --dir apps/api test -- validate-carousel-templates` e `pnpm --dir apps/web test -- carousel-editor-canvas`.

### Task 14 — Limpeza: remover estado redundante

**Files:** `apps/web/src/core/modules/agents/components/carousel/editor/carousel-editor-shell.tsx`, `apps/web/src/core/modules/agents/components/carousel/editor/carousel-run-overlay.tsx`

- [ ] Derivar `activeIndex` de `activeSlideId` em vez de manter os dois em state separado:

```typescript
const activeIndex = slides.findIndex((s) => s.id === activeSlideId);
```

Remover `const [activeIndex, setActiveIndex] = useState(0)` e todo `setActiveIndex(...)`.

- [ ] Simplificar `handleSelectSlide` para receber só `slideId`:

```typescript
const handleSelectSlide = (slideId: string) => setActiveSlideId(slideId);
```

Atualizar o `.map` do filmstrip para `onClick={() => handleSelectSlide(slide.id)}`.

- [ ] Confirmar via grep que `LEGACY_PAUSE_REASONS`/`isLegacyPause` em `carousel-run-overlay.tsx` seguem necessários após a Task 3 (agora que o resume legado funciona corretamente, o banner ainda é o UX correto para avisar o usuário antes de continuar — **manter**, não remover).
- [ ] Rodar `pnpm --dir apps/web test -- carousel` e `pnpm --dir apps/web typecheck`.

---

## Fase 3 — Cobertura de teste

### Task 15 — Testes unitários faltantes (canvas, layers-panel, adjust-bar, shell)

**Files:** criar `carousel-editor-canvas.test.tsx`, `carousel-editor-layers-panel.test.tsx`, `carousel-editor-adjust-bar.test.tsx`, `carousel-editor-shell.test.tsx` em `apps/web/src/core/modules/agents/components/carousel/editor/`

- [ ] `carousel-editor-canvas.test.tsx`: renderiza com um slide fixture, simula `load` do iframe (jsdom), confirma que `data-carousel-layer-id` é atribuído respeitando a prioridade da Task 13; clique num elemento seleciona a layer no store.
- [ ] `carousel-editor-layers-panel.test.tsx`: sem `selectedLayerId` mostra o placeholder; com layer de texto mostra `Textarea` e `onBlur` chama `updateSlideContent`; com layer de imagem mostra o slider de zoom (Task 9) e o botão de upload.
- [ ] `carousel-editor-adjust-bar.test.tsx`: clicar num chip chama `useCarouselAiEdit` com o prompt do chip; `Enter` no input dispara `submit`; botão desabilita durante `isPending`.
- [ ] `carousel-editor-shell.test.tsx`: cobre as Tasks 4, 10, 12, 14 (guarda de dirty, atalhos de teclado, abas mobile, activeIndex derivado).
- [ ] Rodar `pnpm --dir apps/web test -- carousel` — todos os arquivos novos passando, nenhuma regressão nos 109 testes existentes.

### Task 16 — E2E do fluxo completo do editor

**Files:** `apps/web/e2e/carousel-flow.spec.ts`

- [ ] Adicionar um teste que abre uma run fixture já em fase `editor`, confirma `carousel-editor-shell` visível, seleciona um elemento de texto no canvas (via `data-testid="carousel-editor-canvas"` + click), edita o texto no painel, confirma que `carousel-adjust-bar` está visível, clica em "Exportar" e confirma que a chamada de render/export ocorre (mock de rede ou fixture de API conforme padrão já usado no arquivo).
- [ ] Cobrir também: overlay com run em fluxo legado mostra o banner "Esta execução usa o fluxo anterior" e o clique em "Continuar" dispara o resume (mock).
- [ ] Rodar `pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts`.

---

## Fase 4 — Gate final

### Task 17 — Validação completa e relatório de aceite

- [ ] `pnpm --dir packages/types typecheck && pnpm --dir packages/types test`
- [ ] `pnpm --dir apps/api typecheck && pnpm --dir apps/api test -- carousel`
- [ ] `pnpm --dir apps/web typecheck && pnpm --dir apps/web test -- carousel`
- [ ] `pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts`
- [ ] `pnpm check:ai-boundaries`
- [ ] `pnpm --dir apps/api lint apps/api/src/agents/carousel` e `pnpm --dir apps/web lint` restritos aos arquivos tocados neste plano (débito de formatação pré-existente no resto do repo fica fora de escopo — reportar separadamente, não misturar no gate desta feature)
- [ ] Confirmar os 7 critérios de aceite da spec `2026-07-03-carousel-editor-overlay-design.md` um a um, com evidência (comando + resultado).
- [ ] Relatório final: bugs corrigidos (10), gaps de UX fechados (zoom, atalhos, focus trap, mobile), testes adicionados (contagem), débito conhecido restante (se houver).

---

## Débito fora de escopo (não incluído neste plano)

- `workspace-settings.service.spec.ts:74` — erro de tipo pré-existente não relacionado ao carrossel (schema de settings de cuts colidindo com settings de carousel); bloqueia `pnpm --dir apps/api typecheck` limpo na raiz mas é de outro domínio.
- Débito de lint de formatação pré-existente no resto do monorepo (~268 e ~329 erros fora do escopo carousel) — não é deste plano.
- Realinhamento arquitetural completo do Zustand (Finding #9 da review — hoje o store guarda conteúdo de slide, não só UI state) — a Task 4 mitiga o sintoma mais grave (perda de edição por polling); uma reestruturação total para Zustand-só-UI é maior escopo, fica como follow-up caso o time queira priorizar.
