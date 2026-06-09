# Decisão de Produto — Pivot para Marketing com IA

> **Data:** 2026-06-08  
> **Status:** Aprovado  
> **Substitui:** visão de marketplace TikTok Shop como produto principal

---

## Resumo

A Blister pivota de **marketplace de live commerce TikTok Shop** para **ferramenta de marketing com IA** voltada a MEIs, pequenos negócios e profissionais autônomos. O moat competitivo é a **Memória da Marca** (contexto centralizado) + **RAG** + **auto-melhoramento por agente**, não o modelo de linguagem em si.

---

## Decisões travadas

| # | Tema | Decisão |
|---|------|---------|
| 1 | Direção de produto | Marketing com IA para MEIs/pequenos negócios — não TikTok Shop marketplace |
| 2 | Nome | **Blister** mantido |
| 3 | Tagline (provisória) | *Seu marketing pronto em 1 frase* |
| 4 | Campanhas | **Opcionais** — enriquecem contexto; agentes rodam com ou sem campanha |
| 5 | Aprovação | Aprovar / Negar / Editar / Pedir melhoria / Regenerar — **sem swipe Tinder** |
| 6 | Agentes MVP | Vários agentes plugáveis (estratégia, texto, visual, post, …) — **isolados**, sem pipeline automático. Refine: [`2026-06-09-agents-isolated-architecture.md`](2026-06-09-agents-isolated-architecture.md) |
| 7 | Workflow | Multi-step por agente; pause/resume/fail na mesma `AgentRun` |
| 8 | Créditos | Por empresa; **US$ 20 free tier único**; bloqueio sem saldo; recarga = Fase 2 |
| 9 | Admin | 100% configurável: créditos, IA, modelos, markup, **catálogo de agentes** |
| 10 | RAG | Plataforma dedicada; pgvector; estruturado → vetorial → rerank; inclui learning |
| 11 | Auto-melhoramento | **Universal** em todos os agentes; feedback → RAG + AgentMemory |
| 12 | HTML→PNG | **Satori** no MVP (Puppeteer se layouts exigirem fidelidade CSS — Fase 2) |
| 13 | Multi-tenant MVP | **1 negócio por usuário** (equipe = Fase 3) |
| 14 | Cérebro da Marca MVP | Logo + tom de voz (mín. 2 campos onboarding); paleta/cores inferidas ou opcionais depois |
| 15 | Tipos de conteúdo MVP | Post Instagram quadrado (1080×1080); Stories/carrossel = Fase 2 |
| 16 | Linguagem UI | Zero jargão de IA — usar **"Criar post"**, **"Nova peça"**, **"Campanha"** |
| 17 | Identidade visual | Manter tokens Blister (roxo/rosa/laranja); dark mode disponível |
| 18 | Código legado IA | **Reimplementar limpo** — specs históricas em `docs/archive/` como referência |
| 19 | Recuperação git | Não restaurar módulos deletados cegamente; adaptar ao novo produto |

---

## O que fica fora do escopo imediato

- Marketplace live commerce TikTok Shop
- Recarga self-service de créditos (Fase 2)
- Publicação direct post Instagram/TikTok (Fase 3)
- Fine-tuning de modelos (MVP usa RAG + memória estruturada)
- Equipes multi-usuário por negócio (Fase 3)

---

## Fontes de verdade após este pivô

1. [`docs/prd/blister-master-prd.md`](../prd/blister-master-prd.md)
2. [`CLAUDE.md`](../../CLAUDE.md)
3. [`docs/project/`](../project/)
4. Este documento

Documentação em `docs/archive/` e `docs/superpowers/` é **histórico** — não contrato vigente.
