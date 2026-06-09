# Épico: Revisão por Agente

> **Atualizado:** 2026-06-09 — revisão **dentro de cada agente**, na `AgentRun`. Sem módulo global de peças.

## Objetivo

Usuário aprova, nega, edita ou pede melhoria no **output da run daquele agente** — cada ação alimenta auto-melhoramento (`AGENT_LEARNING`).

## Ações

| Ação | UI (por agente) | Dispara learning |
|------|-----------------|------------------|
| Aprovar | Botão primário | APPROVED |
| Negar | Botão + motivo opcional | REJECTED |
| Editar | Editor conforme `reviewSchema` | EDITED (diff) |
| Pedir melhoria | Input curto | IMPROVE_REQUEST + nova run do **mesmo** agentId |
| Regenerar | Botão secundário | REGENERATED + nova run |

## Regras

- **Sem swipe Tinder**
- **Sem** `/api/pecas` ou hub central de revisão
- UI de revisão vive na página/workspace **do agente** (ou aba na campanha)
- `reviewSchema` define campos editáveis (legenda, plano, etc.)
- Aprovar pode habilitar export quando aplicável (ex.: download PNG no designer)

## API

- `POST /api/agents/runs/:runId/approve`
- `POST /api/agents/runs/:runId/reject` — `{ reason? }`
- `PATCH /api/agents/runs/:runId/output` — body validado por `reviewSchema`
- `POST /api/agents/runs/:runId/regenerate`

Permissão: `generation.create` ou `campaign.generate` quando `campaignId` presente.

> `piece.approve` / `piece.update` em `packages/authz` são legado — migrar para permissões de run/agente.

## UI feedback

- Toast ao aprovar: "Preferência salva — próximas criações vão melhorar"

## Integração

`FeedbackIngestionService` → [`agent-learning.md`](agent-learning.md) → RAG `AGENT_LEARNING` por `agentId`
