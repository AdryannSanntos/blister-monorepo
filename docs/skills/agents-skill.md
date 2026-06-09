# Agents Skill — Blister

> Fonte de verdade: [`docs/agents/`](../agents/) · [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)

## Objetivo

Guiar implementação de **agentes isolados** — registry, workflow por agente, execução e revisão na `AgentRun`.

Leia antes de mexer em:

- `apps/api/src/agents/**`
- `apps/api/src/rag/**`
- UI por agente em `apps/web/src/core/modules/**`

## Conceitos

| Termo | Definição |
|-------|-----------|
| Agent | Módulo plugável com `outputSchema` próprio (estratégia, texto, visual, post, …) |
| AgentRun | Execução multi-step; output em `outputPayload`; revisão na run |
| Step | Etapa dentro do workflow **de um** agente |
| Campanha | Workspace opcional — contexto + arquivos + runs; **não** dispara pipeline |

**Não usar:** peça/post como entidade central; `ContentPiece` em novos fluxos.

## Arquitetura

```
apps/api/src/agents/
  runtime/          # registry, workflow-engine, agent-run, review
  <agentId>/        # definition, workflow, steps, learning/
```

`POST /api/agents/:agentId/run` — **um agente por request**.

## Catálogo (não pipeline)

Ver [`docs/agents/pipeline-default.md`](../agents/pipeline-default.md).

## Workflow engine

[`docs/agents/workflow-engine.md`](../agents/workflow-engine.md)

## RAG e learning

- Contexto: marca + campanha + `AGENT_LEARNING` por `agentId`
- Aprovar/negar/editar na run → feedback handler → RAG

## Regras

- **Sem pipeline automático** entre agentes
- Revisão **por agente** — não `/api/pecas`
- Campanha opcional na run
- Créditos por step `generate_*`; Trigger.dev para execução async
- Labels UI por agente — invisível IDs técnicos

## Legado

`docs/archive/` = Workana AI — referência técnica apenas.
