# Blister Docs

Documentação viva do **Blister** — marketing com IA para MEIs e pequenos negócios.

## Fonte de verdade (ordem)

1. [`docs/prd/blister-master-prd.md`](prd/blister-master-prd.md) — PRD mestre
2. [`CLAUDE.md`](../CLAUDE.md) — regras operacionais
3. [`docs/decisions/2026-06-09-agents-isolated-architecture.md`](decisions/2026-06-09-agents-isolated-architecture.md)
4. [`docs/decisions/2026-06-08-product-pivot-ai-marketing.md`](decisions/2026-06-08-product-pivot-ai-marketing.md)
5. [`docs/project/`](project/) — arquitetura, fluxos, estado atual
6. [`docs/agents/`](agents/) — agentes e workflow engine

## Estrutura

```
docs/
├── project/     ← como o produto funciona
├── prd/         ← requisitos e épicos
├── agents/      ← documentação por agente
├── decisions/   ← decisões arquiteturais
├── archive/     ← LEGADO (Workana, TikTok) — não usar como verdade
├── design-system/
├── setup/
└── skills/
```

## Produto

Blister oferece **vários agentes** de marketing (estratégia, texto, visual, post completo, …) que rodam **isolados**, com campanha como workspace opcional. RAG + auto-melhoramento por agente.

Termos UI: **Campanha**, **Cérebro da Marca**, labels por agente, **Aprovar**. Evitar "peça" e jargão de IA.

## Regra geral

Se docs históricas divergirem do PRD ou código, prevalecem: **código implementado**, **CLAUDE.md**, **blister-master-prd.md**.

`docs/archive/` e `docs/superpowers/` (até migrar) = referência histórica apenas.
