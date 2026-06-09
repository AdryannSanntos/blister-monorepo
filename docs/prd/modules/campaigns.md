# Épico: Campanhas

> **Atualizado:** 2026-06-09 — campanha = **workspace**; agentes rodam isolados dentro dela.

## Objetivo

Container de contexto (objetivo, texto, arquivos, **runs de agentes**) para projetos estruturados de marketing.

## Campos

| Campo | Create | Edit |
|-------|--------|------|
| Nome | Obrigatório | Sim |
| Objetivo | Obrigatório | Sim |
| Contexto | — | Sim |
| Arquivos | — | Upload/delete |

## Tipos de arquivo

- Imagens: png, jpg, webp
- Texto: txt, md
- PDF: application/pdf

## Fluxos

1. **Criar:** nome + objetivo → workspace
2. **Enriquecer:** contexto + arquivos (indexados no RAG)
3. **Executar agentes:** usuário escolhe qual agente rodar — `POST /api/agents/:agentId/run` com `campaignId`
4. **Revisar:** na superfície de cada agente (approve/reject/edit da run)

**Não** dispara pipeline automático.

## Agentes na campanha

| Agente | Uso típico |
|--------|------------|
| Strategist | Objetivo + arquivos via RAG |
| Copywriter | Contexto + runs de estratégia aprovadas |
| Designer | Marca + assets + briefing da campanha |

Contexto compartilhado via **RAG** e lista de `AgentRun` na campanha — não output encadeado.

## API

- `CRUD /api/campaigns` (paths em inglês no código: `company`, `campaigns`)
- Upload arquivos com presigned URL
- `GET /api/campaigns/:id/agent-runs` — histórico de runs na campanha
- `POST /api/agents/:agentId/run` com `{ campaignId }`

## UI

- `/dashboard/campanhas` — listagem
- `/dashboard/campanhas/[id]` — workspace com abas por função (estratégia, texto, visual, …)
- Cada aba dispara e revisa **seu** agente

## Entidades

`Campaign`, `CampaignFile`, `AgentRun` (com `campaignId`).  
`ContentPiece` — legado; não usar como hub em novos fluxos.
