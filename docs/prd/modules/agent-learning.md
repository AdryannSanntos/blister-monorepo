# Épico: Auto-melhoramento Universal

> **Atualizado:** 2026-06-09 — feedback na `AgentRun` (revisão por agente), não hub central de peças.

## Objetivo

Todo agente aprende com feedback do usuário via RAG (`AGENT_LEARNING` por `agentId`) + memória estruturada.

## FeedbackType

| Tipo | Trigger |
|------|---------|
| APPROVED | Aprovar |
| REJECTED | Negar |
| EDITED | Edição manual |
| IMPROVE_REQUEST | Pedir melhoria |
| REGENERATED | Regenerar |

## Fluxo

```
User action → FeedbackIngestionService
           → LearningSignalService (regras + optional LLM summary)
           → RagIngestion (AGENT_LEARNING)
           → AgentMemory (empresaId + agentId)
           → Próxima run: retrieve_context com learning boost
```

## Contrato por agente

```typescript
interface AgentFeedbackHandler {
  agentId: string;
  extractSignals(feedback: AgentFeedback): LearningSignal[];
  formatLearningForPrompt(signals: LearningSignal[]): string;
}
```

Obrigatório em `agents/<id>/learning/feedback-handler.ts`. Registry valida no boot.

## Entidades

`AgentFeedback`, `LearningSignal`, `AgentMemory`

## Regeneração

- Nova `AgentRun` com `parentRunId` + `feedbackId`
- Step `apply_user_improvement` injeta instrução + output anterior

## Robustez

- Isolamento empresaId + agentId
- Idempotência via contentHash
- AuditLog em todo feedback
- Admin: limpar memória por empresa/agente

## MVP

Sem fine-tuning. Sem decay (Fase 2).
