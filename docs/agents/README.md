# Agentes — Documentação

> **Decisão vigente:** agentes **isolados**, campanha como workspace, revisão **por agente**. Ver [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md).

## Princípio

Cada agente = **1 pasta plugável** em `apps/api/src/agents/<agentId>/`. O runtime descobre definitions via `agent-catalog.ts` e executa steps registrados em `agent-step-registry.ts` — **sem if/switch** por step no engine.

**Não há pipeline automático** entre agentes. Usuário escolhe qual rodar.

## Estrutura obrigatória

```
agents/<agentId>/
├── agent.ts                 # AgentBuilder (@company-os/agent-sdk): steps, schemas, contexto
├── index.ts                 # re-export fino (opcional)
├── schemas/                 # defineAgentSchemas + Zod (fonte de verdade)
├── prompts/
├── learning/
│   └── feedback-handler.ts  ← OBRIGATÓRIO
└── steps/                   # só quando o agente precisa de lógica custom (ex.: post)
```

Steps simples usam primitives da SDK (`createLlmCallStep`, `createRetrieveContextStep`, etc.) declarados diretamente no `agent.ts`. Não duplicar executores em arquivos soltos.

## Agentes MVP (catálogo inicial)

| ID | Função |
|----|--------|
| `strategist` | Planejamento de conteúdo |
| `copywriter` | Legendas + hashtags |
| `designer` | Imagem via prompt + geração |
| `post` | Pacote completo (HTML slides + legenda) — **um agente entre vários** |

Docs: [`strategist/`](strategist/README.md) · [`copywriter/`](copywriter/README.md) · [`designer/`](designer/README.md)

## Output e revisão

- Resultado em **`AgentRun.outputPayload`** (Zod por agente)
- **Não** usar `ContentPiece` como hub central em novos fluxos
- Aprovar / negar / editar na **superfície do agente** (`/api/agents/runs/:runId/...`)

## Catálogo (não pipeline)

Ver [`pipeline-default.md`](pipeline-default.md) — nome legado do arquivo; conteúdo = catálogo de agentes.

## Workflow engine

Ver [`workflow-engine.md`](workflow-engine.md)

Pacote compartilhado: `@company-os/agent-sdk` (`packages/agent-sdk/`). Adapters Nest/Prisma/RAG ficam em `apps/api/src/agents/adapters/`.

## Criar novo agente

1. Criar pasta `agents/<agentId>/`
2. Implementar `agent.ts` com `AgentBuilder.create({ id, version })` + steps da SDK
3. Schemas em `schemas/` via `defineAgentSchemas`
4. Implementar `learning/feedback-handler.ts`
5. Registrar em `agent-catalog.ts` e `agent-loader.ts`
6. Doc em `docs/agents/<id>/README.md`
7. Admin: habilitar no catálogo + política de modelo

## Linguagem UI

- Cada agente tem **label operacional** (ex.: "Criar texto", "Planejar campanha")
- Evitar expor IDs técnicos (`strategist`, `LLM`, `agente`)
- Evitar termo **"peça"** — usar linguagem do que o agente entrega (texto, imagem, plano, post)
