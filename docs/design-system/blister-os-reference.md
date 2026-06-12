# Blister OS — Design Reference (Proto HTML)

> **Fonte visual:** [`blister-os-reference.html`](../../blister-os-reference.html)  
> **Plano 2:** espelhar estas telas em `apps/web` com fixtures — zero API  
> **Tokens:** [`tokens.md`](tokens.md) · [`usage-rules.md`](usage-rules.md)

---

## Inventário de telas

| `data-screen-label` | Hash route | Next.js route | Componente proto |
|---------------------|------------|---------------|------------------|
| Início | `#/home` | `/dashboard` | `HomePage` |
| Editor de Vídeo | `#/editor` | `/dashboard/agents/video-editor` | `EditorPage` |
| Gerador de Cortes | `#/cortes` | `/dashboard/agents/cuts` | `CortesPage` |
| Pesquisar | `#/agent/research` | `/dashboard/agents/research` | `AgentPage` |
| Planejar conteúdo | `#/agent/planning` | `/dashboard/agents/planning` | `AgentPage` |
| Escrever roteiro | `#/agent/script` | `/dashboard/agents/script` | `AgentPage` |
| Marketplace | `#/marketplace` | `/dashboard/marketplace` | `MarketplacePage` |
| Detalhe do item | `#/item/{id}` | `/dashboard/marketplace/[itemId]` | `ItemDetailPage` |
| Biblioteca | `#/library` | `/dashboard/library` | `LibraryPage` |
| Projetos | `#/projects` | `/dashboard/projects` | `ProjectsPage` |
| Arquivos | `#/uploads` | `/dashboard/files` | `UploadsPage` → file browser |
| Configurações | `#/settings` | `/dashboard/settings` | `SettingsPage` |

Telas dinâmicas de agente usam `data-screen-label={agent.nome}` conforme catálogo `AGENTS`.

---

## Sidebar NAV (grupos)

```javascript
NAV = [
  { items: [{ id: "home", label: "Início", icon: "home" }] },
  {
    label: "Estúdio",
    items: [
      { id: "editor", label: "Editor de Vídeo", icon: "clapper", badge: { value: "core" } },
      { id: "cortes", label: "Gerador de Cortes", icon: "scissors" },
      { id: "agent/research", label: "Pesquisar", icon: "sparkle" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { id: "agent/planning", label: "Planejar conteúdo", icon: "compass" },
      { id: "agent/script", label: "Escrever roteiro", icon: "pen" },
    ],
  },
  {
    label: "Acervo",
    items: [
      { id: "marketplace", label: "Marketplace", icon: "store" },
      { id: "library", label: "Biblioteca", icon: "library", showCount: true },
      { id: "projects", label: "Projetos", icon: "folder" },
      { id: "uploads", label: "Arquivos", icon: "upload" },
    ],
  },
  {
    label: "Configurações",
    items: [{ id: "settings", label: "Configurações", icon: "settings" }],
  },
];
```

Grupos colapsáveis — estado em `localStorage` key `blisteros-groups-v1`.

---

## Mapa hash → parser

| `route.page` | `route.param` | Página |
|--------------|---------------|--------|
| `home` | — | Início |
| `editor` | styleId opcional | Editor |
| `cortes` | — | Cortes |
| `agent` | agentId | Superfície agente |
| `marketplace` | — | Marketplace |
| `item` | itemId | Detalhe marketplace |
| `library` | — | Biblioteca |
| `projects` | — | Projetos |
| `uploads` | folderId opcional | Arquivos |
| `settings` | — | Configurações |

Router: `parseHash()` — `#/pagina/param`.

---

## IDs de agente (canônicos)

| ID | Label UI | Tier |
|----|----------|------|
| `video_editor` | Editor de Vídeo | default |
| `cuts` | Gerador de Cortes | default |
| `research` | Pesquisar | default |
| `planning` | Planejar conteúdo | marketplace |
| `script` | Escrever roteiro | marketplace |
| `thumbnail` | Criar thumbnail | marketplace |
| `distribution` | Distribuir | marketplace (posterior) |

Hash routes `editor` e `cortes` mapeiam para agent IDs acima no Next.js.

---

## Componentes reutilizáveis (proto)

| Componente | Uso |
|------------|-----|
| `PageHeader` | Ícone surface + título + descrição + actions |
| `StatCard` | KPIs na home |
| `StyleThumb` | Preview abstrato de item marketplace (paleta CSS) |
| `BlisterStepper` | Wizards Editor e Cortes |
| `OwnBadge` / `PriceBadge` | Estado de posse e preço |
| `PageLayout` | `.page-inner` / `.page-inner.narrow` |
| `SurfaceIcon` | `.surface-icon` + ícone stroke |
| `Card` variants | `.card`, `.card.pad`, `.card.hov` |
| `RowList` | `.rowlist` + `.row` |
| `Badge` | `.badge`, `.free`, `.premium`, `.owned`, `.new` |
| `Btn` | `.btn`, `.btn.outline`, `.btn.soft`, `.btn.sm` |
| `TweaksPanel` | Proto-only — design tuning (não portar prod) |

---

## Layout shell

```
.os
├── .sidebar (AppSidebar)
│   ├── .sb-brand
│   ├── NAV groups (.sb-group)
│   └── collapse toggle
└── .os-main
    ├── Topbar (search, credits, theme, notifications)
    └── .page → PageSwitch
```

Dimensões: `--sidebar-w: 18rem`, `--sidebar-w-collapsed: 4.25rem`.

---

## Fixtures globais (Plano 2)

| Constante | Conteúdo |
|-----------|----------|
| `MKT_ITEMS` | Itens marketplace |
| `AGENTS` | Catálogo agentes |
| `PROJECTS` | Projetos workspace |
| `FILES` / `UPLOADS` | Arquivos e pastas |
| `RECENT_ACTIVITY` | Feed home |
| `INITIAL_OWNED` | Biblioteca seed |

Persistência proto: `blisteros-owned-v1`, `blisteros-credits-v1`, `blister:sidebar-open-proto`.

---

## Tipografia e tema

- Corpo: **Satoshi** (`--font-sans`)
- Headings + botões: **Poppins** (`--font-heading`)
- Acento: `--primary-600` (#563be7)
- Dark: classe `.dark` no `<html>` — igual produto
- Animações: `page-enter`, `tw-animate-css` no Plano 2

---

## Checklist alinhamento Plano 2

- [ ] Sidebar NAV = tabela acima
- [ ] Todas as rotas Next existem
- [ ] Agent IDs com underscore no código; URLs kebab-case ok
- [ ] Settings sem "Cérebro da Marca" — só "Contexto da marca"
- [ ] Files com breadcrumb + pastas
- [ ] Marketplace → Library fluxo local funcional
