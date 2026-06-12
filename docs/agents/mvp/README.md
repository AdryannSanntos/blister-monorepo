# Agentes MVP — Blister OS

> **Data:** 2026-06-12  
> **Escopo:** quatro agentes que compõem o MVP de produto video-first + conteúdo estático para redes.  
> **Fontes:** [`blister-os-prd.md`](../../prd/blister-os-prd.md) · [`2026-06-12-blister-os-pivot.md`](../../decisions/2026-06-12-blister-os-pivot.md) · [`agent-sdk.md`](../agent-sdk.md)

---

## Índice

| Agente MVP | ID canônico | Doc |
|------------|-------------|-----|
| Carrossel Automático | `carousel` | [`carousel/README.md`](carousel/README.md) |
| Roteiro para Reels | `reels_script` | [`reels-script/README.md`](reels-script/README.md) |
| Corte para seus vídeos | `cuts` | [`cuts/README.md`](cuts/README.md) |
| Edição de vídeo | `video_editor` | [`video-editor/README.md`](video-editor/README.md) |

---

## Como o projeto funciona hoje

### Arquitetura vigente

```
Usuário → apps/web (Plano 2: fixtures + Zustand)
              ↓ (Plano 3: API real)
         POST /api/agents/:agentId/run
              ↓
         apps/api — adapters HTTP (Prisma, RAG, créditos, S3)
              ↓
         packages/agent-sdk — 100% da lógica de workflow
              ↓
         AgentRun.outputPayload + SSE de blocos
```

**Regras invioláveis** (ver `CLAUDE.md`):

- Cada agente é **isolado** — sem pipeline automático entre agentes.
- Output vive em `AgentRun.outputPayload` (Zod por agente).
- Revisão (aprovar / negar / editar) **dentro da superfície do agente**.
- Contexto de marca vem de **Configurações + Arquivos (extract)** — não existe módulo Cérebro da Marca.
- `learning/feedback-handler.ts` é **obrigatório** em todo agente no SDK.
- Plano 2: **zero integração** com API de produto — mocks funcionais apenas.

### Estado por camada (jun/2026)

| Camada | Estado | Detalhe |
|--------|--------|---------|
| **Docs / PRD** | ✅ Alinhado OS | Catálogo canônico: `research`, `cuts`, `video_editor` (default) + marketplace (`planning`, `script`, `thumbnail`) |
| **Frontend (Plano 2)** | 🟡 Em progresso | Wizards de `cuts` e `video_editor` com fixtures; `research` e agentes marketplace com brief genérico; **sem** Carrossel nem Roteiro Reels dedicados |
| **Agent SDK** | 🟡 Kernel pronto | `AgentBuilder`, `executeRun`, steps, learning registry — **pastas `agents/*` ainda vazias** |
| **API agents** | 🟡 Adapters existem | `buildRegisteredAgents()` retorna `[]` — catálogo OS ainda não registrado |
| **RAG + Files** | 🟡 Parcial | Infra legada; `WorkspaceSettings` + extract no Plano 3 |
| **Marketplace** | 🟡 Proto | Post Styles (`post-style`) e Edit Styles (`edit-style`) em fixtures — Carrossel usa Post Style, não agente |

### Catálogo documentado vs MVP solicitado

| Nome MVP | ID proposto | No catálogo OS atual | Gap |
|----------|-------------|----------------------|-----|
| Carrossel Automático | `carousel` | ❌ (carrossel era Fase 2 / `post-style` only) | **Novo agente** — ver doc |
| Roteiro para Reels | `reels_script` | Parcial (`script` genérico, marketplace) | **Especialização** de roteiro curto |
| Corte para seus vídeos | `cuts` | ✅ default | Label UI pode ser "Cortes" em vez de "Gerador de Cortes" |
| Edição de vídeo | `video_editor` | ✅ default | Wizard proto existe; sidebar marca "em breve" |

---

## Como o projeto DEVE funcionar (MVP)

### Princípios compartilhados por todos os agentes MVP

1. **Entrada mínima** — no máximo 2–3 campos para iniciar (tema, arquivo ou estilo).
2. **Um run = uma entrega** — usuário dispara manualmente; nada encadeia sozinho.
3. **Contexto do workspace** — step `retrieve_context` injeta Settings + Files extract + `AGENT_LEARNING` do mesmo `agentId`.
4. **Biblioteca** — estilos possuídos (`owned`) alimentam wizards:
   - `edit-style` → Cortes e Editor de Vídeo
   - `post-style` → Carrossel Automático
5. **Créditos** — débito por step `generate_*`; bloqueio claro sem saldo.
6. **Revisão** — após `COMPLETED`, usuário aprova/nega/edita; feedback indexado no RAG.
7. **Linguagem UI** — verbos operacionais; nunca "agente", "prompt", "LLM", "peça".

### Tier sugerido para o MVP

| ID | Tier MVP | Justificativa |
|----|----------|---------------|
| `carousel` | **default** | Entrega estática de alto valor no signup; substitui narrativa MEI |
| `reels_script` | **default** | Par com vídeo — roteiro curto é core creator |
| `cuts` | **default** | Já previsto no PRD |
| `video_editor` | **default** | Já previsto no PRD |

> O PRD OS original coloca `script` no marketplace e inclui `research` no default. Para este MVP, **`reels_script` entra no default** e `research` pode permanecer como agente complementar (fora deste pacote de quatro).

### Fluxo do usuário (macro)

```
Configurações (voz, nicho) + Arquivos (matéria-prima)
        │
        ▼
Escolhe agente MVP na sidebar (Estúdio / Conteúdo)
        │
        ▼
Preenche entrada mínima (+ estilo da Biblioteca se aplicável)
        │
        ▼
Run → steps no SDK → output estruturado
        │
        ▼
Revisão na mesma tela → aprovar → learning no RAG
        │
        ▼
Exportar / copiar / salvar em Arquivos › Gerados (Plano 3)
```

### Sidebar NAV alvo (MVP)

```
Estúdio
  ├── Edição de vídeo      → /dashboard/agents/video-editor
  ├── Cortes               → /dashboard/agents/cuts
  └── Carrossel automático → /dashboard/agents/carousel

Conteúdo
  └── Roteiro para Reels   → /dashboard/agents/reels-script
```

### Implementação (ordem sugerida)

| Fase | Entregável |
|------|------------|
| Plano 2 (UI) | Rotas + wizards + fixtures para os 4 agentes; atualizar `AGENTS_CATALOG` e nav |
| Plano 3.3 (SDK) | Pastas `packages/agent-sdk/src/agents/{carousel,reels_script,cuts,video_editor}/` |
| Plano 3.3 (API) | Registrar em `agent-catalog.ts`, seed AI catalog, permissões |
| Plano 3.7 | Trocar mocks por hooks API (`useAgentRun`, SSE) |

### Permissões

| Ação | Chave authz |
|------|-------------|
| Iniciar run | `generation.create` |
| Ver histórico | `generation.read` (ou equivalente por agente no Plano 3) |
| Revisar output | `generation.review` (migrar de `piece.*` legado) |

---

## Referências cruzadas

- Catálogo OS completo: [`docs/agents/README.md`](../README.md)
- SDK — criar agente: [`docs/agents/agent-sdk.md`](../agent-sdk.md) §13
- Workflow kernel: [`docs/agents/workflow-engine.md`](../workflow-engine.md)
- Marketplace / Post Styles: [`docs/marketplace/README.md`](../../marketplace/README.md)
- Contrato API: [`docs/plans/blister-os/03-backend.md`](../../plans/blister-os/03-backend.md)
