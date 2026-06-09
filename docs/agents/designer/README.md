# Agente: Designer

**ID:** `designer`  
**Pasta:** `apps/api/src/agents/designer/`

## Responsabilidade

Layout HTML + export PNG 1080×1080 via **Satori**, usando paleta/logo da marca e imagens da campanha.

## Workflow

1. `retrieve_context` (inclui refs de imagem)
2. `resolve_assets` (storageKey das imagens)
3. `generate_layout` (HTML/Tailwind)
4. `validate_html`
5. `render_png` (Satori)
6. `format_output`

## Output schema

```typescript
{ pngKey: string; width: 1080; height: 1080 }
```

## Imagens

- Usa fotos da campanha no layout quando objetivo exige
- RAG fornece captions + IDs; passo resolve URLs assinadas

## Learning

- Layouts aprovados como referência positiva
- Elementos visuais rejeitados (cores, densidade de texto)
