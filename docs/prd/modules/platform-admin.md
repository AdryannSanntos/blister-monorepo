# Épico: Admin da Plataforma

> **Atualizado:** 2026-06-09 — "Pipelines" = catálogo de agentes, não ordem de execução.

## Objetivo

Configurar 100% dos parâmetros operacionais sem deploy.

## Áreas

### Créditos
- Free tier amount (default US$ 20)
- Moeda, markup global
- Ajuste manual de saldo por empresa

### AI Catalog
- Providers: OpenAI, Anthropic, OpenRouter, Gemini
- Credenciais (encrypted)
- Models: pricing input/output, capabilities

### Políticas por agente
- Modelo default por `agentId`
- Markup multiplier por agente
- Custo mínimo por execução

### Catálogo de agentes (ex-Pipelines)
- Habilitar/desabilitar agente
- Ordem de exibição na UI/sidebar — **não** ordem de execução automática

### RAG
- Embedding model, chunk size, top-K
- Rerank on/off, caption model
- Reindex manual por empresa

## Perfis

- `platform_owner` — full config
- `platform_admin` — operacional (sem delete owner)

## UI

- `/workspaces/admin` — platform admin (abas: AI catalog, RAG, créditos, …)
