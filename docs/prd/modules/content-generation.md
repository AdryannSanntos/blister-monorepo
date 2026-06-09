# Épico: Execução de Agentes (geração)

> **Atualizado:** 2026-06-09 — geração = rodar **um agente** por vez; sem peça central.

## Objetivo

Usuário dispara um agente e recebe output estruturado (`AgentRun.outputPayload`) — formato depende do agente (plano, texto, imagem, pacote post, etc.).

## Modos

| Modo | Entrada | campaignId |
|------|---------|------------|
| Direto (dashboard / atalho do agente) | `userInput` | opcional |
| Dentro da campanha | `userInput` + contexto da campanha | obrigatório no workspace |

## Output

Definido por `outputSchema` de cada agente — exemplos:

- **copywriter:** `{ captions[], hashtags[] }`
- **designer:** `{ imageStorageKey, htmlSnapshot? }`
- **strategist:** `{ pieces[], angles[] }`
- **post (futuro):** `{ imageStorageKey, caption, hashtags[] }`

Metadados na run: `agentRunId`, `creditCost`, `status`.

## Pré-condições

- Saldo de créditos > 0
- Cérebro da Marca mínimo (onboarding completo)
- Agente habilitado no catálogo admin

## Fluxo técnico

1. `CreditService.checkBalance`
2. `POST /api/agents/:agentId/run`
3. Trigger `agent-run-execute` → `WorkflowEngine`
4. `StepContext` + RAG pack
5. Persistir `outputPayload` em `AgentRun`
6. Revisão na run (approve/reject/edit) — ver [`content-review.md`](content-review.md)

## UI

- Superfície **por agente** (não hub central de "peças")
- Loading / SSE do step atual
- Preview do output conforme tipo do agente
- Botão com label do agente (ex.: "Criar texto", "Gerar imagem")

## Linguagem UI

- Evitar: "Gerar com IA", "Prompt", "Agente", "Peça"
- Preferir: verbos do que o usuário quer (planejar, escrever, criar imagem, criar post)
