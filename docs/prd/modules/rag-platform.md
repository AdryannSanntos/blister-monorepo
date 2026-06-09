# Épico: Plataforma RAG

> **Atualizado:** 2026-06-09

## Objetivo

Retrieval robusto para **agentes isolados** — contexto de marca, campanha e learning por `agentId`.

## Pipeline

1. **Estruturado** — Cérebro + campanha baseline
2. **Vetorial** — pgvector top-K por `companyId` (+ boost `campaignId`)
3. **Rerank** — boost `AGENT_LEARNING` para `agentId` da run
4. **Context pack** — truncamento + citações

## Fontes indexáveis

| sourceType | Conteúdo |
|------------|----------|
| BRAND_BRAIN | Tom, nicho, regras |
| CAMPAIGN | Objetivo, contexto |
| CAMPAIGN_FILE | Texto extraído, image caption |
| AGENT_LEARNING | Feedback aprovado/editado **por agente** |

`APPROVED_PIECE` no schema = legado; novos fluxos usam `AGENT_LEARNING`.

## Indexação (eventos)

- Marca atualizada
- Campanha/arquivo changed
- Output de agente aprovado/editado (por `agentId`)
- Admin reindex manual
- Worker: **Trigger.dev** (`RagIndexJob`)

## Admin config

- Embedding model, chunk size, top-K, rerank on/off, caption model

## Entidades

`RagDocument`, `RagChunk`, `RagEmbedding`, `RagIndexJob`

## Integração agentes

Step `retrieve_context` em cada agente — ver [`docs/project/rag-architecture.md`](../../project/rag-architecture.md)

Contexto entre agentes via RAG — **não** output encadeado.
