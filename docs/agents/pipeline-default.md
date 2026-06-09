# Catálogo de Agentes (sem pipeline automático)

> **Atualizado:** 2026-06-09  
> **Decisão:** [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)

Não existe pipeline que executa agentes em sequência. `PipelineAgentConfig` no admin é **catálogo** (habilitado/desabilitado + ordem de exibição na UI), não ordem de execução.

---

## Agentes MVP (exemplos)

| agentId | Função | Output típico |
|---------|--------|---------------|
| `strategist` | Planejamento | Plano, ângulos, sugestões de calendário |
| `copywriter` | Texto | Legendas, hashtags, variações |
| `designer` | Visual | PNG 1080×1080, HTML snapshot |
| `post` (futuro) | Post completo | Imagem + legenda + hashtags (um agente entre vários) |

Futuros: email, stories, adaptação de conteúdo, etc.

---

## Execução

```typescript
// Usuário dispara UM agente por vez
POST /api/agents/:agentId/run
{
  userInput: string;
  campaignId?: string;  // workspace opcional
}
```

- Retorna `{ runId }` → `AgentRun` com `outputPayload` específico do agente
- Créditos debitados por steps `generate_*` dentro do workflow **desse** agente
- Revisão na run: approve / reject / edit output

---

## Contexto compartilhado (sem encadear)

Agentes na mesma campanha leem:

1. **RAG** — marca, campanha, arquivos, `AGENT_LEARNING` por `agentId`
2. **Runs aprovadas** — outras `AgentRun` COMPLETED+APPROVED na campanha

Não há passagem automática de output N → input N+1.

---

## Admin

- Habilitar/desabilitar agente no catálogo
- Modelo + markup por `agentId` (`AgentModelPolicy`)
- Ordem na UI sidebar — não ordem de execução
