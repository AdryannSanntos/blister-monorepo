# Estado Atual — Blister OS Migration

> Snapshot em **2026-06-28** (pós limpeza MEI/legacy + drop schema).  
> PRD: [`blister-os-prd.md`](../prd/blister-os-prd.md) · ADR SDK: [`2026-06-22-agent-ia-sdk.md`](../decisions/2026-06-22-agent-ia-sdk.md)

---

## Plano Agent IA SDK ✅

| Task | Entregável | Status |
|------|------------|--------|
| 1–8 | `packages/agent-ia-sdk` — `ia/` por capacidade + runtime | ✅ |
| 9 | `agents/` migrado de `agent-sdk` | ✅ |
| 10 | Drop `AiProviderCredential` | ✅ |
| 11–12 | `apps/api` shell + integration module | ✅ |
| 13 | `GET/PATCH /platform/settings/rag` | ✅ |
| 14 | Admin UI — aba **IA do sistema** | ✅ |
| 15 | `check-ai-boundaries.sh`, seed, ADR | ✅ |

**Package canônico:** `@company-os/agent-ia-sdk`  
**Removido:** `packages/agent-sdk` (shim deprecated)  
**Agentes ativos:** `cuts` + `carousel` (Plano 3 — API + templates + render PNG)

---

## Plano 3 — Carousel backend ✅ (2026-06-28)

| Entregável | Status |
|------------|--------|
| `imageSlots[]` + upload composto | ✅ |
| `CarouselTemplateService` + manifests | ✅ |
| `CarouselRenderService` (Puppeteer → PNG) | ✅ |
| Marketplace `TEMPLATE` + entitlement | ✅ |
| Export ZIP + hooks API no frontend | ✅ |
| Doc canônica `docs/agents/carousel/README.md` | ✅ |

---

## Plano 1 — Docs ✅

| Entregável | Status |
|------------|--------|
| `blister-os-prd.md` + ADR 2026-06-12 | ✅ |
| `CLAUDE.md`, skills, Cursor rules | ✅ |
| `blister-os-reference.md` + HTML proto parcial | ✅ |
| Legado MEI/Brand Brain marcado ou arquivado | ✅ |
| ROADMAP reescrito | ✅ |

---

## Código existente

| Camada | Status | Nota OS |
|--------|--------|---------|
| **Auth** | ✅ better-auth | Mantém |
| **RBAC** | ✅ owner/admin/member | Evoluir para 5 roles (Plano 3) |
| **Company + Brand** | ✅ | Brand → WorkspaceSettings |
| **Storage** | ✅ S3 presigned | Estende para Files browser |
| **Credits** | ✅ | Mantém |
| **AI Catalog** | ✅ | Mantém |
| **Platform admin** | ✅ | + aba IA do sistema (RAG settings) |
| **Agent IA SDK** | ✅ | `agent-ia-sdk` monolith |
| **RAG runtime** | ✅ | Em SDK `ia/rag/` |
| **Frontend OS** | Em progresso | Plano 2 — fixtures |
| **Marketplace / Library** | Parcial | Plano 2 UI + Plano 3 API |
| **Personal Space** | ❌ | Plano 3 |
| **Files + extract** | ❌ | Plano 2 proto + Plano 3 API |

---

## Gaps documentados → implementação

| Gap | Plano |
|-----|-------|
| UI OS (sidebar, rotas, wizards) | **2** — fixtures, zero API produto |
| `/dashboard/settings` substitui brand | **2** |
| `/dashboard/files` file browser | **2** |
| Marketplace → Library fluxo | **2** |
| Agent IDs OS (`research`, `cuts`, `video_editor`) | **2** UI + **3** SDK |
| PersonalSpace + CompanyMember + 5 roles | **3** |
| WorkspaceSettings + Files extract → RAG | **3** |
| Trocar mocks por hooks API | **3.7** |

---

## Arquitetura de produto (vigente)

- Agentes **isolados** — `POST /api/agents/:agentId/run`
- Projeto = workspace — **não** dispara pipeline
- Output em `AgentRun.outputPayload`
- Revisão **dentro de cada agente**
- Contexto: Settings + Files + integrações — **sem** Brand Brain module
- IA + agentes: **`@company-os/agent-ia-sdk`** — API só adapters

---

## Próximo passo

**Plano 2 Frontend** — [`docs/plans/blister-os/02-frontend.md`](../plans/blister-os/02-frontend.md)

Enforcement local: `pnpm check:ai-boundaries`
