# Agente: Gerador de Cortes

**ID:** `cuts`  
**Tier:** Default (signup)  
**SDK:** `packages/agent-sdk/src/agents/cuts/`  
**UI label:** Gerador de Cortes  
**Rota:** `/dashboard/agents/cuts` · Reference: `#/cortes`

## Responsabilidade

Transformar vídeos longos (live, podcast, aula) em cortes curtos priorizados por potencial de retenção — com Edit Style da Biblioteca.

## Workflow sugerido

1. `retrieve_context`
2. `analyze_source` — transcrição / extract do arquivo fonte
3. `rank_segments` (LLM + heurísticas retenção)
4. `apply_edit_style` — preset da biblioteca
5. `render_cuts` — outputs por corte
6. `validate_output`

## Output schema

```typescript
{
  cuts: {
    id: string;
    title: string;
    startSec: number;
    endSec: number;
    retentionScore: number;
    previewUrl?: string;
  }[];
  sourceFileId: string;
  editStyleId?: string;
}
```

## Learning

- Aprende duração preferida de corte
- Aprende ganchos aprovados/rejeitados

## UI

Wizard dedicado `CortesPage` no reference — 3 passos: fonte → estilo → resultados.
