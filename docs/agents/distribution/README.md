# Agente: Distribuir

**ID:** `distribution`  
**Tier:** Marketplace (fase posterior)  
**SDK:** `packages/agent-sdk/src/agents/distribution/`  
**UI label:** Distribuir  
**Rota:** `/dashboard/agents/distribution`

## Responsabilidade

Variantes por canal (título, descrição, hashtags por plataforma) — **não** publicação direct (Fase 3 produto).

## Status

Documentado para Plano 3+. Não bloqueia MVP OS.

## Workflow sugerido (futuro)

1. `retrieve_context`
2. `adapt_for_channels` (LLM)
3. `validate_output`

## Output schema

```typescript
{
  variants: {
    channel: "youtube" | "instagram" | "tiktok" | "linkedin";
    title: string;
    description: string;
    tags?: string[];
  }[];
}
```
