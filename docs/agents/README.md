# Agentes — Blister OS

> **Decisão vigente:** agentes **isolados** + SDK monolith. Ver [`2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md) e [`2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md).

---

## MVP de produto (4 agentes)

Especificação detalhada do pacote MVP (estado atual vs alvo, workflows, schemas, UI):

→ [`mvp/README.md`](mvp/README.md)

| Agente | ID | Doc |
|--------|-----|-----|
| Carrossel Automático | `carousel` | [`mvp/carousel/README.md`](mvp/carousel/README.md) |
| Roteiro para Reels | `reels_script` | [`mvp/reels-script/README.md`](mvp/reels-script/README.md) |
| Corte para seus vídeos | `cuts` | [`mvp/cuts/README.md`](mvp/cuts/README.md) |
| Edição de vídeo | `video_editor` | [`mvp/video-editor/README.md`](mvp/video-editor/README.md) |

---

## Princípio

- **100% da lógica** em `packages/agent-sdk/src/agents/<agentId>/`
- `apps/api/src/agents/` = HTTP + adapters (Prisma, RAG, credits)
- Cada run = `POST /api/agents/:agentId/run` — **sem pipeline**
- Output: `AgentRun.outputPayload` · Revisão na superfície do agente
- `learning/feedback-handler.ts` **obrigatório**

---

## Tier default (signup)

| ID | Label UI | Doc |
|----|----------|-----|
| `research` | Pesquisar | [`research/README.md`](research/README.md) |
| `cuts` | Gerar cortes | [`cuts/README.md`](cuts/README.md) |
| `video_editor` | Editar vídeo | [`video-editor/README.md`](video-editor/README.md) |

---

## Tier marketplace (resgate → Biblioteca)

| ID | Label UI | Doc |
|----|----------|-----|
| `planning` | Planejar conteúdo | [`planning/README.md`](planning/README.md) |
| `script` | Escrever roteiro | [`script/README.md`](script/README.md) |
| `thumbnail` | Criar thumbnail | [`thumbnail/README.md`](thumbnail/README.md) |
| `distribution` | Distribuir | [`distribution/README.md`](distribution/README.md) — fase posterior |

Itens tipo `agent` no Marketplace desbloqueiam estes IDs.

---

## Removidos (legado MEI/post-first)

Os agentes `strategist`, `copywriter`, `designer` e `post` foram **removidos do
código** (definições, schemas, prompts, learning, seeds e docs). Substitutos no
catálogo vigente:

| ID removido | Substituto |
|-------------|------------|
| `strategist` | `planning` |
| `copywriter` | `script` |
| `designer` | `thumbnail` + Edit/Post Styles |
| `post` | Combinação manual de ferramentas |

Não reintroduzir esses fluxos.

---

## Workflow engine + SDK

- Documentação completa do SDK: [`agent-sdk.md`](agent-sdk.md)
- Kernel de workflow: [`workflow-engine.md`](workflow-engine.md)

Pacote: `@company-os/agent-sdk`. Nest adapters: `apps/api/src/agents/adapters/`.

---

## Criar novo agente

Passo a passo completo em [`agent-sdk.md`](agent-sdk.md) §13. Resumo:

1. Pasta `packages/agent-sdk/src/agents/<agentId>/`
2. `agent.ts` — `AgentBuilder` + steps SDK
3. `schemas/` — Zod output + review
4. `learning/feedback-handler.ts` (**obrigatório**)
5. Registrar na API: loader, step registry, `agent-catalog.ts`, seed
6. Doc em `docs/agents/<agentId>/README.md`
7. Se marketplace: item + preview no catálogo admin

---

## Linguagem UI

Labels operacionais por superfície — nunca expor IDs técnicos nem "agente", "LLM", "peça".
