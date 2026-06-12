# PRD Mestre — Blister (Marketing com IA)

> ⚠️ **DEPRECATED — 2026-06-12**  
> Este PRD descreve o pivô **MEI/post-first** (imagem + legenda + Cérebro da Marca).  
> **Fonte de verdade atual:** [`blister-os-prd.md`](blister-os-prd.md) — Blister OS video-first.  
> ADR: [`docs/decisions/2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)

> **Versão:** 1.0 · **Data:** 2026-06-08  
> **Status:** Arquivado — referência histórica apenas

---

## A — Contexto

### Problema

Pequenos negócios precisam de marketing constante (posts, legendas, visuais) mas não têm tempo, equipe nem orçamento. Ferramentas genéricas (ChatGPT, Canva) exigem trabalho manual e não guardam a identidade da marca.

### Público-alvo

MEIs, microempresas, autônomos e pequenos negócios que usam Instagram/redes sociais para vender.

### Proposta de valor (1 frase)

**Marketing pronto em 1 frase** — identidade da marca aplicada, pacote completo (visual + texto), sem configurar IA.

### Referências

- Visão: [`docs/project/vision.md`](../project/vision.md)
- Decisões: [`docs/decisions/2026-06-08-product-pivot-ai-marketing.md`](../decisions/2026-06-08-product-pivot-ai-marketing.md)

---

## B — Produto

### Cérebro da Marca

Contexto permanente da empresa: logo, tom de voz, paleta, tipografia, nicho. Indexado no RAG. Onboarding mínimo: logo + tom de voz.

### Campanhas (opcional)

Container com nome, objetivo, contexto e arquivos (img/txt/md/pdf). Enriquece agentes quando presente. Criação: **nome + objetivo** (2 campos).

### Dois modos de geração

| Modo | Contexto |
|------|----------|
| Geração rápida | Cérebro da Marca + input + RAG + learning |
| Com campanha | + objetivo + arquivos + contexto da campanha |

### Agentes (heterogêneos, isolados)

Vários agentes plugáveis (estratégia, texto, visual, post completo, …). Cada um roda **sob demanda** — **sem pipeline automático**. Workflow multi-step **dentro** de cada agente (pasta + registry). Revisão na superfície de cada agente.

### RAG

Plataforma dedicada: estruturado → pgvector → rerank. Fontes: marca, campanha, arquivos, learning.

### Auto-melhoramento

Todo agente aprende com Aprovar/Negar/Editar/Pedir melhoria. Sinais indexados no RAG.

### Revisão (por agente)

Aprovar / Negar / Editar / Pedir melhoria / Regenerar — na **run do agente**, sem swipe. Cada ação alimenta learning (`AGENT_LEARNING`). Sem hub central de "peças".

### Créditos

US$ 20 free tier único por empresa. Execução bloqueada sem saldo. Recarga self-service = Fase 2.

### Admin configurável

Free tier, créditos, providers, modelos, política por agente, markup, **catálogo de agentes** — tudo via UI admin.

### Fora do MVP

Recarga self-service, publicação direct post, equipes, Stories/carrossel, fine-tuning de modelos.

---

## C — Perfis e permissões

| Perfil | Capacidades |
|--------|---------------|
| **NEGOCIO** | CRUD marca, campanhas, arquivos; gerar; aprovar; ver créditos |
| **ADMIN / platform_owner** | Config global; ajuste manual de créditos; catálogo IA |

Detalhes: [`docs/project/authorization.md`](../project/authorization.md)

---

## D — Jornadas

### Jornada A — Agente direto (ex.: criar texto / imagem / post)

1. Usuário escolhe o agente e descreve o que precisa (1 frase)
2. `POST /api/agents/:agentId/run` → pause se necessário → retoma mesma run
3. Revisar output **naquele agente** (aprovar/negar/editar)
4. Exportar quando aplicável (ex.: PNG no designer)

### Jornada B — Com campanha

1. Onboarding → Cérebro + US$ 20
2. Criar campanha (nome + objetivo)
3. Upload arquivos (opcional)
4. Rodar agentes **isolados** no workspace (estratégia, texto, visual…) → revisar cada um → exportar

Detalhes: [`docs/project/user-flows.md`](../project/user-flows.md)

---

## E — Requisitos por módulo

| Épico | Documento |
|-------|-----------|
| Cérebro da Marca | [`modules/brand-brain.md`](modules/brand-brain.md) |
| Campanhas | [`modules/campaigns.md`](modules/campaigns.md) |
| Orquestração + agentes | [`modules/agent-orchestration.md`](modules/agent-orchestration.md) |
| Geração de conteúdo | [`modules/content-generation.md`](modules/content-generation.md) |
| Revisão | [`modules/content-review.md`](modules/content-review.md) |
| Créditos | [`modules/credits.md`](modules/credits.md) |
| RAG | [`modules/rag-platform.md`](modules/rag-platform.md) |
| Auto-melhoramento | [`modules/agent-learning.md`](modules/agent-learning.md) |
| Admin plataforma | [`modules/platform-admin.md`](modules/platform-admin.md) |

---

## F — Requisitos não-funcionais

- Validação **Zod** em outputs de IA e DTOs
- Adapters isolados para LLMs (`ai-runtime/`)
- **AuditLog** em mutações críticas
- **CASL** em toda mutação; `userId` de `req.currentUser.id`
- RAG filtrado por `empresaId` — zero cross-tenant
- Animações e espaçamento conforme `CLAUDE.md`

---

## G — Métricas de sucesso

| Métrica | Meta MVP |
|---------|----------|
| TTFC | < 2 min pós-onboarding |
| Aprovação sem edição | > 40% |
| Retenção D7 | > 25% |
| Custo médio/geração | Dentro do free tier US$ 20 |

---

## H — Roadmap

| Fase | Entrega |
|------|---------|
| **0** | Docs, permissões base, schema fundação |
| **1 MVP** | Cérebro + Campanhas + RAG + Learning + 3 agentes + créditos + admin + revisão |
| **2** | Recarga créditos, calendário, histórico avançado |
| **3** | Equipe, publicação direct, billing |

Escopo detalhado: [`mvp-scope.md`](mvp-scope.md)
