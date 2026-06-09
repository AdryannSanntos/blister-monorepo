# Agente: Copywriter

**ID:** `copywriter`  
**Pasta:** `apps/api/src/agents/copywriter/`

## Responsabilidade

Legendas e hashtags alinhadas ao tom da marca (Cérebro + RAG + learning).

## Workflow

1. `analyze_intent`
2. `retrieve_context`
3. `check_context`
4. `clarification_form`
5. `generate_copy`
6. `validate_output`
7. `format_output`

## Output schema

```typescript
{ legenda: string; hashtags: string[] }
```

## Learning

- Preferência por tamanho de legenda (EDITED diff)
- Tom rejeitado (REJECTED + motivo)
- Hashtags que usuário remove repetidamente
