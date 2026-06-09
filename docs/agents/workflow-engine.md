# Workflow Engine

> Execução **multi-step dentro de um único agente**. Sem encadeamento entre agentes.

## StepResult

| Status | Comportamento |
|--------|---------------|
| `CONTINUE` | Próximo passo do workflow **deste** agente |
| `PAUSED` | Run `PAUSED`; UI renderiza `pauseFormSchema` |
| `FAILED` | Run `FAILED`; erro em `AgentRunStep` |
| `COMPLETE` | Output final em `AgentRun.outputPayload` — **fim desta run** |

## AgentRunStatus

```
QUEUED → RUNNING → COMPLETED
                → PAUSED
                → FAILED
```

## StepContext

```typescript
{
  companyId: string;
  agentId: string;
  userInput: string;
  campaignId?: string;
  brandBrain: BrandProfile;
  campaign?: Campaign;
  ragPack: RagContextPack;
  stepOutputs: Record<string, unknown>;
  agentRunId: string;
}
```

## Regras

- Pause **retoma mesma run** — nunca spawn nova run para continuar
- Zod em `validate_output` contra `outputSchema` do agente
- Crédito debitado em steps `generate_*`
- `retrieve_context` com learning boost por `agentId`
- Output **não** passa automaticamente para outro agente

## Revisão (por agente)

Após `COMPLETED`, usuário revisa na UI do agente:

- `POST /api/agents/runs/:runId/approve`
- `POST /api/agents/runs/:runId/reject`
- `PATCH /api/agents/runs/:runId/output` — validado por `reviewSchema`

Feedback → `AGENT_LEARNING` no RAG (Sprint 7).

## Serviços

- `workflow-engine.service.ts` — loop de steps de **um** agente
- `agent-run.service.ts` — start, resume, consulta runs
- `agent-run-review.service.ts` — approve/reject/edit

## Execução async

Trigger.dev task `agent-run-execute` — evita timeout HTTP.

## Referência

- [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)
