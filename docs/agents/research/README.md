# Agente: Pesquisar

**ID:** `research`  
**Tier:** Default (signup)  
**SDK:** `packages/agent-sdk/src/agents/research/`  
**UI label:** Pesquisar  
**Rota:** `/dashboard/agents/research`

## Responsabilidade

Briefing, tendências e referências para roteiro/conteúdo — grounded no contexto do workspace (Settings + Files extract).

## Workflow sugerido

1. `retrieve_context` — settings + files + learning boost
2. `research_brief` (LLM) — síntese + fontes citadas
3. `validate_output`
4. `format_output`

## Output schema

```typescript
{
  summary: string;
  keyPoints: string[];
  references: { title: string; source?: string }[];
  suggestedAngles: string[];
}
```

## Learning

- Aprende profundidade preferida (executivo vs detalhado)
- Aprende tópicos aprovados/rejeitados

## UI

Superfície genérica `AgentPage` no reference — input briefing + entregas listadas.
