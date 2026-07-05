# Carousel Editor Overlay — Prompt de Execução em Loop (TDD + Review)

> **Plano fonte:** [`.cursor/plans/carousel_editor_overlay_66bcf174.plan.md`](../../../.cursor/plans/carousel_editor_overlay_66bcf174.plan.md)  
> **Spec alvo (criar na Task 0):** [`docs/superpowers/specs/2026-07-03-carousel-editor-overlay-design.md`](../specs/2026-07-03-carousel-editor-overlay-design.md)  
> **Uso:** Cole o **Prompt Mestre** abaixo em um novo chat do Cursor (modo Agent) e reexecute o loop até todas as tasks estarem `DONE`.

---

## Prompt Mestre (copiar e colar)

```text
Você é o agente executor do plano **Carousel Editor Overlay** no monorepo Blister OS.

## Fontes obrigatórias (ler antes de codar)
1. Plano: `.cursor/plans/carousel_editor_overlay_66bcf174.plan.md`
2. Spec (se existir): `docs/superpowers/specs/2026-07-03-carousel-editor-overlay-design.md`
3. Regras: `CLAUDE.md`, `.cursor/rules/agent-sdk-monolith.mdc`, `.cursor/rules/blister-os-product.mdc`, `.cursor/rules/english-code-only.mdc`
4. Design: skill `company-os-design` — tokens semânticos, Heading/Paragraph, sem jargão IA na UI

## Modo de trabalho: LOOP TDD + VALIDAÇÃO + REVIEW

Execute **uma task por iteração** (nunca mais de uma fase inteira de uma vez). Para cada task, siga rigorosamente:

### Ciclo RED → GREEN → REFACTOR → VALIDATE → REVIEW

1. **PLAN (2 min)** — Liste arquivos que vai tocar e o teste que vai escrever primeiro.
2. **RED** — Escreva o teste que falha (unit, integration ou e2e conforme a task).
3. **GREEN** — Implemente o mínimo para passar. Reutilize componentes existentes (CarouselPreviewDialog, CarouselIdeasStep, SubStepRow, useCarouselImageUpload).
4. **REFACTOR** — Limpe duplicação; extraia só se já houver repetição real.
5. **VALIDATE** — Rode TODOS os comandos da seção "Gate de validação" abaixo. Corrija até passar 100%.
6. **REVIEW** — Auto-review com checklist da seção "Code review". Corrija blockers antes de encerrar.
7. **REPORT** — Resumo: o que mudou, testes adicionados, comandos rodados, riscos residuais.
8. **STOP** — Pare. Não inicie a próxima task sem eu pedir "próxima task" ou "continue o loop".

## Gate de validação (rodar na raiz do monorepo após cada task)

```bash
# Tipos
pnpm typecheck

# Lint (só pacotes alterados quando possível)
pnpm --dir packages/types typecheck
pnpm --dir apps/api typecheck
pnpm --dir apps/web typecheck
pnpm --dir apps/api lint
pnpm --dir apps/web lint

# Testes unitários — escopo carousel
pnpm --dir packages/types test -- carousel
pnpm --dir apps/api test -- carousel
pnpm --dir apps/web test -- carousel

# Boundaries IA (se tocou agente)
pnpm check:ai-boundaries

# E2E carousel (quando task tocar UI/fluxo)
pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts
```

Se a task for só backend: pode pular e2e. Se for só types: pode pular e2e e testes web.

## Code review (obrigatório antes de encerrar a task)

Responda explicitamente Sim/Não para cada item:

### Arquitetura
- [ ] Lógica de negócio carousel só em `apps/api/src/agents/carousel/`
- [ ] LLM só via `@company-os/agent-ia-sdk` (`sdk.ia.*`)
- [ ] Schemas Zod em `packages/types` quando compartilhados
- [ ] Nenhum `userId` vindo do body
- [ ] Permissões existentes (`generation.create`) — sem chave nova sem `packages/authz`

### Frontend / identidade Blister
- [ ] Tokens semânticos (`--bg-base`, `--accent`, `--line-default`) — sem cores raw, sem `dark:`
- [ ] `Heading` / `Paragraph` / `SurfaceIcon` onde aplicável
- [ ] Copy UI em PT-BR via i18n — sem "agente", "prompt", "LLM", "IA"
- [ ] Overlay `z-[100]` cobre sidebar; `body` scroll lock quando aberto
- [ ] Evoluiu componentes existentes em vez de duplicar preview dialog

### Qualidade
- [ ] Teste escrito ANTES ou junto da implementação (TDD)
- [ ] Sem TODOs/placeholders
- [ ] Identificadores em inglês no código
- [ ] Diff mínimo — sem refatoração não relacionada
- [ ] `read_lints` nos arquivos editados — zero erros novos

### Regressão
- [ ] `apps/api/src/agents/carousel/agent.spec.ts` passa
- [ ] Fluxo overview + modal novo carrossel intacto
- [ ] Runs legados (pausados em content/design) têm estratégia documentada ou banner

## Ordem das tasks (executar em sequência)

Marque no plano ao concluir cada uma.

| ID | Task | Testes primeiro (TDD) |
|----|------|------------------------|
| T0 | Spec `2026-07-03-carousel-editor-overlay-design.md` | N/A (doc) |
| T1 | `customIdea` schema + testes em `packages/types` | `carousel.test.ts` — refine customIdea vs selectedIdeaId |
| T2 | Remover `await_content_approval` + `await_design_approval` | `agent.spec.ts` — steps e routing |
| T3 | Steps leem `generate_content` / `generate_design_plan` direto | `generate-slides.step.spec.ts`, `slides-generation-context` tests |
| T4 | Placeholder de imagem em `generate-slides` | `generate-slides.step.spec.ts` — slot vazio → data URI |
| T5 | `carousel-run-steps.ts` → 2 fases (`ideas` \| `editor`) | `carousel-run-display.test.ts` — derive phases |
| T6 | `CarouselPipelineProgress` unificado | teste vitest do mapper de sub-steps |
| T7 | `CarouselRunOverlay` portal em `dashboard-shell` | vitest render + e2e overlay visível cobre viewport |
| T8 | `CarouselIdeasStep` + card "Escrever minha ideia" | vitest + e2e seleção custom |
| T9 | `CarouselEditorShell` read-only (fork preview dialog) | vitest navegação slides + e2e run detail |
| T10 | Remover content/design da run detail page | e2e — não deve existir step conteúdo/design |
| T11 | `carousel-editor-store` + `CarouselEditorCanvas` + react-moveable | vitest serialize html; teste integração layer select |
| T12 | `CarouselEditorLayersPanel` + upload slot | vitest hook upload key; e2e trocar imagem |
| T13 | `PATCH output` debounce + `POST .../render` | api test render controller; vitest mutation |
| T14 | `POST .../ai-edit` backend | `carousel-ai-edit.service.spec.ts` |
| T15 | `CarouselEditorAdjustBar` + `useCarouselAiEdit` | vitest + e2e chip "Deixar mais direto" |
| T16 | `data-carousel-layer` templates content-machine + minimal-clean | `validate-carousel-templates` script |
| T17 | Polish: atalhos, runs legados, deprecar steps antigos | e2e completo `carousel-flow.spec.ts` |

## Regras do loop

- **Uma task por mensagem** quando eu disser "continue o loop" ou "próxima task".
- Se um gate falhar: **não avance** — corrija na mesma task.
- Se review encontrar blocker de arquitetura: corrija antes do REPORT.
- **Não commitar** a menos que eu peça explicitamente.
- Ao terminar T17: rodar gate completo + `pnpm test` na raiz e entregar relatório final de aceite contra os 7 critérios do plano.

## Primeira ação

1. Leia o plano e o estado atual do git (`git status`, arquivos carousel).
2. Identifique a **próxima task não concluída** na tabela (começar em T0 se nada foi feito).
3. Execute o ciclo RED→GREEN→REFACTOR→VALIDATE→REVIEW para essa task apenas.
4. Entregue o REPORT e pare.
```

---

## Como usar o loop na prática

### Sessão 1 — kickoff

```
[cole o Prompt Mestre acima]
```

O agente executa **T0** ou **T1** e para.

### Sessões seguintes

```
continue o loop
```

ou

```
próxima task do carousel editor overlay
```

Repita até T17. Cada iteração = 1 task + gate + review.

### Sessão de correção

Se algo quebrou depois:

```
continue o loop — corrigir gate falho em T{N}: [cole o erro]
```

### Sessão de review externa

Após T11+ (editor visual), adicione:

```
Antes do REPORT, rode review como Bugbot nos arquivos alterados desta task e corrija findings críticos.
```

---

## Comandos de validação por camada

### `packages/types`

```bash
pnpm --dir packages/types test
pnpm --dir packages/types typecheck
```

Arquivos chave: `src/agents/carousel.ts`, `src/agents/carousel.test.ts`

### `apps/api` (agente carousel)

```bash
pnpm --dir apps/api test -- carousel
pnpm --dir apps/api test -- agent.spec
pnpm --dir apps/api test -- generate-slides
pnpm --dir apps/api typecheck
pnpm --dir apps/api lint
```

Arquivos chave:
- `src/agents/carousel/agent.ts`
- `src/agents/carousel/agent.spec.ts`
- `src/agents/carousel/steps/*.spec.ts`
- `src/agents/runtime/workflow-engine.service.ts`

### `apps/web` (overlay + editor)

```bash
pnpm --dir apps/web test -- carousel
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts
```

Arquivos chave:
- `src/core/modules/agents/components/carousel/editor/*`
- `src/core/modules/dashboard/components/dashboard-shell.tsx`
- `src/core/modules/agents/hooks/use-carousel-run-detail.ts`

### Monorepo (gate final T17)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm check:ai-boundaries
pnpm --dir apps/web test:e2e -- e2e/carousel-flow.spec.ts
```

---

## Template de teste TDD por tipo

### Schema / types (T1)

```typescript
// packages/types/src/agents/carousel.test.ts
it("accepts customIdea when selectedIdeaId is absent", () => {
  expect(carouselIdeaSelectionSchema.parse({
    customIdea: { title: "Minha ideia" },
  })).toBeDefined();
});

it("rejects when both selectedIdeaId and customIdea are absent", () => {
  expect(() => carouselIdeaSelectionSchema.parse({})).toThrow();
});
```

### Agent pipeline (T2–T4)

```typescript
// apps/api/src/agents/carousel/agent.spec.ts
it("does not include content or design approval pause steps", () => {
  const keys = carouselAgent.definition.steps.map((s) => s.key);
  expect(keys).not.toContain("await_content_approval");
  expect(keys).not.toContain("await_design_approval");
});
```

### Frontend phases (T5–T6)

```typescript
// apps/web/.../carousel-run-display.test.ts
it("maps run awaiting slides to editor phase processing", () => {
  const phases = deriveCarouselOverlayPhases(mockRun);
  expect(phases.editor.status).toBe("processing");
});
```

### Overlay e2e (T7+)

```typescript
// apps/web/e2e/carousel-flow.spec.ts
test("run detail opens fullscreen overlay above sidebar", async ({ page }) => {
  await page.goto("/dashboard/agents/carousel/runs/<fixture-id>");
  const overlay = page.getByTestId("carousel-run-overlay");
  await expect(overlay).toBeVisible();
  const box = await overlay.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 2);
});
```

---

## Checklist de code review expandido (para o agente)

Use como segunda passagem após o checklist do Prompt Mestre.

### Segurança e dados
- HTML do slide editado não executa scripts no parent (iframe isolado)
- `ai-edit` valida `runId` pertence ao workspace (`assertRunBelongsToWorkspace`)
- Upload de imagem usa presigned existente — sem URL arbitrária no HTML

### Performance
- Só 1 slide renderizado no canvas ativo
- Filmstrip usa thumbs PNG ou width fixo 72px
- Debounce save ≥ 1500ms; não chama render PNG a cada drag

### Acessibilidade
- Overlay: `role="dialog"` + `aria-modal="true"` + focus trap
- Botões nav com `aria-label`
- Atalhos documentados com `ShortcutHint` / `<kbd>`

### i18n
- Novas strings em `apps/web/messages/pt-BR.json` (namespace `carousel.editor.*`)
- Rodar `pnpm --dir apps/web validate:i18n` se existir chave nova

### Produto
- Overview page inalterada
- StatusModal mantido para iniciar run
- Barra inferior: "Ajustar" não "Gerar com IA"

---

## Critérios de aceite final (T17)

O loop só termina quando todos forem **verificáveis**:

1. Tema → ideias (card ou custom) → slides sem UI de conteúdo/design escrito
2. Overlay cobre sidebar + header (`data-testid="carousel-run-overlay"`, `z-[100]`)
3. Visual alinhado ao preview dialog + idea cards + SubStepRow
4. Edição manual: texto, posição, zoom imagem, upload slot
5. Salvar (`PATCH output`) + export ZIP funcionam após edição
6. Barra de ajustes com chips + Sparkles — copy operacional PT-BR
7. `pnpm test` + e2e carousel verdes na raiz

---

## Relatório final esperado (após T17)

```markdown
## Carousel Editor Overlay — Conclusão

### Tasks
- T0–T17: [lista com ✅]

### Testes
- Unit: X passed
- E2E: carousel-flow ✅

### Gates
- typecheck ✅
- lint ✅
- check:ai-boundaries ✅

### Aceite
1. … ✅
…
7. … ✅

### Débito conhecido
- [se houver]

### Arquivos deprecados (não removidos)
- carousel-content-step.tsx
- carousel-design-plan-step.tsx
```

---

## Dicas para o operador humano

| Situação | Ação |
|----------|------|
| Agent tenta fazer 3 tasks de uma vez | Diga: "pare após uma task — siga o loop" |
| Teste e2e flaky | Peça fixture de run estável ou mock API na task T7 |
| Escopo creep (editor de templates) | Lembre: fora de escopo no plano |
| Quer commit | "crie commit" só após gate verde da task |
| Quer PR | Use após T17 + relatório final |

---

*Gerado em 2026-07-03 para execução agentic do plano Carousel Editor Overlay.*
