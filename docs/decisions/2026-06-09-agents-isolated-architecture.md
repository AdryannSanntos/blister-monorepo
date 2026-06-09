# Decisão — Agentes isolados, campanha como workspace, sem peça central

> **Data:** 2026-06-09  
> **Status:** Aprovado  
> **Substitui / refine:** pipeline automático strategist→copywriter→designer, entidade central de peça/post, revisão global de conteúdo

---

## Resumo

1. **Sem pipeline automático** entre agentes — nenhum encadeamento strategist → copywriter → designer.
2. **Cada agente roda isolado**, sob demanda do usuário (`POST /api/agents/:agentId/run`).
3. **Campanha** é workspace que agrupa runs, arquivos e contexto — não dispara agentes em sequência.
4. **Sem entidade central peça/post** — output vive em `AgentRun.outputPayload` (schema Zod por agente).
5. **Revisão (aprovar/negar/editar)** acontece **dentro de cada agente**, não em módulo global.
6. **Vários agentes heterogêneos** — post completo é um agente entre outros (strategist, copywriter, designer, email, etc.).
7. **Learning RAG** via `AGENT_LEARNING` indexado por `agentId` — não fluxo centrado em `APPROVED_PIECE`.
8. **Workers async:** Trigger.dev para `RagIndexJob` e execução de `AgentRun`.

---

## Decisões travadas

| # | Tema | Decisão |
|---|------|---------|
| 1 | Execução | Um `AgentRun` por invocação; `pipelineRunId` null no MVP |
| 2 | Output | `AgentRun.outputPayload` + `outputSchema` / `reviewSchema` por agente |
| 3 | Revisão | Endpoints em `/api/agents/runs/:runId/{approve,reject}` + `PATCH .../output` |
| 4 | Contexto entre agentes | RAG + runs aprovadas na campanha — não output encadeado |
| 5 | Catálogo admin | `PipelineAgentConfig` = agentes habilitados (display), não ordem de execução |
| 6 | `ContentPiece` | Legado no schema — não usar em novos fluxos (Sprint 3–4) |
| 7 | Permissões revisão | `generation.create` / `campaign.generate` na run; migrar `piece.*` depois |
| 8 | UI | Cada agente tem superfície própria de resultado e revisão |
| 9 | Linguagem UI | Nomes operacionais por agente (ex.: "Planejar conteúdo", "Criar texto") — evitar "peça" |

---

## Modelo mental

```
Campanha
├── AgentRun strategist  → output: plano
├── AgentRun copywriter  → output: legendas
├── AgentRun designer    → output: imagem
└── AgentRun post (fut.) → output: pacote completo (um agente entre vários)
```

Usuário escolhe **qual agente** rodar e **quando**. Revisa **na tela daquele agente**.

---

## Fontes de verdade

1. [`CLAUDE.md`](../../CLAUDE.md)
2. Este documento
3. [`docs/ROADMAP.md`](../ROADMAP.md) (seção atualização 2026-06-09)
4. [`docs/agents/README.md`](../agents/README.md)
5. Plano Sprints 3–4 em `.cursor/plans/`

---

## Legado a não seguir

- `POST /api/generate` disparando pipeline completo
- `PATCH /api/pecas/:id/*`
- Módulo frontend `pecas/` ou `posts/` como hub central de revisão
- [`docs/agents/pipeline-default.md`](../agents/pipeline-default.md) (versão antiga) — ver catálogo atualizado
