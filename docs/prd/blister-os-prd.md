# PRD — Blister OS (SO de Conteúdo Video-First)

> **Versão:** 1.0 · **Data:** 2026-06-12  
> **Status:** Fonte de verdade de produto (substitui `blister-master-prd.md`)  
> **Referência visual:** [`blister-os-reference.html`](../../blister-os-reference.html)  
> **Decisões:** [`docs/decisions/2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)

---

## A — Contexto

### Problema

Creators, mentores e agências produzem vídeo constantemente — lives, podcasts, aulas, depoimentos — mas perdem horas em edição, cortes, roteiros e planejamento. Ferramentas genéricas não guardam contexto de marca nem operam como um **sistema operacional de conteúdo**.

### Público-alvo

- Creators e infoprodutores (YouTube, Instagram, TikTok)
- Mentores e coaches com conteúdo recorrente
- Agências e estúdios enxutos que editam em volume
- Pequenas marcas com operação video-first (não MEI/post estático como foco)

### Proposta de valor (1 frase)

**Um SO de conteúdo video-first** — pesquisa, edita, corta e planeja com a identidade do workspace aplicada, sem pipeline oculto nem módulo separado de “marca”.

### Moat

1. **Contexto distribuído** — Configurações + Arquivos (extract) + integrações → RAG
2. **Agentes isolados** — cada run independente; usuário escolhe o que rodar
3. **Marketplace** — Edit Styles, templates e agentes extras resgatáveis com créditos
4. **Auto-melhoramento** — feedback por run indexado no RAG por agente

---

## B — Modelo de usuário e workspace

### Espaço Pessoal

- Todo usuário tem um **Espaço Pessoal** ao signup
- Sem RBAC interno — o dono opera sozinho
- Créditos, biblioteca e projetos pessoais vivem aqui
- Pode convidar pessoas para **Empresas** (workspaces compartilhados)

### Empresas (workspaces)

- Container colaborativo com **5 roles** fixas:

| Role | Foco |
|------|------|
| `owner` | Tudo + billing + exclusão |
| `admin` | Configurações, equipe, créditos (sem deletar workspace) |
| `creator` | Rodar agentes, criar projetos, upload |
| `reviewer` | Revisar outputs, aprovar/negar/editar runs |
| `viewer` | Leitura — projetos, biblioteca, histórico |

- 1 usuário pode pertencer a várias empresas
- Context switcher na shell (Espaço Pessoal ↔ Empresa X)
- Permissões via `packages/authz` — ver [`docs/project/authorization.md`](../project/authorization.md)

### O que **não** existe

- Módulo **Cérebro da Marca** (`/dashboard/brand`) — **deprecado**
- Pipeline automático entre agentes
- Hub central de “peças” ou posts como entidade principal

---

## C — Contexto do workspace (substitui Brand Brain)

Contexto permanente distribuído em três superfícies:

| Superfície | Conteúdo | RAG |
|------------|----------|-----|
| **Configurações** | Identidade, voz, paleta, integrações, equipe, créditos | `WORKSPACE_SETTINGS` |
| **Arquivos** | Vídeos, PDFs, docs — com **extract** de texto/transcrição | `FILE_EXTRACT` |
| **Integrações** | YouTube, Drive, Notion (fases posteriores) | Por conector |

Detalhe: [`docs/project/workspace-context.md`](../project/workspace-context.md) · [`docs/prd/modules/workspace-settings.md`](modules/workspace-settings.md) · [`docs/prd/modules/files.md`](modules/files.md)

---

## D — Agentes

### Princípio

- Cada agente = pasta plugável; **100% da lógica** em `packages/agent-sdk`
- `apps/api/src/agents/` = HTTP + adapters apenas
- Usuário dispara `POST /api/agents/:agentId/run` — **sem encadeamento**
- Output em `AgentRun.outputPayload`; revisão na superfície do agente

### Tier default (signup)

| ID | Label UI | Função |
|----|----------|--------|
| `research` | Pesquisar | Briefing, tendências, referências para roteiro |
| `cuts` | Gerar cortes | Lives/podcasts → cortes priorizados por retenção |
| `video_editor` | Editar vídeo | Upload + Edit Style da biblioteca → vídeo editado |

### Tier marketplace (resgate → Biblioteca)

| ID | Label UI | Função |
|----|----------|--------|
| `planning` | Planejar conteúdo | Calendário e sequência de conteúdos |
| `script` | Escrever roteiro | Roteiros e falas na voz do workspace |
| `thumbnail` | Criar thumbnail | Capas e frames de destaque |
| `distribution` | Distribuir | Variantes por canal (fase posterior) |

Marketplace também vende **Edit Styles**, Post Styles, packs, templates e assets — ver [`docs/marketplace/README.md`](../marketplace/README.md).

### Deprecados (MEI/post-first)

`strategist`, `copywriter`, `designer`, `post` — ver ADR 2026-06-12.

---

## E — Marketplace e Biblioteca

### Marketplace

- Catálogo de itens resgatáveis/compráveis com **créditos**
- Tipos: `edit-style`, `post-style`, `pack`, `template`, `asset`, `agent`
- Fluxo: Marketplace → Detalhe do item → Resgatar → aparece na **Biblioteca**

### Biblioteca

- Itens possuídos (`owned`) — Edit Styles, templates, agentes marketplace
- Usados pelos wizards (Editor de Vídeo, Cortes) e superfícies de agente
- Estado local no proto; API no Plano 3

---

## F — Arquivos

- **File browser** com pastas, breadcrumb, grid/list
- Upload de vídeo bruto, áudio, PDF, markdown, imagens
- **Extract** assíncrono: transcrição, OCR, caption → texto indexado no RAG
- Rota alvo: `/dashboard/files` (evolui de `/uploads` no reference)
- Detalhe: [`docs/prd/modules/files.md`](modules/files.md)

---

## G — Projetos (workspace)

- **Projeto** = workspace operacional (nome, status, arquivos ligados, runs de agentes)
- Não dispara pipeline — usuário escolhe qual agente rodar dentro do projeto
- Lista em `/dashboard/projects`
- Substitui “Campanha” como conceito central no OS (campanha legado permanece no schema até migração)

---

## H — Créditos

- Saldo por workspace (Espaço Pessoal ou Empresa)
- Free tier único configurável (admin) — ex.: US$ 20 equivalente
- Débito por step LLM e compras no Marketplace
- Badge no header; bloqueio claro sem saldo
- Detalhe legado: [`docs/prd/modules/credits.md`](modules/credits.md)

---

## I — RAG e learning

- Retrieval filtrado por `workspaceId` (companyId / personal space)
- Fontes: settings, file extract, integrações, feedback aprovado (`AGENT_LEARNING`)
- Sem cross-tenant
- Feedback handler **obrigatório** em todo agente (`packages/agent-sdk`)

---

## J — UI e linguagem

### Termos permitidos (PT-BR, i18n)

| Superfície | Termo |
|------------|-------|
| Home | Início |
| Estúdio | Editor de Vídeo, Gerador de Cortes, Pesquisar |
| Acervo | Marketplace, Biblioteca, Projetos, Arquivos |
| Config | Configurações |
| Ações | Resgatar, Aprovar, Revisar, Enviar vídeo |

### Evitar na UI

- "agente", "prompt", "LLM", "peça", "Cérebro da Marca"

### Design

- Espelhar [`blister-os-reference.html`](../../blister-os-reference.html)
- Tokens: Satoshi, Poppins, primary-600, dark mode
- Inventário: [`docs/design-system/blister-os-reference.md`](../design-system/blister-os-reference.md)

---

## K — Rotas (mapa reference → Next.js)

| Reference `#/…` | Rota Next.js |
|-----------------|--------------|
| `home` | `/dashboard` |
| `editor` | `/dashboard/agents/video-editor` |
| `cortes` | `/dashboard/agents/cuts` |
| `agent/{id}` | `/dashboard/agents/{agentId}` |
| `marketplace` | `/dashboard/marketplace` |
| `item/{id}` | `/dashboard/marketplace/{itemId}` |
| `library` | `/dashboard/library` |
| `projects` | `/dashboard/projects` |
| `uploads` → files | `/dashboard/files` |
| `settings` | `/dashboard/settings` |

---

## L — Ordem de implementação

Ver [`docs/plans/blister-os/`](../plans/blister-os/README.md):

1. **Plano 1** — Docs + alinhamento (este PRD) ✅
2. **Plano 2** — Frontend offline (fixtures, zero API)
3. **Plano 3** — Backend + SDK + integração real

---

## M — Critérios de aceite MVP (Blister OS)

- [ ] Usuário navega todas as rotas do mapa com dados fake funcionais
- [ ] Resgata item no Marketplace → Biblioteca atualiza
- [ ] Wizards Editor + Cortes completam fluxo proto
- [ ] Settings substitui Brand Brain (contexto editável em memória)
- [ ] File browser com pastas e upload simulado
- [ ] 3 agentes default + marketplace agents documentados e registráveis
- [ ] Zero copy "Cérebro da Marca" fora de nota histórica em Settings
- [ ] Plano 3: mocks trocados por API real

---

## N — Referências

- ADR pivot: [`2026-06-12-blister-os-pivot.md`](../decisions/2026-06-12-blister-os-pivot.md)
- Agentes isolados (mantido): [`2026-06-09-agents-isolated-architecture.md`](../decisions/2026-06-09-agents-isolated-architecture.md)
- PRD legado: [`blister-master-prd.md`](blister-master-prd.md) — **deprecated**
