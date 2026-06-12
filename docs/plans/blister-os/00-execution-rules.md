# Blister OS — Regras de execução

> Documento mestre para implementar os três planos sem divergência.  
> Planos: [01 Correção](./01-correction-and-docs.md) · [02 Frontend](./02-frontend.md) · [03 Backend](./03-backend.md)

---

## 1. Ordem obrigatória

```mermaid
flowchart LR
  P1[Plano 1 Correção + Docs]
  P2[Plano 2 Frontend]
  P3[Plano 3 Backend]
  P1 --> P2 --> P3
```

| Ordem | Plano | Quando começar |
|-------|-------|----------------|
| **1º** | Correção + Docs | Imediato — bloqueia os outros |
| **2º** | Frontend | Após critérios do Plano 1 ✅ |
| **3º** | Backend | Após frontend estável o suficiente para contratos; pode overlap parcial |

### Por que frontend antes do backend?

Você vai **iterar na UI primeiro** — ajustar telas, fluxos e funcionalidades no `blister-os-reference.html` e no `apps/web` antes de fixar APIs e agentes. O backend deve **seguir o que o frontend definiu**, não o contrário.

Isso **não** inverte a ordem dos planos: o Plano 1 (docs) ainda vem primeiro para que todos falem a mesma língua.

### Frontend sem integração (regra absoluta no Plano 2)

O Plano 2 é **100% offline em relação ao backend**:

- **Nenhuma integração** — zero chamadas HTTP à API, zero `axios`/`fetch` para `/api/*`, zero MSW apontando para servidor real
- **Dados fake, porém funcionais** — fixtures + estado local (Zustand, `localStorage`, TanStack Query com `queryFn` síncrono sobre fixtures)
- **Funcional** = o usuário consegue usar o produto de ponta a ponta na UI: resgatar item, ver biblioteca atualizar, avançar wizards, navegar pastas, editar settings em memória, etc.
- Integração real só no **Plano 3** (Fase 3.7), trocando mocks por hooks que chamam API

---

## 2. Fontes de verdade (hierarquia)

Quando houver conflito, resolver nesta ordem:

1. **Código já mergeado** em `main` / branch acordada
2. **[`blister-os-reference.html`](../../../blister-os-reference.html)** — layout, fluxos, componentes visuais
3. **`docs/prd/blister-os-prd.md`** — produto e domínio (criado no Plano 1)
4. **`docs/decisions/2026-06-12-blister-os-pivot.md`** — decisões travadas
5. **`docs/plans/blister-os/00-execution-rules.md`** (este arquivo)
6. Planos 01 / 02 / 03 — detalhe de implementação
7. `docs/archive/`, `docs/superpowers/` — **nunca** contrato

---

## 3. Verdades compartilhadas (os 3 planos devem repetir)

### Produto

- **Blister OS** — SO de conteúdo video-first (creators, mentores, agências)
- **User-centric:** Espaço Pessoal (sem RBAC) + Empresas (workspaces com 5 roles)
- **Sem Cérebro da Marca** — contexto em **Configurações** + **Arquivos** (extract) + integrações
- **Sem pipeline automático** entre agentes — cada run é isolada (`AgentRun`)

### Agentes

| Tier | IDs | Acesso |
|------|-----|--------|
| Default | `research`, `cuts`, `video_editor` | Todos no signup |
| Marketplace | `planning`, `script`, `thumbnail`, `distribution` (+ Edit Styles, templates…) | Resgate com créditos → Biblioteca |

### SDK

- **100% da lógica de agente** em `packages/agent-sdk`
- `apps/api/src/agents/` = HTTP + adapters apenas

### Design

- Telas espelham **`blister-os-reference.html`**
- Tokens: Satoshi, Poppins, primary-600, dark mode (`globals.css`)
- UI: evitar "peça", "agente", "Cérebro da Marca" — usar verbos operacionais

### Frontend (Plano 2)

- **Zero integração** com backend — só dados fake funcionais (ver §1)
- Auth existente pode permanecer para acessar `/dashboard`; demais dados de produto = fixtures locais

### Mapa de rotas (reference → Next.js)

| Reference `#/…` | Rota |
|-----------------|------|
| `home` | `/dashboard` |
| `editor` | `/dashboard/agents/video-editor` |
| `cortes` | `/dashboard/agents/cuts` |
| `agent/{id}` | `/dashboard/agents/{agentId}` |
| `marketplace` | `/dashboard/marketplace` |
| `item/{id}` | `/dashboard/marketplace/{itemId}` |
| `library` | `/dashboard/library` |
| `projects` | `/dashboard/projects` |
| `uploads` → evolui | `/dashboard/files` |
| `settings` | `/dashboard/settings` |

---

## 4. Sincronização Frontend → Backend

### Regra principal

> **Toda nova tela, campo, ação ou fluxo adicionado no frontend deve atualizar o Plano 3** na seção [Contrato com o Frontend](./03-backend.md#contrato-com-o-frontend).

### Quando atualizar o Plano 3

- Nova rota ou página
- Novo campo em formulário que precisa persistir
- Nova ação (resgate, upload, extract, wizard step) que precisa API
- Mudança de IDs de agente ou marketplace item
- Novo tipo de arquivo ou pasta em Files
- Mock trocado por chamada real — documentar endpoint esperado

### Como atualizar

1. Editar `docs/plans/blister-os/03-backend.md` — seção **Contrato com o Frontend**
2. Se for decisão de produto, atualizar também `blister-os-prd.md` ou ADR
3. Se mudar layout/navegação, atualizar `blister-os-reference.html` + `docs/design-system/blister-os-reference.md`
4. Registrar data e resumo em **Changelog de contrato** (final do Plano 3)

### Frontend sem backend (obrigatório no Plano 2)

| Permitido | Proibido |
|-----------|----------|
| Fixtures JSON/TS, Zustand persist, `localStorage` | `axios`, `fetch`, Server Actions que chamam API de produto |
| TanStack Query com `queryFn` lendo fixture (sem rede) | MSW ou qualquer proxy para `apps/api` |
| Delays simulados (`setTimeout`) para loading UX | Hooks `use-*` que importam `apiClient` / `services/*` reais |
| Mutations locais que atualizam store/fixture | Endpoints inventados já wired no frontend |

- Copiar padrão do reference (`MKT_ITEMS`, `AGENTS`, `owned` em localStorage)
- Marcar no código: `// CONTRACT: ver 03-backend.md#...` (contrato futuro, não chamada atual)
- Não inventar paths de API em inglês fora do padrão `/api/...` — documentar só no Plano 3

---

## 5. Sincronização Correção → Frontend → Backend

| Mudança em | Atualizar também |
|------------|------------------|
| Plano 1 (PRD, ADR, skills) | Planos 2 e 3 se afetar escopo |
| `blister-os-reference.html` | Plano 2 (telas) + Plano 3 (se novo contrato) |
| Plano 2 (nova tela) | Plano 3 contrato + opcional reference HTML |
| Plano 3 (novo endpoint) | Plano 2 — trocar mock por hook TanStack Query |

---

## 6. Regras de código (todos os planos)

### Monorepo

- Código em **inglês** (identificadores, rotas, DB) — ver `.cursor/rules/english-code-only.mdc`
- Tipografia UI: `Display`, `Heading`, `Paragraph` — ver `typography-components.mdc`

### Frontend (`apps/web`)

- **Plano 2:** zero integração — TanStack Query só sobre fixtures locais; RHF + Zod; `nuqs` para URL state
- **Plano 3+:** TanStack Query contra API real (substituir mocks)
- Componentes em `core/modules/<feature>/`
- Server Components por padrão; `"use client"` só quando necessário

### Backend (`apps/api`)

- `@RequirePermission` + `PermissionGuard`; `userId` de `req.currentUser.id`
- Zod em DTOs; Prisma único cliente
- Novos agents **somente** em `packages/agent-sdk`

### Pacotes

- `@company-os/types` — DTOs HTTP compartilhados
- `@company-os/authz` — permissões (nova key → authz primeiro)

---

## 7. Definition of Done por plano

### Plano 1 ✅

- [ ] `blister-os-prd.md` + ADR 2026-06-12 publicados
- [ ] `CLAUDE.md`, skills, regras Cursor alinhados
- [ ] Legado Workana/MEI/Brand Brain marcado ou arquivado
- [ ] `docs/design-system/blister-os-reference.md` criado
- [ ] `docs/README.md` aponta para `docs/plans/blister-os/`

### Plano 2 ✅

- [ ] Shell + sidebar = reference `NAV`
- [ ] Todas as rotas do mapa existem — **sem chamadas à API de produto**
- [ ] Dados fake **funcionais** (resgate, wizards, pastas, settings persistem localmente)
- [ ] Wizards Editor + Cortes funcionais (proto)
- [ ] Marketplace → Item → Library fluxo completo (estado local)
- [ ] Files browser com pastas (fixture + estado local)
- [ ] Settings substitui `/brand`
- [ ] i18n video-first; Playwright smoke nas rotas
- [ ] Nenhum módulo novo importa `apiClient` para features Blister OS

### Plano 3 ✅

- [ ] PersonalSpace + CompanyMember + 5 roles
- [ ] WorkspaceSettings + Files + extract → RAG
- [ ] SDK monolith + 3 default + marketplace agents
- [ ] Contrato com Frontend 100% implementado
- [ ] Frontend mocks substituídos por APIs reais

---

## 8. O que não fazer

- Começar Plano 2 antes do Plano 1 estar documentado
- **Integrar frontend com API no Plano 2** — dados fake funcionais apenas
- Implementar backend de agente em `apps/api/src/agents/{id}/`
- Manter `/dashboard/brand` ou copy "Cérebro da Marca"
- Divergir sidebar do reference sem atualizar HTML + planos
- Criar quarto plano paralelo — usar changelog nos planos 02/03

---

## 9. Changelog deste documento

| Data | Mudança |
|------|---------|
| 2026-06-12 | Split em 3 planos; frontend-first após correção; regras de sincronização |
| 2026-06-12 | Plano 2: zero integração; dados fake obrigatoriamente funcionais |
