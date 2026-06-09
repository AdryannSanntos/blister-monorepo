# Épico: Runtime de Agentes (isolados)

> **Atualizado:** 2026-06-09 — sem pipeline automático. Ver [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../../decisions/2026-06-09-agents-isolated-architecture.md).

## Objetivo

Workflow multi-step **dentro de cada agente** + registry plugável + execução sob demanda.

## Arquitetura

```
POST /api/agents/:agentId/run
  → AgentRunService
  → WorkflowEngine (steps do agente)
  → AgentRun.outputPayload
  → Revisão na superfície do agente
```

**Não existe** `PipelineOrchestrator` nem `POST /api/generate` com cadeia de agentes.

## Contratos

- `AgentDefinition` — `agentId`, `label`, `inputSchema`, `outputSchema`, `reviewSchema?`, steps
- `StepResult` — CONTINUE | PAUSED | FAILED | COMPLETE
- `AgentRun` / `AgentRunStep` — output e revisão na run
- `PipelineAgentConfig` — **catálogo** admin (habilitado + ordem UI), não execução

## Regras

- Registry — sem `if/switch` por `agentId` no engine
- Pause retoma **mesma** `AgentRun`
- Crédito debitado por step `generate_*`
- Todo agente: `learning/feedback-handler.ts`
- Contexto entre agentes via **RAG + runs aprovadas na campanha**

## Agentes no catálogo MVP

| agentId | Papel |
|---------|-------|
| strategist | Planejamento |
| copywriter | Texto |
| designer | Visual (Satori) |
| post (futuro) | Pacote completo — um entre vários |

## Referência

- [`docs/agents/README.md`](../../agents/README.md)
- [`docs/agents/workflow-engine.md`](../../agents/workflow-engine.md)
