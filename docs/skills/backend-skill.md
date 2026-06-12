# Backend Skill — Blister OS

> Fonte: [`blister-os-prd.md`](../prd/blister-os-prd.md) · Plano 3: [`03-backend.md`](../plans/blister-os/03-backend.md)

## Objetivo

Implementar API e persistência **após** contrato definido pelo frontend (Plano 3).

## SDK boundary

- Agent logic: **`packages/agent-sdk` only**
- `apps/api/src/agents/` = controller + adapters + catalog

Ver `.cursor/rules/agent-sdk-monolith.mdc`

## Módulos alvo Plano 3

| Module | Responsibility |
|--------|----------------|
| `workspace/` | PersonalSpace, settings, 5 roles |
| `files/` | Folders, upload, extract → RAG |
| `marketplace/` | Items, redeem, library |
| `projects/` | Project workspace CRUD |
| `agents/` | HTTP run/review — delegates SDK |
| `rag/` | Index settings, file extract, learning |
| `credits/` | Exists — scope by workspace |

Legado `company/`, `brand/` → migrate to workspace.

## Validation

Zod em toda fronteira. `userId` de `req.currentUser.id`. `@RequirePermission` sempre.

## StepContext OS

Uses `workspaceSettings` + `project` — not `brandBrain` module.

## Trigger.dev

`agent-run-execute`, RAG index jobs — async.

## Contrato frontend

Toda nova API documentada em Plano 3 § Contrato com o Frontend + changelog.

## Não implementar

- `PipelineOrchestrator`
- Novos fluxos `ContentPiece` / `/pecas`
- Agent steps em `apps/api`
