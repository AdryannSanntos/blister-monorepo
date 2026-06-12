# Agente: Escrever roteiro

**ID:** `script`  
**Tier:** Marketplace  
**SDK:** `packages/agent-sdk/src/agents/script/`  
**UI label:** Escrever roteiro  
**Rota:** `/dashboard/agents/script`

## Responsabilidade

Roteiros, falas e CTAs na voz do workspace — substitui legado `copywriter`.

## Workflow sugerido

1. `retrieve_context`
2. `generate_script` (LLM)
3. `validate_output`

## Output schema

```typescript
{
  scripts: {
    title: string;
    durationSec?: number;
    hook: string;
    body: string;
    cta?: string;
    captions?: string;
  }[];
}
```

## Learning

- Comprimento e tom preferidos
- Hooks aprovados
