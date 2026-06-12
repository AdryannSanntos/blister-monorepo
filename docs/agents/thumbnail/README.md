# Agente: Criar thumbnail

**ID:** `thumbnail`  
**Tier:** Marketplace  
**SDK:** `packages/agent-sdk/src/agents/thumbnail/`  
**UI label:** Criar thumbnail  
**Rota:** `/dashboard/agents/thumbnail`

## Responsabilidade

Capas e frames de destaque — complementa Post Styles estáticos; substitui parte do legado `designer`.

## Workflow sugerido

1. `retrieve_context` — paleta settings + packs biblioteca
2. `generate_thumbnail` (LLM + image gen)
3. `validate_output`

## Output schema

```typescript
{
  thumbnails: {
    url: string;
    aspectRatio: string;
    variantLabel?: string;
  }[];
}
```

## Learning

- Layouts e cores aprovados
