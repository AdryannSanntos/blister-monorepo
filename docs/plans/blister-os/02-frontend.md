# Plano 2 — Frontend (Blister OS)

> **Pré-requisito:** [Plano 1](./01-correction-and-docs.md) ✅  
> **Próximo:** [Plano 3 Backend](./03-backend.md) — contratos atualizados conforme este plano evolui  
> **Regras:** [00-execution-rules.md](./00-execution-rules.md)

## Objetivo

Implementar **toda a UI** do Blister OS em `apps/web`, espelhando [`blister-os-reference.html`](../../../blister-os-reference.html) e a identidade do design system (`globals.css`, Satoshi, Poppins, shadcn).

**Prioridade:** você edita e valida fluxos **antes** do backend.

**Regra absoluta — zero integração:** o frontend do Plano 2 **não se conecta à API** de produto. Tudo usa **dados fake, porém funcionais** — o usuário deve conseguir usar cada fluxo de ponta a ponta na interface (resgatar, navegar pastas, avançar wizards, salvar settings em memória, etc.), sem depender de `apps/api`.

**Obrigatório:** cada mudança de funcionalidade → atualizar [Contrato com o Frontend](./03-backend.md#contrato-com-o-frontend) no Plano 3 (contrato futuro; integração real só no Plano 3).

---

## Referência visual (obrigatória)

| Recurso | Uso |
|---------|-----|
| [`blister-os-reference.html`](../../../blister-os-reference.html) | Pixel/fluxo de referência — abrir lado a lado |
| [`docs/design-system/blister-os-reference.md`](../../design-system/blister-os-reference.md) | Mapa telas ↔ rotas |
| [`docs/design-system/`](../../design-system/) | Tokens, componentes |

### Sidebar (`NAV` do reference)

```
Início
Estúdio      → Editor de Vídeo, Gerador de Cortes [, Pesquisa]
Agentes      → marketplace resgatados only
Acervo       → Marketplace, Biblioteca, Projetos, Arquivos
Configurações
```

---

## Fase 2.1 — Fundação UI

### Shell

| Arquivo alvo | Referência HTML |
|--------------|-----------------|
| `core/modules/dashboard/components/dashboard-shell.tsx` | `Shell`, `Topbar` |
| `core/shared/components/ui/app-sidebar.tsx` | `Sidebar`, `NAV` |
| `core/modules/dashboard/hooks/use-dashboard-nav-groups.ts` | grupos colapsáveis, badges |

### Componentes shared (extrair do reference)

Criar em `core/shared/components/blister/` ou `core/modules/dashboard/components/`:

| Componente | Proto |
|------------|-------|
| `BlisterPageHeader` | `PageHeader` + `surface-icon` |
| `BlisterStatCard` | `StatCard` |
| `BlisterStepper` | `.steps` |
| `FileDropzone` | `.dropzone` |
| `MarketplaceStyleThumb` | `StyleThumb` |
| `OwnBadge`, `PriceBadge` | marketplace |
| `RedeemButton` | resgate |
| `BlisterEmptyState` | `.empty` |
| `BlisterChipRow` | `.chiprow` / `.fchip` |

### Rotas (App Router)

| Rota | Página | Reference |
|------|--------|-----------|
| `/dashboard` | `dashboard-home-page.tsx` | `HomePage` |
| `/dashboard/agents/video-editor` | módulo `video-editor/` | `EditorPage` |
| `/dashboard/agents/cuts` | módulo `cuts/` | `CortesPage` |
| `/dashboard/agents/research` | módulo `research/` | novo no proto |
| `/dashboard/agents/[agentId]` | `agent-surface-page.tsx` | `AgentPage` |
| `/dashboard/marketplace` | `marketplace/` | `MarketplacePage` |
| `/dashboard/marketplace/[itemId]` | `marketplace/` | `ItemDetailPage` |
| `/dashboard/library` | `library/` | `LibraryPage` |
| `/dashboard/projects` | `projects/` | `ProjectsPage` |
| `/dashboard/files` | `files/` | `UploadsPage` + pastas |
| `/dashboard/settings` | `settings/` | `SettingsPage` |
| `/dashboard/history` | `history/` | runs (extra) |

### Remover / redirecionar

- `/dashboard/brand` → redirect `/dashboard/settings`
- `/dashboard/campaigns` → `/dashboard/projects` (copy)
- `/dashboard/pieces` → `/dashboard/history`
- Deprecar módulo `core/modules/brand/`

---

## Fase 2.2 — Telas por prioridade

### P0 — Shell + Home + Settings

1. Sidebar + topbar + breadcrumb
2. `HomePage`: stats, CTAs Editor/Cortes, marketplace news, atividade
3. `SettingsPage`: cards contexto, créditos, equipe, workspace

### P1 — Marketplace + Biblioteca

1. `MarketplacePage`: filtros `MKT_TYPES`, grid `MarketCard`
2. `ItemDetailPage`: specs, `RedeemButton`, relacionados
3. `LibraryPage`: chips tipo, "Usar no Editor"
4. Estado `owned` + `credits`: Zustand persist ou localStorage (como reference)

### P2 — Estúdio (wizards)

1. **Editor de Vídeo** — 4 passos: Upload → Edit Style → Ajustes → Geração
2. **Gerador de Cortes** — upload + style + lista de cortes
3. **Pesquisa** (`research`) — superfície a definir no proto; brief + entregas mínimo

### P3 — Arquivos

Módulo `core/modules/files/`:

- `files-page.tsx`, `files-browser.tsx`, `files-breadcrumb.tsx`
- `files-toolbar.tsx`, `files-preview-panel.tsx`
- `files-upload-dialog.tsx` (checkbox **Extrair dados**)
- `nuqs`: `folderId`, `view=grid|list`
- Visual base: `UploadsPage` rowlist → evoluir com pastas

### P4 — Projetos + Agentes marketplace

1. `ProjectsPage` — cards com agentes vinculados
2. `AgentPage` — brief + entregas (`planning`, `script`, `thumbnail`)

### P5 — Onboarding + workspaces

1. Onboarding PF / Empresa (< 1 min) — sem brand wizard
2. Hub workspaces / cookie empresa (se já existir parcialmente, alinhar ao PRD)
3. i18n `pt-BR` + `en` — remover post/MEI/Brain

---

## Fase 2.3 — Dados fake funcionais (zero integração)

> Integração com API = **somente no Plano 3**. Neste plano, nenhum request de produto sai do browser.

### O que significa "funcional"

| Fluxo | Comportamento esperado (local) |
|-------|-------------------------------|
| Marketplace → resgate | Debita créditos fake; item vai para `owned`; aparece na Biblioteca e sidebar |
| Biblioteca | Lista filtra por tipo; "Usar no Editor" preenche wizard |
| Editor / Cortes | Stepper avança; upload simula arquivo; geração mostra resultado fake após delay |
| Arquivos | Breadcrumb, grid/lista, criar pasta, upload simulado, preview |
| Settings | Formulário salva em Zustand/`localStorage`; cards refletem mudança |
| Projetos | CRUD local; vincular agente resgatado |

### Proibido no Plano 2

- `axios` / `fetch` / Server Actions para rotas de produto (`/api/marketplace/*`, `/api/files/*`, runs, etc.)
- MSW ou proxy para `apps/api`
- Reutilizar hooks existentes que chamam `apiClient` — criar `use-*-mock.ts` paralelos
- "Só conectar este endpoint" — qualquer wire real adia para Plano 3

**Exceção:** auth/sessão (`better-auth`) para entrar no dashboard, se já existir — não é dado de produto Blister OS.

### Padrão de implementação

```
core/modules/<feature>/
  fixtures/          # JSON/TS estático (MKT_ITEMS, AGENTS, files tree…)
  stores/            # Zustand persist (owned, credits, settings draft)
  hooks/
    use-*-mock.ts    # TanStack Query: queryFn síncrono/async sobre fixture + store
  types/             # Zod schemas = contrato futuro com backend
```

### Fixtures iniciais (copiar estrutura do reference)

- `marketplace-items.fixture.ts` ← `MKT_ITEMS`
- `agents-catalog.fixture.ts` ← `AGENTS` (mapear IDs: `video_editor`, `cuts`, `planning`, `script`)
- `projects.fixture.ts`, `files-tree.fixture.ts`, `workspace-settings.fixture.ts`

### Simular rede (opcional)

```typescript
const simulateDelay = (ms = 400) => new Promise((r) => setTimeout(r, ms));
// useMutation: await simulateDelay(); then patch Zustand store
```

### Marcação de contrato (sem chamada HTTP)

```typescript
// CONTRACT: POST /api/marketplace/redeem — ver 03-backend.md#marketplace
// IMPLEMENTATION: local only until Plan 3
```

---

## Fase 2.4 — Agentes UI (transição)

### Deprecar UI legada post-first

- `post-preview-card.tsx`, `BlisterPost` renderer, `download-post-slides.ts`
- CTA "Criar post" → "Editar vídeo"
- `agent-ui-config.ts`: IDs novos + `tier`

### Default vs marketplace na nav

- **Estúdio:** só `video_editor`, `cuts`, `research`
- **Agentes:** só IDs com `owned[id]` (sidebar dinâmica)
- **Não listar** marketplace não resgatado na sidebar — só no Marketplace

### Wizards vs chat

- `video_editor` e `cuts`: **wizard** (reference), não chat genérico
- `research`, marketplace agents: brief + outputs (reference `AgentPage`)
- Manter `agent-elements` onde fizer sentido para streaming futuro (Plano 3)

---

## Fase 2.5 — Qualidade

- Playwright: smoke em cada rota do mapa
- Comparar visualmente com reference (manual ou screenshot)
- `PermissionGate` nas ações restritas (equipe, settings empresa)
- A11y: dropzone, stepper, file browser — keyboard + aria

---

## Estrutura de módulos alvo

```
apps/web/src/core/modules/
├── dashboard/       # shell, home
├── marketplace/     # list + detail + redeem UI
├── library/
├── files/
├── settings/        # absorve brand
├── projects/
├── video-editor/    # wizard
├── cuts/            # wizard
├── research/
├── agents/          # shared: config, history, agent surface
├── onboarding/
├── workspaces/
└── credits/         # card em settings + página se necessário
```

---

## Checklist de conclusão (Plano 2)

- [ ] Todas as rotas do mapa renderizam sem 404
- [ ] Sidebar = reference `NAV`
- [ ] **Zero integração** — nenhum módulo Blister OS chama API de produto
- [ ] Marketplace → resgate → biblioteca (**funcional** com estado local)
- [ ] Wizards editor + cortes completos (geração simulada)
- [ ] Files browser com pastas (**funcional** com fixture + estado)
- [ ] Settings substitui brand; sem copy Brain na UI
- [ ] i18n video-first
- [ ] `03-backend.md#contrato-com-o-frontend` reflete todas as telas
- [ ] Playwright smoke passando (sem depender de API além de auth)

---

## Apêndice — i18n keys principais

Namespaces a criar/rewrite em `messages/pt-BR.json`:

- `sidebar.*` — grupos Estúdio, Acervo, Configurações
- `home.*`, `marketplace.*`, `library.*`, `files.*`, `settings.*`
- `videoEditor.*`, `cuts.*`, `research.*`
- Remover: `brand.brain`, `agents.post`, `sidebar.agentPost`

---

## Quando passar para o Plano 3

Iniciar backend quando:

1. Fluxos principais **funcionais com dados fake** no reference + web
2. Contrato em `03-backend.md` revisado por você
3. Lista de endpoints priorizada para **substituir** mocks (P0: marketplace, files, settings)

A troca mock → API é trabalho do **Plano 3, Fase 3.7** — não antecipar no Plano 2.
