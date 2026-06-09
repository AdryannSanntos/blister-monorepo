# Épico: Cérebro da Marca

## Objetivo

Persistir identidade e contexto permanente da empresa — base para RAG e todos os agentes.

## Campos MVP

| Campo | Obrigatório onboarding | Uso |
|-------|------------------------|-----|
| Logo | Sim | Designer, RAG |
| Tom de voz | Sim | Copywriter, RAG |
| Nome do negócio | Sim (signup ou onboarding) | UI, prompts |
| Paleta de cores | Opcional (inferir do logo Fase 2) | Designer |
| Tipografia | Opcional | Designer |
| Nicho / descrição | Opcional | RAG, Strategist |

## Regras

- Máx. 2–3 campos no onboarding inicial (logo + tom)
- Atualização dispara reindex RAG
- Indexado como `RagSourceType.BRAND_BRAIN`

## API (prevista)

- `GET/PATCH /api/empresa/marca` — `@RequirePermission('marca.read/update')`
- Upload logo via presigned URL

## UI

- `/dashboard/marca` ou seção em configurações
- Preview de como agentes usam o tom

## Entidades

`MarcaProfile` ← empresaId, logoKey, tomDeVoz, paleta JSON, tipografia, nicho, updatedAt
