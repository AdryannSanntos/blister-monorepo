# Blister OS — Monorepo

## O que é este projeto

**Blister OS** é um **SO de conteúdo video-first** para creators, mentores e agências. O usuário opera pesquisa, edição, cortes e planejamento com contexto do workspace — identidade em **Configurações**, matéria-prima em **Arquivos**, estilos na **Biblioteca** (Marketplace).

O moat não é o LLM — é **contexto distribuído (Settings + Files + RAG)** + **agentes isolados** + **auto-melhoramento por run**.

**Workspaces:** Espaço Pessoal (sem RBAC) + Empresas (5 roles: owner, admin, creator, reviewer, viewer).

**Fase atual:** migração documentada (Plano 1 ✅) → UI offline Plano 2 → backend Plano 3. Ver [`docs/project/current-state.md`](docs/project/current-state.md).

---

## Ordem de execução (planos)

```
Plano 1 Correção + Docs → Plano 2 Frontend (zero API) → Plano 3 Backend
```

Regras: [`docs/plans/blister-os/00-execution-rules.md`](docs/plans/blister-os/00-execution-rules.md)

---

## Estrutura do monorepo

```
apps/
  web/    Next.js 16 + React 19
  api/    NestJS 11 + Prisma + pgvector (HTTP + adapters)
packages/
  agent-sdk/  100% lógica de agentes + workflow kernel
  authz/      Permissões CASL
  types/      Zod compartilhado
  configs/    TypeScript presets
```

---

## Regras invioláveis

### 1. Toda ação tem permissão

Backend: `@RequirePermission(key)`. Frontend: `<PermissionGate>` ou `useAbility()`.

### 2. userId nunca vem do body

`req.currentUser.id` sempre. IDs de recurso de `req.params`.

### 3. Novos endpoints com guard ou @Public explícito

AuthGuard é global.

### 4. Nova permissão → packages/authz primeiro

Declarar chave, map, roles, seed → controller → frontend.

### 5. Prisma é o único cliente de banco

Nunca editar `apps/api/src/generated/prisma` manualmente.

### 6. better-auth só trata auth/sessão

Workspace, settings, arquivos, créditos = domínio da aplicação.

### 7. Agentes só no SDK

**100%** da lógica em `packages/agent-sdk`. `apps/api/src/agents/` = registry + HTTP adapters.

### 8. Sem Cérebro da Marca

Não criar `/dashboard/brand`. Contexto em `/dashboard/settings` + `/dashboard/files`.

### 9. Dados em tabela por padrão

`<DataTable>` com sort, filtros, seleção, export, floating footer.

### 10. Simplicidade radical

Máx. 2–3 campos para iniciar tarefa. Projeto = nome + objetivo. Wizard = poucos passos.

### 11. Animações sempre presentes

`tw-animate-css` em overlays e interativos.

### 12. Espaçamento padronizado

`gap-6` entre seções, `gap-4` dentro de agrupamentos.

### 13. Rotas

`/dashboard/*` autenticado · `/auth/*` público · proxy via `apps/web/src/proxy.ts`  
Mapa OS: [`docs/design-system/blister-os-reference.md`](docs/design-system/blister-os-reference.md)

### 14. Agentes plugáveis e isolados

1 agent = 1 SDK package folder. Registry, não switch. Workflow multi-step **dentro de cada agente**. **Sem pipeline automático**. `POST /api/agents/:agentId/run`. Output em `AgentRun.outputPayload`. `learning/feedback-handler.ts` **obrigatório**.

**Default IDs:** `research`, `cuts`, `video_editor`  
**Marketplace IDs:** `planning`, `script`, `thumbnail`, `distribution`

### 15. RAG + learning

Retrieval filtered by `workspaceId`. User feedback indexed in RAG. No cross-tenant.

### 16. Créditos

Agentes e Marketplace consomem créditos. Free tier único (config admin). Débito por step LLM.

### 17. Linguagem UI

Zero jargão de IA. Verbos operacionais: **Editor de Vídeo**, **Gerar cortes**, **Pesquisar**, **Planejar conteúdo**, **Escrever roteiro**, **Marketplace**, **Biblioteca**, **Projetos**, **Arquivos**, **Configurações**, **Aprovar**. Evitar: "peça", "agente", "prompt", "LLM", **"Cérebro da Marca"**.

### 18. Plano 2 — zero integração

Frontend Blister OS: **fixtures + estado local** — zero `axios`/`fetch` para API de produto até Plano 3.

### 19. Regras de codificação

**Validação e contratos**
- **Zod sempre** — DTOs backend, formulários frontend, schemas em `packages/types`, outputs de IA.
- **Validação em toda fronteira** — body, params, query, respostas externas e payloads de agente.

**Frontend**
- **Plano 2:** TanStack Query sobre fixtures; **Plano 3+:** API real
- **RHF + zodResolver**, `mode: 'onBlur'`
- **nuqs** para URL state
- **Server Components** por padrão; `"use client"` só quando necessário
- Componentes em `core/modules/<feature>/components/`
- **Zustand** para UI global (wizards, sidebar proto state)

**Backend**
- Zod nos DTOs; invariantes no service

**Qualidade**
- **Playwright** smoke nas rotas OS (Plano 2)

---

## Produto e linguagem

- Nome: **Blister** (OS de conteúdo)
- Foco: vídeo, cortes, edição, planejamento creator-first
- Referência visual: [`blister-os-reference.html`](blister-os-reference.html)

---

## Stack resumida

Frontend: Next.js 16, React 19, Tailwind v4, shadcn/ui, TanStack Query/Table, RHF+Zod, nuqs, zustand, Playwright, axios (Plano 3+), next-themes

Backend: NestJS 11, Prisma, PostgreSQL+pgvector, better-auth, CASL, Zod, Resend, S3

---

## Documentação (prioridade)

| # | Documento |
|---|-----------|
| 1 | [`docs/prd/blister-os-prd.md`](docs/prd/blister-os-prd.md) |
| 2 | [`docs/plans/blister-os/00-execution-rules.md`](docs/plans/blister-os/00-execution-rules.md) |
| 3 | Este `CLAUDE.md` |
| 4 | [`docs/decisions/2026-06-12-blister-os-pivot.md`](docs/decisions/2026-06-12-blister-os-pivot.md) |
| 5 | [`docs/design-system/blister-os-reference.md`](docs/design-system/blister-os-reference.md) |
| 6 | [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](docs/decisions/2026-06-09-agents-isolated-architecture.md) |
| 7 | [`docs/project/`](docs/project/) · [`docs/agents/`](docs/agents/) |

`docs/archive/` = legado MEI/Workana — **nunca** contrato.

---

## Ordem de produto (pós-pivot)

1. Auth ✅ (legado)
2. Plano 1 Docs ✅
3. Plano 2 Frontend OS (fixtures) ← **próximo**
4. Plano 3 Backend: PersonalSpace, 5 roles, Settings, Files, SDK, 3 default agents, marketplace
5. Integração mocks → API
6. Recarga créditos (Fase 2)
7. Integrações externas + distribution (Fase 3)

**Estado atual:** [`docs/project/current-state.md`](docs/project/current-state.md)
