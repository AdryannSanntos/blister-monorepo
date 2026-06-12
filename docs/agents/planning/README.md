# Agente: Planejar conteúdo

**ID:** `planning`  
**Tier:** Marketplace (resgate → Biblioteca)  
**SDK:** `packages/agent-sdk/src/agents/planning/`  
**UI label:** Planejar conteúdo  
**Rota:** `/dashboard/agents/planning`

## Responsabilidade

Calendário e sequência de conteúdos — substitui o legado `strategist` no OS.

## Workflow sugerido

1. `retrieve_context`
2. `plan_calendar` (LLM)
3. `validate_output`

## Output schema

```typescript
{
  period: { start: string; end: string };
  items: { date: string; title: string; format: string; objective: string }[];
  thesis?: string;
}
```

## Learning

- Frequência e formatos preferidos
- Ângulos aprovados/rejeitados
