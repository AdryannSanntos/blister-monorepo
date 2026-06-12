# Estado Atual — Blister OS Migration

> Snapshot em **2026-06-12** (pós Plano 1 docs).  
> PRD: [`blister-os-prd.md`](../prd/blister-os-prd.md) · ADR: [`2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)

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

## Código existente (pré-OS — a migrar)

| Camada | Status | Nota OS |
|--------|--------|---------|
| **Auth** | ✅ better-auth | Mantém |
| **RBAC** | ✅ owner/admin/member | Evoluir para 5 roles (Plano 3) |
| **Company + Brand** | ✅ | Brand → WorkspaceSettings |
| **Storage** | ✅ S3 presigned | Estende para Files browser |
| **Credits** | ✅ | Mantém |
| **AI Catalog** | ✅ | Mantém |
| **Platform admin** | ✅ | Mantém |
| **Frontend** | Parcial MEI | brand, pecas, criar — **remover Plano 2** |
| **RAG / agents runtime** | Em progresso | SDK monolith Plano 3 |
| **Marketplace / Library** | ❌ | Plano 2 UI + Plano 3 API |
| **Personal Space** | ❌ | Plano 3 |
| **Files + extract** | ❌ | Plano 2 proto + Plano 3 API |

---

## Gaps documentados → implementação

| Gap | Plano |
|-----|-------|
| UI OS (sidebar, rotas, wizards) | **2** — fixtures, zero API |
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

---

## Desalinhamentos código vs docs (esperado até Plano 2/3)

| Item | Legado no código | Alvo OS |
|------|------------------|---------|
| `/dashboard/brand` | Existe | `/dashboard/settings` |
| Sidebar pecas/criar | Links mortos | NAV reference |
| Agentes strategist/copywriter/designer | Docs/código parcial | research/cuts/video_editor + marketplace |
| `brand.*` permissões | authz | `workspace.settings.*` |
| `ContentPiece` / `piece.*` | Schema | AgentRun only (novos fluxos) |

---

## Próximo passo

**Plano 2 Frontend** — [`docs/plans/blister-os/02-frontend.md`](../plans/blister-os/02-frontend.md)
