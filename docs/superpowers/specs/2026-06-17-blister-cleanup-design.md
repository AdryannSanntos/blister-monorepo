# Blister OS — Limpeza Geral e Correções de Bugs

**Data:** 2026-06-17  
**Abordagem escolhida:** Opção B — 4 tracks em ordem de risco crescente

---

## Contexto

O produto passou por um pivot para foco exclusivo no agente de cortes. Há código legado de brand brain, agentes descontinuados (research, video_editor, strategist, copywriter, designer, post) e dois bugs críticos de UX: freeze no navegador ao abrir o modal de resultados e tela preta no login mobile.

---

## Track 1 — Fix Login Mobile (risco: mínimo)

**Problema:** após `signIn.email()` bem-sucedido, `LoginPage` faz apenas `router.push("/dashboard")`. Em mobile (cache frio do App Router), `authClient.useSession()` retorna `{ session: null, isPending: false }` por um frame antes de refetchar — o `AuthGuard` enxerga `!session` e redireciona de volta para login, resultando em tela preta ou loop.

**Fix:**
- `apps/web/src/core/modules/auth/pages/login-page.tsx`: adicionar `router.refresh()` imediatamente após `router.push(getPostLoginRedirectPath(searchParams))` na função `onSubmit`.
- Mesmo fix para o redirect após Google sign-in (o callback do Google já lida com refresh server-side, mas confirmar).

**Arquivos afetados:** 1 arquivo, 1 linha adicionada.

---

## Track 2 — Fix Freeze no Modal de Cortes (risco: baixo)

**Problema:** ao clicar no action button da tabela de resultados, o navegador trava. Causa raiz em duas camadas:

1. O `TableRowActionsMenu` já tem `setTimeout(0)` para evitar o focus-scope loop do Radix — esse fix é correto.
2. Na **primeira abertura** do modal, `CutsRunModalProvider` faz lazy mount do `CutsRunModalHost` (seta `hostMounted: true`), o que aciona `useCutsRunModal()` + mounting de `CutsRunModal` tudo em um único frame de reação. Se o run tem muitos cortes, todos os `CutStoryThumb` são renderizados simultaneamente.
3. O `CutStoryPlayer` usa `preload="auto"` para cortes com `cutFileId`, iniciando downloads imediatos.

**Fix:**
- `CutsRunModalProvider`: remover o lazy mount. Montar o `CutsRunModalHost` sempre (não condicional em `hostMounted`). Isso elimina o overhead extra no primeiro clique — o host já existe, apenas o modal abre.
- `CutsRunModal` / `CutsReviewPanel`: no grid de thumbs, limitar renders iniciais com `slice(0, VISIBLE_COUNT)` + botão "ver mais", ou virtualizar. Para início: renderizar no máximo 12 thumbs por vez.
- `CutStoryPlayer`: mudar `preload` de `"auto"` para `"metadata"` por padrão (já é o caso quando não há `cutFileId`). Para clips rendizados (`hasRenderedClipUrl`), manter `"auto"` só quando o cut está `selectedCut`.

**Arquivos afetados:** `cuts-run-modal-provider.tsx`, `cuts-review-panel.tsx`, `cut-story-player.tsx`.

---

## Track 3 — Remoção de Agentes Não-Cuts (risco: médio — frontend only)

O backend já está limpo (somente `apps/api/src/agents/cuts/` existe). O frontend ainda tem resíduos.

**Remover:**
- `apps/web/src/core/modules/agents/components/generations/research-generation.tsx`
- `apps/web/src/core/modules/agents/components/generations/video-editor-generation.tsx`
- `apps/web/src/core/modules/agents/components/generations/brief-agent-generation.tsx`
- `apps/web/src/core/modules/agents/config/agent-ui-config.ts` (contém strategist, copywriter, designer, post — nenhum existe)
- `apps/web/src/core/modules/research/` (módulo inteiro)
- `apps/web/src/core/modules/video-editor/` (módulo inteiro)
- `apps/web/src/core/modules/history/` (módulo de histórico genérico — verificar se usado por cuts; se não, remover)

**Limpar referências:**
- `use-dashboard-nav-groups.ts`: remover `research` e `video_editor` de `STUDIO_ICONS` (deixar só `cuts`).
- `agent-overview-page.tsx`, `agent-new-page.tsx`, `agent-settings-page.tsx`: verificar se há branches para agentSlug !== "cuts" e removê-las.
- Quaisquer imports de `ResearchGeneration`, `VideoEditorGeneration`, `BriefAgentGeneration` em páginas.

**Manter:**
- `apps/web/src/app/[locale]/dashboard/(shell)/agents/[agentSlug]/*` — rotas genéricas que servem cuts.
- `agent-history-page.tsx` — usado por cuts.
- `use-cuts-overview.ts`, `use-campaigns.ts` — verificar antes de remover.

---

## Track 4 — Remoção do Brand Brain (risco: alto — cross-layer)

**Frontend — remover:**
- `apps/web/src/core/modules/brand/` (inteiro: components, hooks, pages)
- `apps/web/src/core/modules/dashboard/components/dashboard-brand-memory-panel.tsx`
- Referências em `dashboard-quick-actions.tsx`
- `apps/web/src/app/[locale]/dashboard/(shell)/brand/page.tsx`
- `apps/web/src/core/modules/company/hooks/` — hooks de brand context da empresa

**Backend — remover toda utilização do RAG (manter o módulo inativo):**
- `apps/api/src/rag/brand-brain.serializer.ts` — remover arquivo
- `apps/api/src/rag/company-rag-sync.service.ts` (+ spec) — remover arquivo
- `apps/api/src/rag/context-pack.service.ts` — remover arquivo
- `apps/api/src/rag/rag-events.service.ts` — remover arquivo
- `apps/api/src/rag/rag-admin.controller.ts` — remover arquivo
- `apps/api/src/agents/adapters/context-pack-builder.adapter.ts` — remover arquivo
- `apps/api/src/agents/adapters/create-trigger-context-pack-builder.ts` — remover arquivo
- `apps/api/src/company/brand/` (controller, service, dto) — remover diretório
- Remover brand module do `company.module.ts`
- Limpar todos os imports/injeções de `RagModule`, `ContextPackService`, `CompanyRagSyncService`, `RagEventsService` em outros módulos (agents.module.ts, app.module.ts, etc.) — o módulo RAG pode existir mas nenhum outro módulo deve depender dele
- Remover listeners de eventos RAG em qualquer controller (internal-events, agents)

**Packages — remover:**
- `packages/types/src/brand-brain-progress.ts`
- `packages/types/src/brand-visual.ts`
- `packages/types/src/brand-palette.ts`
- Limpar exports em `packages/types/src/index.ts`
- Verificar e limpar referências em `packages/agent-sdk/src/core/types.ts` e `agent-runtime-types.ts`

**Regra sobre o módulo RAG:** `apps/api/src/rag/rag.module.ts` e os serviços restantes (retrieval, ingestion, embedding, chunk, document, caption) devem **existir mas não ser importados** por nenhum outro módulo. O módulo fica dormindo para uso futuro — não exportar nem injetar em nada ativo.

---

---

## Track 5 — Rotas Mortas e Módulos Órfãos (frontend)

Itens identificados na auditoria que não estavam no escopo inicial:

**Rotas mortas — remover:**
- `apps/web/src/app/[locale]/dashboard/(shell)/campaigns/page.tsx` — redireciona para `/dashboard`, conceito campaigns não existe
- `apps/web/src/app/[locale]/dashboard/(shell)/pieces/page.tsx` — redireciona para `/dashboard/history`, "peças" não existe
- `apps/web/src/app/[locale]/dashboard/(shell)/history/page.tsx` — histórico genérico multi-agente; cuts tem seu próprio em `/agents/cuts/history`

**Módulo history genérico — remover:**
- `apps/web/src/core/modules/history/` (inteiro) — histórico multi-agente substituído pelo histórico do agente cuts

**Hooks fora do escopo — remover:**
- `apps/web/src/core/modules/agents/hooks/use-campaigns.ts` — store Zustand de campaigns (conceito removido)
- `apps/web/src/core/modules/agents/hooks/use-caption-styles.ts` — caption styles são do agente video_editor (removido)
- `apps/web/src/core/modules/agents/hooks/use-agent-runs-mock.ts` — mock para agentes genéricos (não-cuts)
- `apps/web/src/core/modules/dashboard/hooks/use-company-rag-status.ts` — consulta status de RAG que será removido

**Utilitários fora do escopo — remover:**
- `apps/web/src/core/modules/agents/utils/format-design-plan-preview.ts` — formata planos do agente designer/post (removidos), referencia "Cérebro da Marca"
- `apps/web/src/core/modules/agents/utils/build-agent-messages.ts` — verificar; se for para chat UI genérico de agentes, remover

**Componentes do dashboard — limpar:**
- `dashboard/components/dashboard-quick-actions.tsx` — remover links para `/dashboard/campaigns` e `/dashboard/brand`
- `dashboard/components/dashboard-recent-activity.tsx` — importa `AGENT_UI_CONFIG` (strategist/copywriter/etc.); reescrever para mostrar apenas runs de cuts
- `dashboard/config/dashboard-agents.ts` — constrói nav de `AGENT_UI_IDS` (strategist, copywriter, designer, post); arquivo inteiro obsoleto

**Fixtures — limpar:**
- `blister-os/fixtures/recent-activity.fixture.ts` — remover entradas de `video_editor`, `script`; manter só `cuts`
- `blister-os/fixtures/agent-runs.fixture.ts` — remover runs de `video_editor`, `research`, `planning`, `script`; manter só `cuts`

**Store — limpar (não remover):**
- `blister-os/stores/blister-os-store.ts` — remover campo `editorStyleId` (video editor) e inicialização do `agentRuns` com fixture multi-agente; manter o store para files/settings/credits/marketplace

**Páginas de agentes — simplificar:**
- `agents/pages/agent-new-page.tsx` — remover branches `video_editor`, `research`, `default → BriefAgentGeneration`; manter só cuts
- `agents/pages/agent-overview-page.tsx` — remover branch `!isCuts` que usa mocks genéricos; simplificar para cuts
- `agents/pages/agent-settings-page.tsx` — remover branch `default → GenericAgentSettings`; simplificar para cuts

---

## Track 6 — Limpeza de Tipos e Backend Residual

**Backend:**
- `apps/api/src/ai-catalog/ai-catalog.controller.ts` — remover endpoint `PATCH /platform/settings/rag` e o método `updateRagSettings` do service
- `apps/api/src/ai-catalog/platform-settings.service.ts` — remover `updateRagSettings`

**Packages/Types:**
- `packages/types/src/agents.ts` — remover campos `campaignId` dos schemas `runAgentRequestSchema` e `stepContextSchema`; remover `brandProfile` e `contextPack` de `stepContextSchema`
- `packages/types/src/ai-catalog.ts` — remover `ragPlatformSettingsSchema` e `updateRagSettingsSchema`
- `packages/types/src/company.ts` — limpar imports de `brandPaletteSchema` e `brandAssetsSchema` (arquivos brand que serão deletados)

**Manter (não remover):**
- `ai-catalog/` inteiro exceto bloco rag settings — gerencia providers/models/policies para cuts
- `ai-catalog/platform-companies.service.ts` — admin precisa ver créditos de companies
- A maior parte de `packages/types/src/agents.ts` — é o contrato do runtime (AgentRunStatusDto, SSE events, etc.)

---

---

## Track 7 — Código Morto Adicional (auditoria profunda)

Achados da segunda rodada de auditoria que não estavam nos tracks anteriores:

**Componentes sem importador — remover:**
- `apps/web/src/core/shared/components/ui/agent-content-layout.tsx` — layout de chat de agentes, nenhum importador ativo
- `apps/web/src/core/shared/components/ui/markdown-editor.tsx` — editor markdown com toolbar, nenhum importador ativo
- `apps/web/src/components/agent-elements/` (diretório inteiro: agent-chat, message-list, input-bar, spiral-loader, text-shimmer, user-message, error-message, icons, image-lightbox, markdown) — componentes de chat UI do produto anterior; único referenciador é `build-agent-messages.ts` (já marcado para remoção)
- `apps/web/src/core/modules/agents/hooks/use-agent-catalog.ts` — nenhum importador ativo
- `apps/web/src/core/modules/dashboard/pages/dashboard-home-page.tsx` — não é usado (a home usa `BlisterOsHomePage`); importa brand brain panel, campaigns, AGENT_UI_IDS
- `apps/web/src/core/modules/dashboard/utils/dashboard-metrics.ts` — usado apenas por `dashboard-home-page.tsx` (que será removida)

**Utils com lógica morta — remover:**
- `apps/web/src/core/modules/agents/utils/build-agent-messages.ts` — marcado como `@deprecated` no próprio arquivo; referencia "Cérebro da Marca" em string, constrói mensagens para agentes removidos
- `apps/web/src/core/modules/agents/utils/extract-streaming-text.ts` — usado apenas por `build-agent-messages.ts`
- `apps/web/src/core/modules/agents/utils/post-onboarding-fields.ts` — fluxo de onboarding do agente `post` (removido)
- `apps/web/src/core/modules/agents/pages/history-page.tsx` — histórico multi-agente genérico com `AGENT_UI_CONFIG`/`AGENT_UI_IDS`

**Utils — simplificar:**
- `apps/web/src/core/modules/agents/utils/agent-run-helpers.ts` — contém `StrategistOutput`, `CopywriterOutput`, `DesignerOutput`, `PostSlide`, `parsePostOutput`, `getAgentOutputPreview` (todos de agentes removidos). Manter apenas: `getRunUserInput`, `canReviewRun`, `isRunActive`, `getReviewStatusLabelKey`
- `apps/web/src/core/modules/agents/hooks/use-agent-run-mutations.ts` — tem 7 mutations; verificar quais o `use-cuts-run-modal.ts` realmente usa e remover as demais
- `apps/web/src/core/modules/blister-os/utils/simulate-delay.ts` — verificar: usado pelas generations removidas; se `cuts-generation.tsx` também não usar mais, remover

**Utils — verificar antes de remover:**
- `apps/web/src/core/modules/agents/utils/build-messages-from-blocks.ts` — usado apenas em testes; verificar se alguma página ativa consome
- `apps/web/src/core/modules/agents/utils/format-agent-output-markdown.ts` — verificar se `build-messages-from-blocks.ts` ainda usa; se não, remover

---

## Ordem de execução

```
Track 1 → commit  (fix login mobile)
Track 2 → commit  (fix freeze modal)
Track 3 → commit  (remover agentes não-cuts — frontend)
Track 4 → commit  (remover brand brain + RAG usage)
Track 5 → commit  (rotas mortas + módulos órfãos)
Track 6 → commit  (limpeza de tipos e backend residual)
Track 7 → commit  (código morto — agent-elements, utils deprecated, hooks sem importador)
```

Cada track é independente e pode ser revertido sem afetar os demais.
