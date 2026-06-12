# Workflow Engine — SDK Kernel

> Execução **multi-step dentro de um único agente**. Kernel vive em **`packages/agent-sdk`** — não em `apps/api`.

---

## Localização

```
packages/agent-sdk/src/
  engine/
    workflow-engine.ts      ← loop de steps
    step-registry.ts
    step-result.ts
  agents/
    research/
    cuts/
    video_editor/
    planning/
    script/
    …
```

`apps/api` injeta adapters: Prisma persistence, RAG retrieval, credit debit, storage.

---

## StepResult

| Status | Comportamento |
|--------|---------------|
| `CONTINUE` | Próximo step **deste** agente |
| `PAUSED` | Run `PAUSED`; UI renderiza `pauseFormSchema` |
| `FAILED` | Run `FAILED`; erro em step |
| `COMPLETE` | `outputPayload` finalizado |

---

## AgentRunStatus

```
QUEUED → RUNNING → COMPLETED
                → PAUSED
                → FAILED
```

---

## StepContext (OS)

```typescript
{
  workspaceId: string;
  agentId: string;
  userInput: string;
  projectId?: string;
  workspaceSettings: WorkspaceSettings;
  project?: Project;
  ragPack: RagContextPack;
  stepOutputs: Record<string, unknown>;
  agentRunId: string;
}
```

Contexto de marca vem de **Settings + Files** — não `BrandProfile` module.

---

## Regras

- Pause **retoma mesma run**
- Zod em `validate_output` contra `outputSchema`
- Crédito debitado em steps `generate_*`
- `retrieve_context` boost `AGENT_LEARNING` por `agentId`
- Output **não** encadeia para outro agente

---

## Revisão

Após `COMPLETED`:

- `POST /api/agents/runs/:runId/approve`
- `POST /api/agents/runs/:runId/reject`
- `PATCH /api/agents/runs/:runId/output`

Feedback → RAG `AGENT_LEARNING`.

---

## Execução async

Trigger.dev task `agent-run-execute` — API enfileira; SDK executa.

---

## Referências

- [`2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)
- [`2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)
- Plano 3: [`docs/plans/blister-os/03-backend.md`](../plans/blister-os/03-backend.md)
