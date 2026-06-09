# Agentes — Documentação

> **Decisão vigente:** agentes **isolados**, campanha como workspace, revisão **por agente**. Ver [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md).

## Princípio

Cada agente = **1 pasta plugável** em `apps/api/src/agents/<agentId>/`. Registry descobre definitions — **sem if/switch** por `agentId` no engine.

**Não há pipeline automático** entre agentes. Usuário escolhe qual rodar.

## Estrutura obrigatória

```
agents/<agentId>/
├── agent.definition.ts    # inputSchema, outputSchema, reviewSchema?, label UI
├── workflow.ts
├── steps/
├── learning/
│   ├── feedback-handler.ts   ← OBRIGATÓRIO
│   └── learning-rules.ts
├── rules.ts
├── prompts/
└── schemas/
```

## Agentes MVP (catálogo inicial)

| ID | Função |
|----|--------|
| `strategist` | Planejamento de conteúdo |
| `copywriter` | Legendas + hashtags |
| `designer` | HTML → PNG (Satori) |
| `post` (futuro) | Pacote completo — **um agente entre vários**, não o centro do produto |

Docs: [`strategist/`](strategist/README.md) · [`copywriter/`](copywriter/README.md) · [`designer/`](designer/README.md)

## Output e revisão

- Resultado em **`AgentRun.outputPayload`** (Zod por agente)
- **Não** usar `ContentPiece` como hub central em novos fluxos
- Aprovar / negar / editar na **superfície do agente** (`/api/agents/runs/:runId/...`)

## Catálogo (não pipeline)

Ver [`pipeline-default.md`](pipeline-default.md) — nome legado do arquivo; conteúdo = catálogo de agentes.

## Workflow engine

Ver [`workflow-engine.md`](workflow-engine.md)

## Criar novo agente

1. Copiar `agents/_template/`
2. Preencher `agent.definition.ts`, `workflow.ts`, steps
3. Implementar `learning/feedback-handler.ts`
4. Registrar no `AgentRegistryService`
5. Doc em `docs/agents/<id>/README.md`
6. Admin: habilitar no catálogo + política de modelo

## Linguagem UI

- Cada agente tem **label operacional** (ex.: "Criar texto", "Planejar campanha")
- Evitar expor IDs técnicos (`strategist`, `LLM`, `agente`)
- Evitar termo **"peça"** — usar linguagem do que o agente entrega (texto, imagem, plano, post)
