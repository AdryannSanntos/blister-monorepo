# Arquitetura RAG — Blister

> **Atualizado:** 2026-06-09

## Visão

Plataforma em `apps/api/src/rag/` — ingestion, indexing, retrieval desacoplados dos agentes.

## Pipeline de retrieval

```
Query (step + userInput + agentId)
  → StructuredRetrieval (marca + campanha)
  → VectorRetrieval (pgvector, top-K, companyId filter)
  → Reranker (boost AGENT_LEARNING por agentId)
  → ContextPackService → RagContextPack
```

## Fontes

Ver [`../prd/modules/rag-platform.md`](../prd/modules/rag-platform.md)

| sourceType | Conteúdo |
|------------|----------|
| BRAND_BRAIN | Cérebro da Marca |
| CAMPAIGN | Objetivo, contexto |
| CAMPAIGN_FILE | Texto extraído / caption |
| AGENT_LEARNING | Feedback aprovado/editado **por agentId** |

`APPROVED_PIECE` no schema = legado; novos fluxos indexam learning via `AGENT_LEARNING`.

## Contexto entre agentes

Agentes na mesma campanha **não** passam output encadeado. Compartilham contexto via RAG + runs aprovadas indexadas.

## Segurança

- Filtro obrigatório `companyId`
- `campaignId` boost quando presente
- Zero cross-tenant

## Stack

- PostgreSQL + pgvector
- Prisma + `$queryRaw` para vectors
- Embedding model via admin
- **Trigger.dev** para `RagIndexJob`

## Referência

- [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)
