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

## Ordem de execução

```
Track 1 → commit
Track 2 → commit  
Track 3 → commit
Track 4 → commit
```

Cada track é independente e pode ser revertido sem afetar os demais.
