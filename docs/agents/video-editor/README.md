# Agente: Editor de Vídeo

**ID:** `video_editor`  
**Tier:** Default (signup)  
**SDK:** `packages/agent-sdk/src/agents/video_editor/`  
**UI label:** Editor de Vídeo  
**Rota:** `/dashboard/agents/video-editor` · Reference: `#/editor`

## Responsabilidade

Upload de vídeo bruto + Edit Style da Biblioteca → vídeo editado (ritmo, legendas, transições conforme preset).

## Workflow sugerido

1. `retrieve_context`
2. `ingest_video` — arquivo + metadados
3. `apply_edit_style` — preset owned
4. `generate_edit` (LLM + render pipeline)
5. `validate_output`
6. `upload_output` — S3

## Output schema

```typescript
{
  outputVideoUrl: string;
  durationSec: number;
  editStyleId: string;
  chapters?: { label: string; atSec: number }[];
}
```

## Learning

- Aprende estilos aprovados vs rejeitados
- Aprende preferências de legenda e ritmo

## UI

Wizard dedicado `EditorPage` no reference — vídeo → estilo → preview → export.
